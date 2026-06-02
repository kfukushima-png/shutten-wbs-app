"use client";

import { useState } from "react";

interface Props {
  storeId: string;
  storeName: string;
}

export default function ReportButton({ storeId, storeName }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDownloadCSV = () => {
    window.open(`/api/report/${storeId}?format=csv`, "_blank");
    setShowMenu(false);
  };

  const handleCopyReport = async () => {
    try {
      const res = await fetch(`/api/report/${storeId}?format=json`);
      const data = await res.json();
      const r = data.report;

      const lines = [
        `出店レポート: ${r.storeName}`,
        `生成日時: ${r.generatedAt}`,
        `ブランド: ${r.brandName}`,
        `オーナー: ${r.ownerName}`,
        "",
        `■ 全体進捗: ${r.summary.progressPct}%`,
        `  完了: ${r.summary.doneTasks}件 / 進行中: ${r.summary.inProgressTasks}件 / 未着手: ${r.summary.notStartedTasks}件 / 期限超過: ${r.summary.overdueTasks}件`,
        "",
        "■ フェーズ別進捗",
        ...r.phaseSummary.map((p: { phase: string; progressPct: number; done: number; total: number; overdue: number }) =>
          `  ${p.phase}: ${p.progressPct}% (${p.done}/${p.total}) ${p.overdue > 0 ? `⚠${p.overdue}件遅延` : ""}`
        ),
        "",
        "■ 期限超過タスク",
        ...r.tasks
          .filter((t: { isOverdue: boolean }) => t.isOverdue)
          .map((t: { name: string; deadline: string; daysOverdue: number; assigneeName: string }) =>
            `  ・${t.name} (${t.deadline}, ${t.daysOverdue}日超過, ${t.assigneeName})`
          ),
      ];

      await navigator.clipboard.writeText(lines.join("\n"));
      alert("レポートをクリップボードにコピーしました");
    } catch {
      alert("レポートの取得に失敗しました");
    }
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        レポート
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
            <button onClick={handleDownloadCSV}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              CSV ダウンロード
            </button>
            <button onClick={handleCopyReport}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              テキストレポートをコピー
            </button>
          </div>
        </>
      )}
    </div>
  );
}
