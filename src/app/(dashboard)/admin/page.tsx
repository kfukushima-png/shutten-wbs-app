"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getStores, getTasksByStore } from "@/lib/firestore";
import type { Store, Task } from "@/types";
import Link from "next/link";

interface StoreProgress {
  store: Store;
  total: number;
  done: number;
}

export default function AdminDashboard() {
  const { appUser, loading, hasAccess } = useRequireRole(["admin"]);
  const [storeProgress, setStoreProgress] = useState<StoreProgress[]>([]);

  const loadData = async () => {
    const stores = await getStores();
    const progress: StoreProgress[] = [];
    for (const store of stores) {
      const tasks = await getTasksByStore(store.id);
      progress.push({
        store,
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
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
        <h1 className="text-2xl font-bold text-gray-800">管理者ダッシュボード</h1>
        <Link href="/admin/users" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          ユーザー管理
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storeProgress.map(({ store, total, done }) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={store.id} href={`/pm/stores/${store.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-800 mb-1">{store.name}</h3>
              <p className="text-sm text-gray-500 mb-3">オーナー: {store.ownerName}</p>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">{done} / {total} タスク完了 ({pct}%)</p>
            </Link>
          );
        })}
      </div>

      {storeProgress.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>店舗がまだ登録されていません</p>
          <Link href="/pm/stores" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            店舗を追加する
          </Link>
        </div>
      )}
    </div>
  );
}
