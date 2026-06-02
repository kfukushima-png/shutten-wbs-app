"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { getStore, getTasksByStore, getCommentsByStore } from "@/lib/firestore";
import TaskTable from "@/components/task-table";
import AddTaskModal from "@/components/add-task-modal";
import CsvUpload from "@/components/csv-upload";
import GanttChart from "@/components/gantt-chart";
import CalendarButton from "@/components/calendar-button";
import ReportButton from "@/components/report-button";
import StoreEditModal from "@/components/store-edit-modal";
import type { Store, Task, TaskComment } from "@/types";

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { appUser, loading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<(TaskComment & { taskName?: string })[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"table" | "gantt">("table");
  const [noAccess, setNoAccess] = useState(false);
  const [showEditStore, setShowEditStore] = useState(false);
  const [ganttSelectedIds, setGanttSelectedIds] = useState<Set<string>>(new Set());
  const [ganttInitialized, setGanttInitialized] = useState(false);

  const canEdit = appUser?.role === "admin" || appUser?.role === "pm";
  const isOwner = appUser?.role === "owner";

  const loadData = async () => {
    const [s, allTasks] = await Promise.all([
      getStore(storeId),
      getTasksByStore(storeId),
    ]);
    setStore(s);
    const visibleTasks = isOwner ? allTasks.filter((t) => t.visibleToOwner) : allTasks;
    setTasks(visibleTasks);
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));
    try {
      const allComments = await getCommentsByStore(storeId);
      setComments(allComments.map((c) => ({ ...c, taskName: taskMap.get(c.taskId)?.name })));
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    if (loading || !appUser || !storeId) return;
    if (isOwner && !appUser.storeIds?.includes(storeId)) {
      setNoAccess(true);
      return;
    }
    loadData();
  }, [loading, appUser, storeId]);

  // ガントモードに切り替えた時、初回は完了以外を自動選択
  useEffect(() => {
    if (view === "gantt" && !ganttInitialized && tasks.length > 0) {
      const undoneTasks = tasks.filter((t) => t.status !== "done");
      setGanttSelectedIds(new Set(undoneTasks.map((t) => t.id)));
      setGanttInitialized(true);
    }
  }, [view, tasks, ganttInitialized]);

  const toggleGanttSelect = (taskId: string) => {
    setGanttSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (ganttSelectedIds.size === tasks.length) {
      setGanttSelectedIds(new Set());
    } else {
      setGanttSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleSelectUndone = () => {
    setGanttSelectedIds(new Set(tasks.filter((t) => t.status !== "done").map((t) => t.id)));
  };

  const ganttTasks = ganttSelectedIds.size > 0
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
            <button onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "table" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              テーブル
            </button>
            <button onClick={() => setView("gantt")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "gantt" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              ガント
            </button>
          </div>
          {canEdit && <CalendarButton storeName={store.name} tasks={tasks} onRefresh={loadData} />}
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

      {view === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <TaskTable tasks={tasks} viewerRole={appUser.role} storeId={storeId} onRefresh={loadData} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">表示するタスクを選択 ({ganttSelectedIds.size}/{tasks.length}件)</h3>
              <div className="flex gap-2">
                <button onClick={handleSelectUndone} className="text-xs text-blue-600 hover:underline">完了以外</button>
                <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:underline">
                  {ganttSelectedIds.size === tasks.length ? "全解除" : "全選択"}
                </button>
              </div>
            </div>
            <TaskTable tasks={tasks} viewerRole={appUser.role} storeId={storeId} onRefresh={loadData}
              showCheckboxes selectedTaskIds={ganttSelectedIds} onToggleSelect={toggleGanttSelect} />
          </div>
          {ganttSelectedIds.size > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <GanttChart tasks={ganttTasks} openingDate={store.openingDate} />
            </div>
          )}
        </div>
      )}

      {/* コメント履歴 */}
      {comments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">コメント履歴</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0">
                {c.authorPhotoURL ? (
                  <img src={c.authorPhotoURL} alt="" className="w-7 h-7 rounded-full mt-0.5 shrink-0" />
                ) : (
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold mt-0.5 shrink-0">
                    {c.authorName?.[0] || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                    {c.taskName && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.taskName}</span>
                    )}
                    <span className="text-xs text-gray-400">{format(c.createdAt, "MM/dd HH:mm")}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
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
