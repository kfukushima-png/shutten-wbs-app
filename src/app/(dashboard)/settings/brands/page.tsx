"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth-context";
import { getBrands, createBrand, getTaskTemplatesByBrand, deleteBrand, deleteTaskTemplate } from "@/lib/firestore";
import DeleteConfirmModal from "@/components/delete-confirm-modal";
import type { Brand, TaskTemplate } from "@/types";
import { sensitivityLabels, sensitivityColors } from "@/types";
import Link from "next/link";

export default function BrandsPage() {
  const { hasAccess, loading } = useRequireRole(["admin"]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [brandTemplates, setBrandTemplates] = useState<TaskTemplate[]>([]);

  const loadBrands = async () => setBrands(await getBrands());

  useEffect(() => {
    if (hasAccess) loadBrands();
  }, [hasAccess]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBrand(form);
    setShowAdd(false);
    setForm({ name: "", description: "" });
    loadBrands();
  };

  const handleExpand = async (brandId: string) => {
    if (expandedBrand === brandId) {
      setExpandedBrand(null);
      return;
    }
    setExpandedBrand(brandId);
    setBrandTemplates(await getTaskTemplatesByBrand(brandId));
  };

  const [deleteTarget, setDeleteTarget] = useState<{ brand: Brand; templateCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = async (brand: Brand) => {
    const templates = await getTaskTemplatesByBrand(brand.id);
    setDeleteTarget({ brand, templateCount: templates.length });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // テンプレートも一括削除
    if (deleteTarget.templateCount > 0) {
      const templates = await getTaskTemplatesByBrand(deleteTarget.brand.id);
      for (const tpl of templates) {
        await deleteTaskTemplate(tpl.id);
      }
    }
    await deleteBrand(deleteTarget.brand.id);
    setDeleteTarget(null);
    setDeleting(false);
    loadBrands();
  };

  const handleExportCsv = (brand: Brand, templates: TaskTemplate[]) => {
    const headers = ["タスク名", "フェーズ", "基準フェーズコード", "開始日数", "完了日数", "期限設定", "詳細", "オーナー共有文章", "共有資料URL", "公開区分", "表示順"];
    const rows = templates.map((t) => [
      t.name,
      t.phase,
      t.basePhaseCode || "01",
      String(t.startDaysFromBase || 0),
      String(t.endDaysFromBase || 0),
      t.deadlineDescription,
      t.details,
      t.ownerMessage,
      t.ownerResources,
      t.ownerSensitivity,
      String(t.sortOrder),
    ]);

    const bom = "﻿";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.name}_テンプレート.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ブランド管理</h1>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          ブランド追加
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ブランド名 *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-48" placeholder="例: ブランドA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm w-64" placeholder="ブランドの説明" />
            </div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">追加</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">キャンセル</button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="cursor-pointer flex-1" onClick={() => handleExpand(brand.id)}>
                <h3 className="font-bold text-gray-800 text-lg">{brand.name}</h3>
                {brand.description && <p className="text-sm text-gray-500 mt-0.5">{brand.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/settings/templates?brand=${brand.id}`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100">
                  テンプレート編集
                </Link>
                {expandedBrand === brand.id && brandTemplates.length > 0 && (
                  <button onClick={() => handleExportCsv(brand, brandTemplates)}
                    className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100">
                    CSV出力
                  </button>
                )}
                <button onClick={() => handleExpand(brand.id)}
                  className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100">
                  {expandedBrand === brand.id ? "閉じる" : "テンプレート一覧"}
                </button>
                <button onClick={() => handleDeleteClick(brand)}
                  className="text-red-400 hover:text-red-600 text-xs px-2">削除</button>
              </div>
            </div>

            {expandedBrand === brand.id && (
              <div className="border-t border-gray-100">
                {brandTemplates.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-2 font-medium text-gray-500">順</th>
                        <th className="text-left px-5 py-2 font-medium text-gray-500">タスク名</th>
                        <th className="text-left px-5 py-2 font-medium text-gray-500">フェーズ</th>
                        <th className="text-left px-5 py-2 font-medium text-gray-500">日数</th>
                        <th className="text-left px-5 py-2 font-medium text-gray-500">公開区分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandTemplates.map((tpl) => (
                        <tr key={tpl.id} className="border-b border-gray-50">
                          <td className="px-5 py-2 text-gray-400">{tpl.sortOrder}</td>
                          <td className="px-5 py-2 font-medium text-gray-800">{tpl.name}</td>
                          <td className="px-5 py-2 text-gray-600">{tpl.phase}</td>
                          <td className="px-5 py-2 text-gray-600 text-xs">{tpl.startDaysFromBase || 0}〜{tpl.endDaysFromBase || 0}日</td>
                          <td className="px-5 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sensitivityColors[tpl.ownerSensitivity || "safe"]}`}>
                              {sensitivityLabels[tpl.ownerSensitivity || "safe"]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-400 py-6 text-sm">テンプレートがまだ登録されていません</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {brands.length === 0 && (
        <p className="text-center text-gray-400 py-12">ブランドがまだ登録されていません</p>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="ブランドを削除"
          message={
            deleteTarget.templateCount > 0
              ? `「${deleteTarget.brand.name}」を削除します。このブランドに紐づくテンプレート ${deleteTarget.templateCount}件 も全て削除されます。この操作は取り消せません。削除するには、ブランド名を入力してください。`
              : `「${deleteTarget.brand.name}」を削除します。削除するには、ブランド名を入力してください。`
          }
          confirmLabel="ブランド名を入力して確認"
          confirmPlaceholder="ブランド名を入力"
          confirmValue={deleteTarget.brand.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
