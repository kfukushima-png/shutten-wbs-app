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

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!appUser) return <div className="text-red-500">ログインが必要です</div>;
  if (noAccess) return <div className="text-red-500">この店舗へのアクセス権限がありません</div>;
  if (!store) return <div className="text-gray-500">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{store.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {store.brandName && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                {store.brandName}
              </span>
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
              ガントチャート
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {view === "table" ? (
          <TaskTable tasks={tasks} viewerRole={appUser.role} storeId={storeId} onRefresh={loadData} />
        ) : (
          <GanttChart tasks={tasks} />
        )}
      </div>

      {showAddModal && canEdit && (
        <AddTaskModal storeId={storeId} onClose={() => setShowAddModal(false)} onCreated={loadData} />
      )}
    </div>
  );
}
