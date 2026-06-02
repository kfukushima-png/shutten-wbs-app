"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getStores, getTasksByStore } from "@/lib/firestore";
import TaskTable from "@/components/task-table";
import GanttChart from "@/components/gantt-chart";
import type { Store, Task } from "@/types";

export default function OwnerPage() {
  const { appUser, loading, hasAccess } = useRequireRole(["owner"]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"table" | "gantt">("table");

  useEffect(() => {
    if (!hasAccess || !appUser) return;
    (async () => {
      const allStores = await getStores();
      const myStores = allStores.filter((s) => appUser.storeIds?.includes(s.id) || s.ownerId === appUser.uid);
      setStores(myStores);
      if (myStores.length > 0) {
        setSelectedStoreId(myStores[0].id);
      }
    })();
  }, [hasAccess, appUser]);

  useEffect(() => {
    if (!selectedStoreId) return;
    (async () => {
      const allTasks = await getTasksByStore(selectedStoreId);
      setTasks(allTasks.filter((t) => t.visibleToOwner));
    })();
  }, [selectedStoreId]);

  const loadTasks = async () => {
    if (!selectedStoreId) return;
    const allTasks = await getTasksByStore(selectedStoreId);
    setTasks(allTasks.filter((t) => t.visibleToOwner));
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">マイ店舗</h1>
        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <select value={selectedStoreId || ""}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white">
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
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
        </div>
      </div>

      {selectedStoreId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {view === "table" ? (
            <TaskTable tasks={tasks} viewerRole="owner" onRefresh={loadTasks} />
          ) : (
            <GanttChart tasks={tasks} />
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">割り当てられた店舗がありません</p>
      )}
    </div>
  );
}
