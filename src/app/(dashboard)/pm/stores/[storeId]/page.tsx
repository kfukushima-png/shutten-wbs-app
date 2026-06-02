"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRequireRole } from "@/lib/auth-context";
import { getStore, getTasksByStore } from "@/lib/firestore";
import TaskTable from "@/components/task-table";
import AddTaskModal from "@/components/add-task-modal";
import CsvUpload from "@/components/csv-upload";
import GanttChart from "@/components/gantt-chart";
import type { Store, Task } from "@/types";

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { appUser, loading, hasAccess } = useRequireRole(["admin", "pm"]);
  const [store, setStore] = useState<Store | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<"table" | "gantt">("table");

  const loadData = async () => {
    const [s, t] = await Promise.all([getStore(storeId), getTasksByStore(storeId)]);
    setStore(s);
    setTasks(t);
  };

  useEffect(() => {
    if (hasAccess && storeId) loadData();
  }, [hasAccess, storeId]);

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;
  if (!store) return <div className="text-gray-500">店舗が見つかりません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{store.name}</h1>
          <p className="text-sm text-gray-500">オーナー: {store.ownerName}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <CsvUpload storeId={storeId} onUploaded={loadData} />
          <button onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            タスク追加
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <TaskTable tasks={tasks} viewerRole={appUser!.role} onRefresh={loadData} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <GanttChart tasks={tasks} />
        </div>
      )}

      {showAddModal && (
        <AddTaskModal storeId={storeId} onClose={() => setShowAddModal(false)} onCreated={loadData} />
      )}
    </div>
  );
}
