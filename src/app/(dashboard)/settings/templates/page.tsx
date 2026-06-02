"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRequireRole } from "@/lib/auth-context";
import { getBrands, getTaskTemplatesByBrand, getTaskTemplates, createTaskTemplate, deleteTaskTemplate } from "@/lib/firestore";
import type { TaskTemplate, Brand, OwnerSensitivity } from "@/types";
import { sensitivityLabels, sensitivityColors } from "@/types";

export default function TemplatesPage() {
  const { hasAccess, loading } = useRequireRole(["admin"]);
  const searchParams = useSearchParams();
  const preselectedBrand = searchParams.get("brand");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(preselectedBrand || "");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phase: "",
    defaultDurationDays: 30,
    deadlineDescription: "",
    details: "",
    ownerMessage: "",
    ownerResources: "",
    visibleToOwner: true,
    ownerSensitivity: "safe" as OwnerSensitivity,
    dependsOnPhase: "",
    sortOrder: 0,
  });

  useEffect(() => {
    if (hasAccess) {
      getBrands().then((b) => {
        setBrands(b);
        if (!selectedBrandId && b.length > 0) {
          setSelectedBrandId(preselectedBrand || b[0].id);
        }
      });
    }
  }, [hasAccess]);

  const loadTemplates = async () => {
    if (selectedBrandId) {
      setTemplates(await getTaskTemplatesByBrand(selectedBrandId));
    }
  };

  useEffect(() => {
    if (selectedBrandId) loadTemplates();
  }, [selectedBrandId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTaskTemplate({ ...form, brandId: selectedBrandId });
    setShowAdd(false);
    setForm({ name: "", phase: "", defaultDurationDays: 30, deadlineDescription: "", details: "", ownerMessage: "", ownerResources: "", visibleToOwner: true, ownerSensitivity: "safe", dependsOnPhase: "", sortOrder: templates.length });
    loadTemplates();
  };

  const handleDelete = async (id: string) => {
    if (confirm("このテンプレートを削除しますか？")) {
      await deleteTaskTemplate(id);
      loadTemplates();
    }
  };

  const handleCopyTable = () => {
    const headers = ["タスク名", "フェーズ", "基準日からの日数", "期限設定", "詳細", "オーナー共有文章", "共有資料URL", "公開区分", "表示順"];
    const rows = templates.map((t) => [
      t.name, t.phase, String(t.defaultDurationDays), t.deadlineDescription,
      t.details, t.ownerMessage, t.ownerResources, sensitivityLabels[t.ownerSensitivity || "safe"], String(t.sortOrder),
    ]);
    const tsv = [headers, ...rows].map((r) => r.join("\t")).join("\n");
    navigator.clipboard.writeText(tsv).then(() => alert("スプレッドシートに貼り付けできる形式でコピーしました"));
  };

  const handleExportCsv = () => {
    const headers = ["タスク名", "フェーズ", "基準日からの日数", "期限設定", "詳細", "オーナー共有文章", "共有資料URL", "公開区分", "表示順"];
    const rows = templates.map((t) => [
      t.name, t.phase, String(t.defaultDurationDays), t.deadlineDescription,
      t.details, t.ownerMessage, t.ownerResources, t.ownerSensitivity, String(t.sortOrder),
    ]);
    const bom = "﻿";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const brandName = brands.find((b) => b.id === selectedBrandId)?.name || "テンプレート";
    a.download = `${brandName}_テンプレート.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-gray-500">読み込み中...</div>;
  if (!hasAccess) return <div className="text-red-500">アクセス権限がありません</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">タスクテンプレート管理</h1>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <>
              <button onClick={handleCopyTable}
                className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 font-medium">
                スプシ用コピー
              </button>
              <button onClick={handleExportCsv}
                className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 font-medium">
                CSV出力
              </button>
            </>
          )}
          <button onClick={() => setShowAdd(true)} disabled={!selectedBrandId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
            テンプレート追加
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">ブランド選択</label>
        <div className="flex gap-2 flex-wrap">
          {brands.map((brand) => (
            <button key={brand.id} onClick={() => setSelectedBrandId(brand.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBrandId === brand.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {brand.name}
            </button>
          ))}
        </div>
        {brands.length === 0 && (
          <p className="text-sm text-gray-400 mt-2">
            まずブランドを作成してください → <a href="/settings/brands" className="text-blue-600 hover:underline">ブランド管理</a>
          </p>
        )}
      </div>

      {showAdd && selectedBrandId && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タスク名 *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">フェーズ *</label>
                <input required value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: 契約前準備" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基準日からの日数</label>
                <input type="number" value={form.defaultDurationDays}
                  onChange={(e) => setForm({ ...form, defaultDurationDays: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期限設定の説明</label>
                <input value={form.deadlineDescription}
                  onChange={(e) => setForm({ ...form, deadlineDescription: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: 契約日から30日以内" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳細・意図</label>
              <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">オーナー共有文章</label>
              <textarea value={form.ownerMessage} onChange={(e) => setForm({ ...form, ownerMessage: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">共有資料・URL</label>
              <input value={form.ownerResources} onChange={(e) => setForm({ ...form, ownerResources: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">オーナー公開区分 *</label>
              <div className="flex gap-2">
                {(["safe", "caution", "secret"] as OwnerSensitivity[]).map((level) => {
                  const config = {
                    safe: { label: "公開OK", desc: "見せて問題ない", color: "border-green-400 bg-green-50 text-green-800" },
                    caution: { label: "要確認", desc: "内容次第で注意", color: "border-yellow-400 bg-yellow-50 text-yellow-800" },
                    secret: { label: "非公開", desc: "絶対見せない", color: "border-red-400 bg-red-50 text-red-800" },
                  }[level];
                  return (
                    <button key={level} type="button"
                      onClick={() => setForm({ ...form, ownerSensitivity: level })}
                      className={`flex-1 border-2 rounded-lg p-2 text-center transition-all ${
                        form.ownerSensitivity === level ? config.color : "border-gray-200 bg-white text-gray-500"
                      }`}>
                      <div className="text-sm font-medium">{config.label}</div>
                      <div className="text-xs mt-0.5 opacity-75">{config.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">表示順</label>
              <input type="number" value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })}
                className="border rounded px-2 py-1 text-sm w-20" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">追加</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {selectedBrandId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">順</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">タスク名</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">フェーズ</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">日数</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">期限設定</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">公開区分</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => {
                const sensitivity = tpl.ownerSensitivity || "safe";
                return (
                  <tr key={tpl.id} className="border-b border-gray-100">
                    <td className="px-5 py-3 text-gray-500">{tpl.sortOrder}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{tpl.name}</td>
                    <td className="px-5 py-3 text-gray-600">{tpl.phase}</td>
                    <td className="px-5 py-3 text-gray-600">{tpl.defaultDurationDays}日</td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{tpl.deadlineDescription}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sensitivityColors[sensitivity]}`}>
                        {sensitivityLabels[sensitivity]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(tpl.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {templates.length === 0 && (
            <p className="text-center text-gray-400 py-8">テンプレートがまだ登録されていません</p>
          )}
        </div>
      )}
    </div>
  );
}
