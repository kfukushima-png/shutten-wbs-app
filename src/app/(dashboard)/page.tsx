"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStores, getAllTasks, getAllUsers } from "@/lib/firestore";
import type { Store, AppUser, Task } from "@/types";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

interface UrgentTask {
  storeId: string;
  storeName: string;
  taskCode: string;
  name: string;
  deadline: Date;
  daysLeft: number;
  status: string;
  noDeadline?: boolean;
}

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
  const [pmUsers, setPmUsers] = useState<AppUser[]>([]);
  const [selectedPm, setSelectedPm] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [urgentTasks, setUrgentTasks] = useState<UrgentTask[]>([]);

  useEffect(() => {
    if (!appUser) return;

    (async () => {
      const [allStores, allTasksList, users] = await Promise.all([
        getStores(),
        getAllTasks(),
        appUser.role === "admin" || appUser.role === "pm" ? getAllUsers() : Promise.resolve([]),
      ]);

      if (users.length > 0) {
        setPmUsers(users.filter((u) => u.role === "pm" || u.role === "admin"));
      }

      const tasksByStore = new Map<string, Task[]>();
      for (const t of allTasksList) {
        const arr = tasksByStore.get(t.storeId) || [];
        arr.push(t);
        tasksByStore.set(t.storeId, arr);
      }

      let myStores: Store[];
      if (appUser.role === "admin") {
        myStores = allStores;
      } else if (appUser.role === "pm") {
        myStores = allStores.filter((s) => appUser.storeIds?.includes(s.id) || appUser.storeIds?.length === 0);
      } else {
        myStores = allStores.filter((s) => appUser.storeIds?.includes(s.id) || s.ownerId === appUser.uid);
      }

      const now = new Date();
      const oneWeekLater = new Date(now);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const progress: StoreProgress[] = [];
      const urgent: UrgentTask[] = [];

      for (const store of myStores) {
        const storeTasks = tasksByStore.get(store.id) || [];
        const tasks = appUser.role === "owner" ? storeTasks.filter((t) => t.visibleToOwner) : storeTasks;
        progress.push({
          store,
          total: tasks.length,
          done: tasks.filter((t) => t.status === "done").length,
          overdue: tasks.filter((t) => t.status !== "done" && t.deadline < now).length,
        });

        for (const t of tasks) {
          if (t.status === "done") continue;
          const deadlineYear = t.deadline.getFullYear();
          if (deadlineYear < 2000 || isNaN(t.deadline.getTime())) {
            urgent.push({
              storeId: store.id, storeName: store.name,
              taskCode: t.taskCode || "", name: t.name,
              deadline: t.deadline, daysLeft: 9999, status: t.status, noDeadline: true,
            });
          } else if (t.deadline <= oneWeekLater) {
            urgent.push({
              storeId: store.id, storeName: store.name,
              taskCode: t.taskCode || "", name: t.name,
              deadline: t.deadline, daysLeft: differenceInDays(t.deadline, now), status: t.status,
            });
          }
        }
      }
      urgent.sort((a, b) => {
        if (a.noDeadline && !b.noDeadline) return 1;
        if (!a.noDeadline && b.noDeadline) return -1;
        return a.daysLeft - b.daysLeft;
      });
      setUrgentTasks(urgent);
      setStoreProgress(progress);
      setLoadingData(false);
    })();
  }, [appUser]);

  if (!appUser || loadingData) {
    return <div className="text-gray-500">読み込み中...</div>;
  }

  const showSummary = true; // 全ロールでサマリー表示
  const canManage = appUser.role === "admin" || appUser.role === "pm";

  // フィルター適用
  const brands = [...new Set(storeProgress.map((sp) => sp.store.brandName).filter(Boolean))];
  const filteredProgress = storeProgress.filter((sp) => {
    if (selectedBrand !== "all" && sp.store.brandName !== selectedBrand) return false;
    // PM担当者フィルター: PMのstoreIdsに含まれる店舗のみ
    if (selectedPm !== "all") {
      const pm = pmUsers.find((u) => u.uid === selectedPm);
      if (pm && pm.storeIds?.length > 0 && !pm.storeIds.includes(sp.store.id)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "yyyy年MM月dd日（EEEE）", { locale: ja })}</p>
        </div>
        {canManage && (
          <Link href="/stores" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            店舗管理
          </Link>
        )}
      </div>

      {/* フィルター（admin/pmのみ） */}
      {canManage && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {/* PM担当者フィルター */}
          {pmUsers.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">PM担当者</label>
              <select value={selectedPm} onChange={(e) => setSelectedPm(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">全員</option>
                {pmUsers.map((pm) => (
                  <option key={pm.uid} value={pm.uid}>{pm.displayName}</option>
                ))}
              </select>
            </div>
          )}
          {/* ブランドフィルター */}
          {brands.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">ブランド</label>
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">全ブランド</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* サマリーカード */}
      {showSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-3xl font-bold text-gray-800">{filteredProgress.length}</p>
            <p className="text-sm text-gray-500 mt-1">店舗数</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {filteredProgress.reduce((a, b) => a + b.done, 0)} / {filteredProgress.reduce((a, b) => a + b.total, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">完了タスク</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-3xl font-bold text-red-600">
              {filteredProgress.reduce((a, b) => a + b.overdue, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">期限超過</p>
          </div>
        </div>
      )}

      {/* 1週間以内の期限タスク */}
      {urgentTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            注意が必要なタスク ({urgentTasks.filter((t) => !t.noDeadline).length}件){urgentTasks.some((t) => t.noDeadline) ? ` ＋ 期限未設定 ${urgentTasks.filter((t) => t.noDeadline).length}件` : ""}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-xs">残り</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-xs">店舗</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-xs">タスク</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-xs">期限</th>
                </tr>
              </thead>
              <tbody>
                {urgentTasks.slice(0, 15).map((t, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        t.noDeadline ? "bg-gray-200 text-gray-600" :
                        t.daysLeft < 0 ? "bg-red-100 text-red-700" :
                        t.daysLeft === 0 ? "bg-orange-100 text-orange-700" :
                        t.daysLeft <= 3 ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-50 text-blue-600"
                      }`}>
                        {t.noDeadline ? "期限未設定" :
                         t.daysLeft < 0 ? `${Math.abs(t.daysLeft)}日超過` :
                         t.daysLeft === 0 ? "今日" :
                         `あと${t.daysLeft}日`}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      <Link href={`/stores/${t.storeId}`} className="hover:text-blue-600 hover:underline">
                        {t.storeName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {t.taskCode && <span className="text-[10px] text-gray-400 font-mono mr-1">{t.taskCode}</span>}
                      <span className="font-medium text-gray-800">{t.name}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{t.noDeadline ? "—" : format(t.deadline, "MM/dd")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {urgentTasks.length > 15 && (
              <p className="text-xs text-gray-400 mt-2">他{urgentTasks.length - 15}件...</p>
            )}
          </div>
        </div>
      )}

      {/* 店舗カード一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProgress.map(({ store, total, done, overdue }) => {
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
                {overdue > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                    {overdue}件遅延
                  </span>
                )}
              </div>
              {canManage && <p className="text-sm text-gray-500 mb-3">オーナー: {store.ownerName}</p>}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">{done}/{total} 完了 ({pct}%)</p>
            </Link>
          );
        })}
      </div>

      {filteredProgress.length === 0 && (
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
