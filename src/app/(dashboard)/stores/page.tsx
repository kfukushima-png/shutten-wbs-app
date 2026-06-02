"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getStores, getBrands, createStore, generateTasksFromTemplates, getTaskTemplatesByBrand } from "@/lib/firestore";
import type { Store, Brand } from "@/types";
import Link from "next/link";

export default function StoresPage() {
  const { appUser, loading, hasAccess } = useRequireRole(["admin", "pm"]);
  const [stores, setStores] = useState<Store[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", ownerName: "", baseDate: "", brandId: "" });
  const [creating, setCreating] = useState(false);
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  const loadStores = async () => setStores(await getStores());

  useEffect(() => {
    if (hasAccess) {
      loadStores();
      getBrands().then(setBrands);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (form.brandId) {
      getTaskTemplatesByBrand(form.brandId).then((t) => setTemplateCount(t.length));
    } else {
      setTemplateCount(null);
    }
  }, [form.brandId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !form.brandId) return;
    setCreating(true);
    const brand = brands.find((b) => b.id === form.brandId);
    const storeId = await createStore({
      name: form.name,
      brandId: form.brandId,
      brandName: brand?.name || "",
      ownerId: "",
      ownerName: form.ownerName,
      baseDate: new Date(form.baseDate),
    });
    await generateTasksFromTemplates(storeId, form.brandId, new Date(form.baseDate), appUser.uid, appUser.displayName);
    setShowAdd(false);
    setForm({ name: "", ownerName: "", baseDate: "", brandId: "" });
    setCreating(false);
    loadStores();
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">店舗管理</h1>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          新規店舗追加
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">新規店舗</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ブランド選択 *</label>
              {brands.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {brands.map((brand) => (
                    <button key={brand.id} type="button"
                      onClick={() => setForm({ ...form, brandId: brand.id })}
                      className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        form.brandId === brand.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <div className="font-medium text-gray-800">{brand.name}</div>
                      {brand.description && <div className="text-xs text-gray-500 mt-0.5">{brand.description}</div>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  ブランドが未登録です → <a href="/settings/brands" className="text-blue-600 hover:underline">ブランド管理</a>
                </p>
              )}
              {templateCount !== null && (
                <p className="text-sm text-blue-600 mt-2">このブランドには {templateCount} 件のテンプレートタスクが設定されています</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">店舗名 *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm w-48" placeholder="例: 渋谷店" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">オーナー名 *</label>
                <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm w-40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基準日（契約日） *</label>
                <input type="date" required value={form.baseDate} onChange={(e) => setForm({ ...form, baseDate: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={creating || !form.brandId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {creating ? "作成中..." : "作成"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <Link key={store.id} href={`/stores/${store.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-800">{store.name}</h3>
              {store.brandName && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium">{store.brandName}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">オーナー: {store.ownerName}</p>
            <p className="text-xs text-gray-400 mt-2">基準日: {store.baseDate.toLocaleDateString("ja-JP")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
