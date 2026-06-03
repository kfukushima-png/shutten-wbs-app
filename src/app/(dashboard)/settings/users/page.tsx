"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getAllUsers, updateUser, deleteUser, getStores, preRegisterUser } from "@/lib/firestore";
import DeleteConfirmModal from "@/components/delete-confirm-modal";
import type { AppUser, UserRole, Store } from "@/types";

type AddUserRole = "pm" | "owner";

export default function UsersPage() {
  const { hasAccess, loading, appUser: currentUser } = useRequireRole(["admin", "pm"]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [assignModal, setAssignModal] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "owner" as AddUserRole, storeIds: [] as string[] });

  const loadData = async () => {
    const [u, s] = await Promise.all([getAllUsers(), getStores()]);
    setUsers(u);
    setStores(s);
  };

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess]);

  const [roleFilter, setRoleFilter] = useState<string>("all");

  const pendingUsers = users.filter((u) => u.status === "pending");
  const activeUsers = users.filter((u) => u.status === "active");
  const filteredActive = roleFilter === "all" ? activeUsers : activeUsers.filter((u) => u.role === roleFilter);

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

  const handleDeleteClick = (user: AppUser) => {
    if (user.uid === currentUser?.uid) {
      alert("自分自身は削除できません");
      return;
    }
    setDeleteTarget(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.uid);
    setDeleteTarget(null);
    loadData();
  };

  const handleStoreAssign = async (uid: string, storeIds: string[]) => {
    await updateUser(uid, { storeIds });
    setAssignModal(null);
    loadData();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim()) return;
    await preRegisterUser(addForm.email.trim(), addForm.role, addForm.storeIds);
    setShowAddUser(false);
    setAddForm({ email: "", role: "owner", storeIds: [] });
    alert(`${addForm.email} を事前登録しました。このメールアドレスでGoogleログインすると自動承認されます。`);
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ユーザー管理</h1>
        <button onClick={() => setShowAddUser(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          ユーザー追加
        </button>
      </div>

      {/* 事前登録フォーム */}
      {showAddUser && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-bold text-gray-800 mb-1">ユーザー事前登録</h3>
          <p className="text-xs text-gray-500 mb-3">登録したメールアドレスでGoogleログインすると、自動で承認されます</p>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
              <input required type="email" value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-64" placeholder="example@gmail.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
              <select value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as AddUserRole })}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="owner">オーナー</option>
                <option value="pm">本部PM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当店舗（任意）</label>
              <select multiple value={addForm.storeIds}
                onChange={(e) => setAddForm({ ...addForm, storeIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
                className="border rounded-lg px-3 py-2 text-sm h-20 w-48">
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-0.5">未選択でもOK（後から割当可能）</p>
            </div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              登録
            </button>
            <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">
              キャンセル
            </button>
          </form>
        </div>
      )}

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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-700">アクティブユーザー ({filteredActive.length}/{activeUsers.length}名)</h2>
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "全て" },
            { value: "admin", label: "admin" },
            { value: "pm", label: "本部PM" },
            { value: "owner", label: "オーナー" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setRoleFilter(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === opt.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
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
            {filteredActive.map((u) => {
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
                        <option value="admin">admin</option>
                        <option value="pm">本部PM</option>
                        <option value="owner">オーナー</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" :
                        u.role === "pm" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {{ admin: "admin", pm: "本部PM", owner: "オーナー" }[u.role]}
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
                      <button onClick={() => handleDeleteClick(u)} className="text-red-400 hover:text-red-600 text-xs">
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

      {/* ユーザー削除確認モーダル */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="ユーザーを削除"
          message={`「${deleteTarget.displayName}」を削除します。このユーザーの担当店舗やタスクへのアクセスが失われます。削除するには、メールアドレスを入力してください。`}
          confirmLabel="メールアドレスを入力して確認"
          confirmPlaceholder="メールアドレスを入力"
          confirmValue={deleteTarget.email}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function StoreAssignModal({
  user, stores, onSave, onClose,
}: {
  user: AppUser; stores: Store[];
  onSave: (uid: string, storeIds: string[]) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(user.storeIds || []);
  const toggle = (storeId: string) => {
    setSelected((prev) => prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]);
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
              <input type="checkbox" checked={selected.includes(store.id)} onChange={() => toggle(store.id)} className="rounded" />
              <div>
                <p className="font-medium text-gray-800 text-sm">{store.name}</p>
                <p className="text-xs text-gray-500">{store.brandName && <span className="mr-2">{store.brandName}</span>}オーナー: {store.ownerName}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(user.uid, selected)} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">保存</button>
          <button onClick={onClose} className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">キャンセル</button>
        </div>
      </div>
    </div>
  );
}
