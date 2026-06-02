"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getStores, getTasksByStore } from "@/lib/firestore";
import type { Store } from "@/types";
import Link from "next/link";

interface StoreProgress {
  store: Store;
  total: number;
  done: number;
  overdue: number;
}

export default function PMDashboard() {
  const { appUser, loading, hasAccess } = useRequireRole(["admin", "pm"]);
  const [storeProgress, setStoreProgress] = useState<StoreProgress[]>([]);

  const loadData = async () => {
    const allStores = await getStores();
    const stores = appUser?.role === "admin"
      ? allStores
      : allStores.filter((s) => appUser?.storeIds?.includes(s.id));

    const progress: StoreProgress[] = [];
    const now = new Date();
    for (const store of stores) {
      const tasks = await getTasksByStore(store.id);
      progress.push({
        store,
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
        overdue: tasks.filter((t) => t.status !== "done" && t.deadline < now).length,
      });
    }
    setStoreProgress(progress);
  };

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess]);

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">本部PMダッシュボード</h1>
        <Link href="/pm/stores" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          店舗管理
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-gray-800">{storeProgress.length}</p>
          <p className="text-sm text-gray-500 mt-1">店舗数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">
            {storeProgress.reduce((a, b) => a + b.done, 0)} / {storeProgress.reduce((a, b) => a + b.total, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">完了タスク</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-red-600">
            {storeProgress.reduce((a, b) => a + b.overdue, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">期限超過</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storeProgress.map(({ store, total, done, overdue }) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={store.id} href={`/pm/stores/${store.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800">{store.name}</h3>
                {overdue > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                    {overdue}件遅延
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">オーナー: {store.ownerName}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">{done}/{total} 完了 ({pct}%)</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
