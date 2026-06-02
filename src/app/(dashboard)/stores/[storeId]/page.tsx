"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getStore, getTasksByStore } from "@/lib/firestore";
import TaskTable from "@/components/task-table";
import AddTaskModal from "@/components/add-task-modal";
import CsvUpload from "@/components/csv-upload";
import GanttChart from "@/components/gantt-chart";
import CalendarButton from "@/components/calendar-button";
import ReportButton from "@/components/report-button";
import StoreEditModal from "@/components/store-edit-modal";
import type { Store, Task } from "@/types";

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { appUser, loading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"table" | "gantt">("table");
  const [noAccess, setNoAccess] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [ganttSelectedIds, setGanttSelectedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const saved = localStorage.getItem(`gantt-selected-${storeId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [selectMode, setSelectMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`gantt-mode-${storeId}`) === "select";
  });

  const canEdit = appUser?.role === "admin" || appUser?.role === "pm";
  const isOwner = appUser?.role === "owner";

  const loadData = async () => {
    const [s, allTasks] = await Promise.all([getStore(storeId), getTasksByStore(storeId)]);
    setStore(s);
    setTasks(isOwner ? allTasks.filter((t) => t.visibleToOwner) : allTasks);
  };

  useEffect(() => {
    if (loading || !appUser || !storeId) return;
    if (isOwner && !appUser.storeIds?.includes(storeId)) {
      setNoAccess(true);
      return;
    }
    loadData();
  }, [loading, appUser, storeId]);

  const toggleGanttSelect = (taskId: string) => {
    setGanttSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
      localStorage.setItem(`gantt-selected-${storeId}`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleSelectAll = () => {
    if (ganttSelectedIds.size === tasks.length) {
      setGanttSelectedIds(new Set());
      localStorage.setItem(`gantt-selected-${storeId}`, "[]");
    } else {
      const allIds = new Set(tasks.map((t) => t.id));
      setGanttSelectedIds(allIds);
      localStorage.setItem(`gantt-selected-${storeId}`, JSON.stringify([...allIds]));
    }
  };

  const ganttTasks = selectMode && ganttSelectedIds.size > 0
    ? tasks.filter((t) => ganttSelectedIds.has(t.id))
    : tasks;

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!appUser) return <div className="text-red-500">ログインが必要です</div>;
  if (noAccess) return <div className="text-red-500">この店舗へのアクセス権限がありません</div>;
  if (!store) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-800">{store.name}</h1>
            {canEdit && (
              <button onClick={() => setShowEditStore(true)}
                className="text-gray-400 hover:text-blue-600 transition-colors" title="店舗情報を編集">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {store.brandName && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">{store.brandName}</span>
            )}
            {canEdit && <p className="text-sm text-gray-500">オーナー: {store.ownerName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setView("table"); setSelectMode(false); localStorage.setItem(`gantt-mode-${storeId}`, "table"); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "table" && !selectMode ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              テーブル
            </button>
            <button onClick={() => { setView("gantt"); setSelectMode(false); localStorage.setItem(`gantt-mode-${storeId}`, "gantt"); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "gantt" && !selectMode ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              ガント（全件）
            </button>
            <button onClick={() => { setView("gantt"); setSelectMode(true); localStorage.setItem(`gantt-mode-${storeId}`, "select"); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectMode ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              ガント（選択）
            </button>
          </div>
          {canEdit && <CalendarButton storeName={store.name} tasks={tasks} />}
          {canEdit && <ReportButton storeId={storeId} storeName={store.name} />}
          {canEdit && (
            <>
              <CsvUpload storeId={storeId} onUploaded={loadData} />
              <button onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                タスク追加
              </button>
            </>
          )}
        </div>
      </div>

      {/* ガント選択モード: タスク選択テーブル + ガントチャート */}
      {selectMode ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">表示するタスクを選択 ({ganttSelectedIds.size}/{tasks.length}件)</h3>
              <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:underline">
                {ganttSelectedIds.size === tasks.length ? "全解除" : "全選択"}
              </button>
            </div>
            <TaskTable tasks={tasks} viewerRole={appUser.role} storeId={storeId} onRefresh={loadData}
              showCheckboxes selectedTaskIds={ganttSelectedIds} onToggleSelect={toggleGanttSelect} />
          </div>
          {ganttSelectedIds.size > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <GanttChart tasks={ganttTasks} />
            </div>
          )}
        </div>
      ) : view === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <TaskTable tasks={tasks} viewerRole={appUser.role} storeId={storeId} onRefresh={loadData} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <GanttChart tasks={ganttTasks} />
        </div>
      )}

      {showAddModal && canEdit && (
        <AddTaskModal storeId={storeId} onClose={() => setShowAddModal(false)} onCreated={loadData} />
      )}
      {showEditStore && canEdit && store && (
        <StoreEditModal store={store} onClose={() => setShowEditStore(false)} onUpdated={loadData} />
      )}
    </div>
  );
}
