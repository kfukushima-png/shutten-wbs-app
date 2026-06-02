"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getAllUsers, createUser, updateUser, deleteUser } from "@/lib/firestore";
import type { AppUser, UserRole } from "@/types";

export default function UsersPage() {
  const { hasAccess, loading } = useRequireRole(["admin"]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", role: "pm" as UserRole });

  const loadUsers = async () => {
    setUsers(await getAllUsers());
  };

  useEffect(() => {
    if (hasAccess) loadUsers();
  }, [hasAccess]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempUid = `pending_${Date.now()}`;
    await createUser(tempUid, {
      email: form.email,
      displayName: form.displayName,
      role: form.role,
      storeIds: [],
      createdAt: new Date(),
    });
    setShowAdd(false);
    setForm({ email: "", displayName: "", role: "pm" });
    loadUsers();
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    await updateUser(uid, { role });
    loadUsers();
  };

  const handleDelete = async (uid: string) => {
    if (confirm("このユーザーを削除しますか？")) {
      await deleteUser(uid);
      loadUsers();
    }
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ユーザー管理</h1>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          ユーザー追加
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input required type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-64" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
              <input required value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
              <select value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="admin">管理者</option>
                <option value="pm">本部PM</option>
                <option value="owner">オーナー</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              追加
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">
              キャンセル
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">名前</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">メール</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">ロール</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-b border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-800">{u.displayName}</td>
                <td className="px-5 py-3 text-gray-600">{u.email}</td>
                <td className="px-5 py-3">
                  <select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className="border rounded px-2 py-1 text-sm bg-white">
                    <option value="admin">管理者</option>
                    <option value="pm">本部PM</option>
                    <option value="owner">オーナー</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleDelete(u.uid)} className="text-red-500 hover:text-red-700 text-xs">
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
