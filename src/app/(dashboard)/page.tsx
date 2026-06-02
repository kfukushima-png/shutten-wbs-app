"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStores, getTasksByStore } from "@/lib/firestore";
import type { Store } from "@/types";
import Link from "next/link";

interface StoreProgress {
  store: Store;
  total: number;
  done: number;
  overdue: number;
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [storeProgress, setStoreProgress] = useState<StoreProgress[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!appUser) return;

    (async () => {
      const allStores = await getStores();
      const now = new Date();

      // ロールに応じてフィルタ
      let myStores: Store[];
      if (appUser.role === "admin") {
        myStores = allStores;
      } else if (appUser.role === "pm") {
        myStores = allStores.filter((s) => appUser.storeIds?.includes(s.id) || appUser.storeIds?.length === 0);
      } else {
        myStores = allStores.filter((s) => appUser.storeIds?.includes(s.id) || s.ownerId === appUser.uid);
      }

      const progress: StoreProgress[] = [];
      for (const store of myStores) {
        const allTasks = await getTasksByStore(store.id);
        // オーナーは公開タスクのみカウント
        const tasks = appUser.role === "owner" ? allTasks.filter((t) => t.visibleToOwner) : allTasks;
        progress.push({
          store,
          total: tasks.length,
          done: tasks.filter((t) => t.status === "done").length,
          overdue: tasks.filter((t) => t.status !== "done" && t.deadline < now).length,
        });
      }
      setStoreProgress(progress);
      setLoadingData(false);

      // オーナーで1店舗だけなら自動遷移
      if (appUser.role === "owner" && myStores.length === 1) {
        window.location.href = `/stores/${myStores[0].id}`;
      }
    })();
  }, [appUser]);

  if (!appUser || loadingData) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  const roleLabel = { admin: "管理者", pm: "本部PM", owner: "オーナー" }[appUser.role];

  // サマリーカード（admin/pmのみ）
  const showSummary = appUser.role === "admin" || appUser.role === "pm";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
        {showSummary && (
          <Link href="/stores" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            店舗管理
          </Link>
        )}
      </div>

      {/* サマリーカード */}
      {showSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
      )}

      {/* 店舗カード一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storeProgress.map(({ store, total, done, overdue }) => {
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={store.id} href={`/stores/${store.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">{store.name}</h3>
                  {store.brandName && (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">
                      {store.brandName}
                    </span>
                  )}
                </div>
                {overdue > 0 && showSummary && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                    {overdue}件遅延
                  </span>
                )}
              </div>
              {showSummary && <p className="text-sm text-gray-500 mb-3">オーナー: {store.ownerName}</p>}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">{done}/{total} 完了 ({pct}%)</p>
            </Link>
          );
        })}
      </div>

      {storeProgress.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-500">
            {appUser.role === "owner" ? "割り当てられた店舗がまだありません" : "店舗がまだ登録されていません"}
          </p>
        </div>
      )}
    </div>
  );
}
