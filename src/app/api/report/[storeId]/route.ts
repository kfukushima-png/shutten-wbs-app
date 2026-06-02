import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { format, differenceInDays } from "date-fns";

// 店舗ごとの出店レポートをJSON/CSVで生成
// GET /api/report/[storeId]?format=json|csv

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const outputFormat = req.nextUrl.searchParams.get("format") || "json";

  try {
    // 店舗情報
    const storeSnap = await adminDb.collection("stores").doc(storeId).get();
    if (!storeSnap.exists) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const store = storeSnap.data()!;

    // タスク一覧
    const tasksSnap = await adminDb
      .collection("tasks")
      .where("storeId", "==", storeId)
      .orderBy("deadline")
      .get();

    const now = new Date();
    const tasks = tasksSnap.docs.map((d) => {
      const data = d.data();
      const deadline = data.deadline.toDate();
      return {
        name: data.name,
        phase: data.phase,
        deadline: format(deadline, "yyyy/MM/dd"),
        status: data.status,
        statusLabel: { not_started: "未着手", in_progress: "進行中", done: "完了" }[data.status as string] || data.status,
        assigneeName: data.assigneeName || "未割当",
        isOverdue: data.status !== "done" && deadline < now,
        daysOverdue: data.status !== "done" && deadline < now ? differenceInDays(now, deadline) : 0,
        details: data.details || "",
      };
    });

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const overdueTasks = tasks.filter((t) => t.isOverdue).length;
    const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // フェーズ別サマリー
    const phases = [...new Set(tasks.map((t) => t.phase))];
    const phaseSummary = phases.map((phase) => {
      const phaseTasks = tasks.filter((t) => t.phase === phase);
      const done = phaseTasks.filter((t) => t.status === "done").length;
      return {
        phase,
        total: phaseTasks.length,
        done,
        inProgress: phaseTasks.filter((t) => t.status === "in_progress").length,
        notStarted: phaseTasks.filter((t) => t.status === "not_started").length,
        overdue: phaseTasks.filter((t) => t.isOverdue).length,
        progressPct: phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0,
      };
    });

    if (outputFormat === "csv") {
      const headers = ["タスク名", "フェーズ", "期限", "ステータス", "担当者", "遅延日数", "詳細"];
      const rows = tasks.map((t) => [
        t.name, t.phase, t.deadline, t.statusLabel, t.assigneeName,
        t.daysOverdue > 0 ? `${t.daysOverdue}日` : "", t.details,
      ]);
      const bom = "﻿";
      const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${store.name}_レポート_${format(now, "yyyyMMdd")}.csv"`,
        },
      });
    }

    return NextResponse.json({
      report: {
        storeName: store.name,
        brandName: store.brandName || "",
        ownerName: store.ownerName,
        generatedAt: format(now, "yyyy/MM/dd HH:mm"),
        summary: {
          totalTasks,
          doneTasks,
          inProgressTasks,
          notStartedTasks: totalTasks - doneTasks - inProgressTasks,
          overdueTasks,
          progressPct,
        },
        phaseSummary,
        tasks,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
