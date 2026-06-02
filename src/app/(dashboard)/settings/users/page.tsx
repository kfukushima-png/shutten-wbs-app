"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getAllUsers, updateUser, deleteUser, getStores } from "@/lib/firestore";
import type { AppUser, UserRole, Store } from "@/types";

export default function UsersPage() {
  const { hasAccess, loading, appUser: currentUser } = useRequireRole(["admin", "pm"]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [assignModal, setAssignModal] = useState<AppUser | null>(null);

  const loadData = async () => {
    const [u, s] = await Promise.all([getAllUsers(), getStores()]);
    setUsers(u);
    setStores(s);
  };

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess]);

  const pendingUsers = users.filter((u) => u.status === "pending");
  const activeUsers = users.filter((u) => u.status === "active");

  const handleApprove = async (uid: string, role: UserRole) => {
    await updateUser(uid, { status: "active", role });
    loadData();
  };

  const handleReject = async (uid: string) => {
    if (confirm("このユーザーのリクエストを拒否して削除しますか？")) {
      await deleteUser(uid);
      loadData();
    }
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    await updateUser(uid, { role });
    loadData();
  };

  const handleDelete = async (uid: string) => {
    if (uid === currentUser?.uid) {
      alert("自分自身は削除できません");
      return;
    }
    if (confirm("このユーザーを削除しますか？")) {
      await deleteUser(uid);
      loadData();
    }
  };

  const handleStoreAssign = async (uid: string, storeIds: string[]) => {
    await updateUser(uid, { storeIds });
    setAssignModal(null);
    loadData();
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ユーザー管理</h1>

      {/* 承認待ち */}
      {pendingUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-yellow-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            承認待ち ({pendingUsers.length}件)
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u.uid} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center text-yellow-700 font-bold">
                      {u.displayName?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-800">{u.displayName || "名前未設定"}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(u.uid, "owner")}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    オーナーとして承認
                  </button>
                  <button onClick={() => handleApprove(u.uid, "pm")}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    PMとして承認
                  </button>
                  <button onClick={() => handleReject(u.uid)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                    拒否
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクティブユーザー */}
      <h2 className="text-lg font-bold text-gray-700 mb-3">アクティブユーザー ({activeUsers.length}名)</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">ユーザー</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">メール</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">ロール</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">担当店舗</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map((u) => {
              const assignedStores = stores.filter((s) => u.storeIds?.includes(s.id));
              const isMe = u.uid === currentUser?.uid;
              return (
                <tr key={u.uid} className={`border-b border-gray-100 ${isMe ? "bg-blue-50/30" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs">
                          {u.displayName?.[0] || "?"}
                        </div>
                      )}
                      <span className="font-medium text-gray-800">
                        {u.displayName} {isMe && <span className="text-xs text-blue-600">(自分)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    {currentUser?.role === "admin" && !isMe ? (
                      <select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        className="border rounded px-2 py-1 text-sm bg-white">
                        <option value="admin">管理者</option>
                        <option value="pm">本部PM</option>
                        <option value="owner">オーナー</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" :
                        u.role === "pm" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {{ admin: "管理者", pm: "本部PM", owner: "オーナー" }[u.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {assignedStores.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedStores.map((s) => (
                          <span key={s.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{s.name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">未割当</span>
                    )}
                    <button onClick={() => setAssignModal(u)}
                      className="text-blue-600 text-xs hover:underline ml-1">編集</button>
                  </td>
                  <td className="px-5 py-3">
                    {!isMe && (
                      <button onClick={() => handleDelete(u.uid)} className="text-red-400 hover:text-red-600 text-xs">
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 店舗割当モーダル */}
      {assignModal && (
        <StoreAssignModal
          user={assignModal}
          stores={stores}
          onSave={handleStoreAssign}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

function StoreAssignModal({
  user,
  stores,
  onSave,
  onClose,
}: {
  user: AppUser;
  stores: Store[];
  onSave: (uid: string, storeIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(user.storeIds || []);

  const toggle = (storeId: string) => {
    setSelected((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">店舗割当</h3>
        <p className="text-sm text-gray-500 mb-4">{user.displayName} ({user.email})</p>

        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {stores.map((store) => (
            <label key={store.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected.includes(store.id) ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
            }`}>
              <input
                type="checkbox"
                checked={selected.includes(store.id)}
                onChange={() => toggle(store.id)}
                className="rounded"
              />
              <div>
                <p className="font-medium text-gray-800 text-sm">{store.name}</p>
                <p className="text-xs text-gray-500">
                  {store.brandName && <span className="mr-2">{store.brandName}</span>}
                  オーナー: {store.ownerName}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onSave(user.uid, selected)}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
            保存
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
