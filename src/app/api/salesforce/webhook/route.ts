import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getMappingByCode, getMappingByName } from "@/lib/sf-phase-mapping";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// Salesforceからのフェーズ変更Webhookを受信
// POST /api/salesforce/webhook
//
// リクエストBody例:
// {
//   "storeName": "渋谷店",          ← WBSの店舗名と一致させる
//   "sfPhaseCode": "05",            ← フェーズコード
//   "sfPhaseName": "不動産契約",     ← フェーズ名（コードがない場合のフォールバック）
//   "sfRecordId": "001XXXXXXXXXXXX", ← Salesforceレコード ID（ログ用）
//   "phaseChangedAt": "2026-06-02"   ← フェーズ変更日（省略時は現在日時）
// }

interface WebhookPayload {
  storeName?: string;
  storeId?: string;
  sfPhaseCode?: string;
  sfPhaseName?: string;
  sfRecordId?: string;
  phaseChangedAt?: string;
  secret?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookPayload = await req.json();

    // --- 認証チェック ---
    const expectedSecret = process.env.SF_WEBHOOK_SECRET;
    if (expectedSecret && body.secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- フェーズマッピング取得 ---
    const mapping = body.sfPhaseCode
      ? getMappingByCode(body.sfPhaseCode)
      : body.sfPhaseName
        ? getMappingByName(body.sfPhaseName)
        : undefined;

    if (!mapping) {
      return NextResponse.json(
        { error: "Unknown phase", sfPhaseCode: body.sfPhaseCode, sfPhaseName: body.sfPhaseName },
        { status: 400 }
      );
    }

    // --- 店舗を特定 ---
    let storeId = body.storeId;
    let storeName = body.storeName;

    if (!storeId && storeName) {
      const storesSnap = await adminDb
        .collection("stores")
        .where("name", "==", storeName)
        .limit(1)
        .get();

      if (storesSnap.empty) {
        return NextResponse.json(
          { error: "Store not found", storeName },
          { status: 404 }
        );
      }
      storeId = storesSnap.docs[0].id;
    }

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId or storeName is required" },
        { status: 400 }
      );
    }

    const phaseChangedAt = body.phaseChangedAt
      ? new Date(body.phaseChangedAt)
      : new Date();

    // --- 出店停止の場合: 全タスクを一時停止フラグ ---
    if (mapping.wbsPhase === "__STOP__") {
      const tasksSnap = await adminDb
        .collection("tasks")
        .where("storeId", "==", storeId)
        .get();

      const batch = adminDb.batch();
      tasksSnap.docs.forEach((doc) => {
        if (doc.data().status !== "done") {
          batch.update(doc.ref, {
            status: "not_started",
            updatedAt: Timestamp.now(),
          });
        }
      });
      await batch.commit();

      // ログ記録
      await logWebhook(storeId, mapping, body, "stopped", tasksSnap.size);

      return NextResponse.json({
        success: true,
        action: "stopped",
        storeName,
        phase: mapping.sfPhaseName,
        tasksAffected: tasksSnap.size,
      });
    }

    // --- 基準日フェーズの場合: 基準日を更新し、全タスクの期限を再計算 ---
    if (mapping.isBaseDate) {
      // フェーズごとの基準日を更新
      const storeDoc = await adminDb.collection("stores").doc(storeId).get();
      const phaseDates = storeDoc.data()?.phaseDates || {};
      phaseDates[mapping.sfPhaseCode] = {
        date: phaseChangedAt.toISOString().split("T")[0],
        type: "manual",
        label: mapping.sfPhaseName,
      };
      await adminDb.collection("stores").doc(storeId).update({ phaseDates });

      // テンプレートの日数をもとに期限を再計算
      const tasksSnap = await adminDb
        .collection("tasks")
        .where("storeId", "==", storeId)
        .get();

      const batch = adminDb.batch();
      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        if (task.templateId && task.status !== "done") {
          const tplSnap = await adminDb
            .collection("taskTemplates")
            .doc(task.templateId)
            .get();
          if (tplSnap.exists) {
            const tpl = tplSnap.data()!;
            const newDeadline = new Date(phaseChangedAt);
            newDeadline.setDate(newDeadline.getDate() + (tpl.endDaysFromBase || 0));
            batch.update(taskDoc.ref, {
              deadline: Timestamp.fromDate(newDeadline),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }
      await batch.commit();
    }

    // --- autoタイプのフェーズ: 日付を自動記録 ---
    if (!mapping.isBaseDate) {
      const storeDoc2 = await adminDb.collection("stores").doc(storeId).get();
      const phaseDates2 = storeDoc2.data()?.phaseDates || {};
      if (!phaseDates2[mapping.sfPhaseCode]?.date) {
        phaseDates2[mapping.sfPhaseCode] = {
          date: phaseChangedAt.toISOString().split("T")[0],
          type: "auto",
          label: mapping.sfPhaseName,
        };
        await adminDb.collection("stores").doc(storeId).update({ phaseDates: phaseDates2 });
      }
    }

    // --- 該当フェーズのタスクを「進行中」に変更 ---
    const tasksSnap = await adminDb
      .collection("tasks")
      .where("storeId", "==", storeId)
      .where("phase", "==", mapping.wbsPhase)
      .get();

    const batch = adminDb.batch();
    let activatedCount = 0;
    tasksSnap.docs.forEach((doc) => {
      if (doc.data().status === "not_started") {
        batch.update(doc.ref, {
          status: "in_progress",
          updatedAt: Timestamp.now(),
        });
        activatedCount++;
      }
    });
    await batch.commit();

    // ログ記録
    await logWebhook(storeId, mapping, body, "activated", activatedCount);

    return NextResponse.json({
      success: true,
      action: "phase_updated",
      storeName,
      phase: mapping.sfPhaseName,
      wbsPhase: mapping.wbsPhase,
      tasksActivated: activatedCount,
      baseDateUpdated: mapping.isBaseDate,
    });
  } catch (error) {
    console.error("Salesforce webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: ヘルスチェック用（Salesforce側からの接続テスト）
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Salesforce webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

// Webhookログを記録
async function logWebhook(
  storeId: string,
  mapping: { sfPhaseCode: string; sfPhaseName: string; wbsPhase: string },
  payload: WebhookPayload,
  action: string,
  tasksAffected: number,
) {
  await adminDb.collection("webhookLogs").add({
    storeId,
    sfPhaseCode: mapping.sfPhaseCode,
    sfPhaseName: mapping.sfPhaseName,
    wbsPhase: mapping.wbsPhase,
    sfRecordId: payload.sfRecordId || "",
    action,
    tasksAffected,
    receivedAt: Timestamp.now(),
  });
}
