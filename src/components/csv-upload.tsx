"use client";

import { useState } from "react";
import Papa from "papaparse";
import { format } from "date-fns";
import { checkDuplicateTasks, bulkCreateTasks, updateTask } from "@/lib/firestore";
import type { Task, OwnerSensitivity } from "@/types";

interface Props {
  storeId: string;
  onUploaded: () => void;
}

type DuplicateAction = "skip" | "overwrite" | "add";

interface DuplicateItem {
  incoming: Omit<Task, "id" | "createdAt" | "updatedAt">;
  existing: Task;
  action: DuplicateAction;
}

interface RowError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export default function CsvUpload({ storeId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [newTasks, setNewTasks] = useState<Omit<Task, "id" | "createdAt" | "updatedAt">[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [globalAction, setGlobalAction] = useState<DuplicateAction>("skip");
  const [errors, setErrors] = useState<RowError[]>([]);
  const [skippedRows, setSkippedRows] = useState<number>(0);

  const validateRow = (row: Record<string, string>, rowIndex: number): RowError[] => {
    const rowErrors: RowError[] = [];
    const name = row["タスク名"] || row["name"] || "";
    const phase = row["フェーズ"] || row["phase"] || "";
    const deadlineRaw = row["期限"] || row["deadline"] || "";
    const sensitivity = row["公開区分"] || row["ownerSensitivity"] || "";

    if (!name.trim()) {
      rowErrors.push({ row: rowIndex, field: "タスク名", value: name, message: "タスク名が空です" });
    }
    if (!phase.trim()) {
      rowErrors.push({ row: rowIndex, field: "フェーズ", value: phase, message: "フェーズが空です" });
    }
    if (deadlineRaw && isNaN(new Date(deadlineRaw).getTime())) {
      rowErrors.push({ row: rowIndex, field: "期限", value: deadlineRaw, message: `「${deadlineRaw}」は日付として認識できません。YYYY-MM-DD形式で入力してください` });
    }
    if (sensitivity && !["safe", "caution", "secret"].includes(sensitivity)) {
      rowErrors.push({ row: rowIndex, field: "公開区分", value: sensitivity, message: `「${sensitivity}」は無効です。safe / caution / secret のいずれかを入力してください` });
    }
    return rowErrors;
  };

  const parseRow = (row: Record<string, string>): Omit<Task, "id" | "createdAt" | "updatedAt"> => {
    const sd = new Date(row["開始日"] || row["startDate"] || row["期限"] || row["deadline"] || new Date());
    const dl = new Date(row["完了期限"] || row["期限"] || row["deadline"] || new Date());
    return {
      taskCode: row["タスクID"] || row["taskCode"] || "",
      storeId,
      templateId: null,
      name: row["タスク名"] || row["name"] || "",
      phase: row["フェーズ"] || row["phase"] || "",
      basePhaseCode: row["基準フェーズコード"] || row["basePhaseCode"] || "",
      idealStartDate: sd,
      idealEndDate: dl,
      startDate: sd,
      deadline: dl,
      deadlineDescription: row["期限設定"] || row["deadlineDescription"] || "",
      assigneeId: "",
      assigneeName: row["実行者"] || row["assignee"] || "",
      details: row["詳細"] || row["details"] || "",
      ownerMessage: row["オーナー共有文章"] || row["ownerMessage"] || "",
      ownerResources: row["共有資料URL"] || row["ownerResources"] || "",
      status: "not_started",
      visibleToOwner: (row["オーナー表示"] || row["visibleToOwner"] || "true") === "true",
      ownerSensitivity: (row["公開区分"] || row["ownerSensitivity"] || "safe") as OwnerSensitivity,
      dependsOn: row["前提タスク"] || row["dependsOn"] || "",
      isManual: true,
    };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("CSVファイル（.csv）を選択してください。\nExcelファイル（.xlsx）はCSV形式で保存してからアップロードしてください。");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];

        if (rows.length === 0) {
          alert("CSVにデータ行がありません。1行目がヘッダー、2行目以降がデータになっているか確認してください。");
          return;
        }

        const headers = Object.keys(rows[0]);
        const hasTaskName = headers.some((h) => h === "タスク名" || h === "name");
        if (!hasTaskName) {
          alert("CSVに「タスク名」列が見つかりません。\n\n1行目のヘッダーに「タスク名」が含まれているか確認してください。\nスプレッドシートからCSV保存する際、ヘッダー行が含まれていることを確認してください。");
          return;
        }

        const allErrors: RowError[] = [];
        const validRows: Record<string, string>[] = [];
        let skipped = 0;

        rows.forEach((row, i) => {
          const rowErrors = validateRow(row, i + 2);
          if (rowErrors.length > 0) {
            const critical = rowErrors.some((e) => e.field === "タスク名");
            if (critical) {
              skipped++;
            } else {
              validRows.push(row);
            }
            allErrors.push(...rowErrors);
          } else {
            validRows.push(row);
          }
        });

        setErrors(allErrors);
        setSkippedRows(skipped);

        const parsed = validRows.map(parseRow).filter((t) => t.name.trim() !== "");
        const result = await checkDuplicateTasks(storeId, parsed);

        setNewTasks(result.newTasks);
        setDuplicates(result.duplicates.map((d) => ({ ...d, action: "skip" as DuplicateAction })));
        setShowReview(true);
      },
    });

    e.target.value = "";
  };

  const handleApplyAll = (action: DuplicateAction) => {
    setGlobalAction(action);
    setDuplicates((prev) => prev.map((d) => ({ ...d, action })));
  };

  const handleExecute = async () => {
    setUploading(true);
    await bulkCreateTasks(newTasks);
    for (const dup of duplicates) {
      if (dup.action === "skip") continue;
      if (dup.action === "add") {
        await bulkCreateTasks([dup.incoming]);
      }
      if (dup.action === "overwrite") {
        await updateTask(dup.existing.id, {
          deadline: dup.incoming.deadline,
          deadlineDescription: dup.incoming.deadlineDescription,
          assigneeName: dup.incoming.assigneeName,
          details: dup.incoming.details,
          ownerMessage: dup.incoming.ownerMessage,
          ownerResources: dup.incoming.ownerResources,
          ownerSensitivity: dup.incoming.ownerSensitivity,
        });
      }
    }
    setUploading(false);
    setShowReview(false);
    setNewTasks([]);
    setDuplicates([]);
    setErrors([]);
    onUploaded();
  };

  return (
    <>
      <div className="relative inline-block">
        <div className="flex items-center gap-1">
          <label className={`inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            CSV取込
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-bold hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center"
            title="CSV取込の注意点"
          >
            ?
          </button>
        </div>

        {showGuide && (
          <div className="absolute right-0 top-full mt-2 z-40 w-[420px] bg-white border border-gray-200 rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800 text-sm">CSV取込の注意点</h4>
              <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <div>
                <p className="font-medium text-gray-700 mb-1">ファイル形式</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>ファイルは <span className="font-mono bg-gray-100 px-1 rounded">.csv</span> 形式で保存してください</li>
                  <li>Excelの場合: 「ファイル」→「名前を付けて保存」→「CSV UTF-8」を選択</li>
                  <li>スプシの場合: 「ファイル」→「ダウンロード」→「カンマ区切り値(.csv)」</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">ヘッダー（1行目）の列名</p>
                <div className="bg-gray-50 rounded-lg p-2 font-mono text-[11px] leading-relaxed">
                  <span className="text-red-600">タスク名</span>,
                  <span className="text-red-600">フェーズ</span>,
                  <span className="text-red-600">期限</span>,
                  期限設定,実行者,詳細,オーナー共有文章,共有資料URL,オーナー表示,公開区分,前提フェーズ
                </div>
                <p className="mt-1 text-gray-500"><span className="text-red-600">赤字</span>は必須列です。他は省略可能です。</p>
              </div>

              <div>
                <p className="font-medium text-gray-700 mb-1">入力値のルール</p>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 font-medium w-24">期限</td>
                      <td className="py-1"><span className="font-mono bg-gray-100 px-1 rounded">2024-08-01</span> （YYYY-MM-DD形式）</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 font-medium">オーナー表示</td>
                      <td className="py-1"><span className="font-mono bg-gray-100 px-1 rounded">true</span> または <span className="font-mono bg-gray-100 px-1 rounded">false</span></td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 font-medium">公開区分</td>
                      <td className="py-1">
                        <span className="font-mono bg-green-50 text-green-700 px-1 rounded">safe</span>{" "}
                        <span className="font-mono bg-yellow-50 text-yellow-700 px-1 rounded">caution</span>{" "}
                        <span className="font-mono bg-red-50 text-red-700 px-1 rounded">secret</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">前提フェーズ</td>
                      <td className="py-1">完了を待つフェーズ名を入力（例: <span className="font-mono bg-gray-100 px-1 rounded">不動産契約</span>）空欄なら依存なし</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 rounded-lg p-2">
                <p className="font-medium text-blue-700 mb-1">よくあるエラー</p>
                <ul className="list-disc pl-4 space-y-0.5 text-blue-600">
                  <li>日付が <span className="font-mono">2024/8/1</span> → <span className="font-mono">2024-08-01</span> に直してください</li>
                  <li>ヘッダー行が2行目以降にある → 1行目に移動してください</li>
                  <li>セル内に改行がある → 改行を削除してから保存してください</li>
                  <li>Excelで「CSV（コンマ区切り）」と「CSV UTF-8」がある場合は <span className="font-medium">UTF-8</span> を選択</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-2">
                <p className="font-medium text-gray-700 mb-1">重複チェック</p>
                <p className="text-gray-500">
                  同じ「タスク名」+「フェーズ」のタスクが既に存在する場合、
                  プレビュー画面で「スキップ / 上書き / 重複追加」を選べます。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowReview(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">CSV取込プレビュー</h2>

            {/* バリデーションエラー */}
            {errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  注意事項: {errors.length} 件
                  {skippedRows > 0 && <span className="text-xs text-red-500 font-normal">（{skippedRows}行はタスク名が空のためスキップ）</span>}
                </h3>
                <div className="bg-red-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {errors.map((err, i) => (
                        <tr key={i} className="border-b border-red-100 last:border-0">
                          <td className="py-1 text-red-400 w-16">行 {err.row}</td>
                          <td className="py-1 font-medium text-red-700 w-20">{err.field}</td>
                          <td className="py-1 text-red-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 新規タスク */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                新規追加: {newTasks.length} 件
              </h3>
              {newTasks.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {newTasks.map((t, i) => (
                        <tr key={i} className="border-b border-green-100 last:border-0">
                          <td className="py-1 font-medium">{t.name}</td>
                          <td className="py-1 text-gray-500">{t.phase}</td>
                          <td className="py-1 text-gray-500">{format(t.deadline, "yyyy/MM/dd")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 重複タスク */}
            {duplicates.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    重複検出: {duplicates.length} 件
                  </h3>
                  <div className="flex gap-1">
                    <span className="text-xs text-gray-500 mr-1">一括:</span>
                    <button onClick={() => handleApplyAll("skip")}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${globalAction === "skip" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      全てスキップ
                    </button>
                    <button onClick={() => handleApplyAll("overwrite")}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${globalAction === "overwrite" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      全て上書き
                    </button>
                    <button onClick={() => handleApplyAll("add")}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${globalAction === "add" ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      全て重複追加
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-yellow-100">
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">タスク名</th>
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">フェーズ</th>
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">既存の期限</th>
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">CSVの期限</th>
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">既存ステータス</th>
                        <th className="text-left px-3 py-2 font-medium text-yellow-800">対応</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((dup, i) => (
                        <tr key={i} className="border-b border-yellow-100">
                          <td className="px-3 py-2 font-medium">{dup.incoming.name}</td>
                          <td className="px-3 py-2 text-gray-600">{dup.incoming.phase}</td>
                          <td className="px-3 py-2 text-gray-600">{format(dup.existing.deadline, "yyyy/MM/dd")}</td>
                          <td className="px-3 py-2 text-gray-600">{format(dup.incoming.deadline, "yyyy/MM/dd")}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              dup.existing.status === "done" ? "bg-green-100 text-green-700" :
                              dup.existing.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {dup.existing.status === "done" ? "完了" : dup.existing.status === "in_progress" ? "進行中" : "未着手"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={dup.action}
                              onChange={(e) => {
                                const newDups = [...duplicates];
                                newDups[i] = { ...newDups[i], action: e.target.value as DuplicateAction };
                                setDuplicates(newDups);
                              }}
                              className="border rounded px-1.5 py-0.5 text-xs bg-white"
                            >
                              <option value="skip">スキップ</option>
                              <option value="overwrite">上書き更新</option>
                              <option value="add">重複追加</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* サマリー */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">実行サマリー</h4>
              <div className="flex gap-6 text-sm flex-wrap">
                <span className="text-green-600">新規追加: {newTasks.length} 件</span>
                <span className="text-blue-600">上書き: {duplicates.filter((d) => d.action === "overwrite").length} 件</span>
                <span className="text-yellow-600">重複追加: {duplicates.filter((d) => d.action === "add").length} 件</span>
                <span className="text-gray-500">スキップ: {duplicates.filter((d) => d.action === "skip").length} 件</span>
                {skippedRows > 0 && <span className="text-red-500">エラー除外: {skippedRows} 行</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleExecute} disabled={uploading || (newTasks.length === 0 && duplicates.every((d) => d.action === "skip"))}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {uploading ? "処理中..." : "実行する"}
              </button>
              <button onClick={() => setShowReview(false)}
                className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
