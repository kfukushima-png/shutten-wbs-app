"use client";

import { useState } from "react";
import { createTask } from "@/lib/firestore";
import type { OwnerSensitivity } from "@/types";

interface Props {
  storeId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddTaskModal({ storeId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: "",
    phase: "",
    deadline: "",
    deadlineDescription: "",
    assigneeName: "",
    details: "",
    ownerMessage: "",
    ownerResources: "",
    visibleToOwner: true,
    ownerSensitivity: "safe" as OwnerSensitivity,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dl = new Date(form.deadline);
    await createTask({
      storeId,
      templateId: null,
      name: form.name,
      phase: form.phase,
      basePhaseCode: "",
      idealDeadline: dl,
      deadline: dl,
      deadlineDescription: form.deadlineDescription,
      assigneeId: "",
      assigneeName: form.assigneeName,
      details: form.details,
      ownerMessage: form.ownerMessage,
      ownerResources: form.ownerResources,
      status: "not_started",
      visibleToOwner: form.ownerSensitivity === "safe" ? form.visibleToOwner : false,
      ownerSensitivity: form.ownerSensitivity,
      dependsOnPhase: "",
      isManual: true,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">タスク追加</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タスク名 *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フェーズ *</label>
              <input required value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限 *</label>
              <input type="date" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期限設定の説明</label>
            <input value={form.deadlineDescription} onChange={(e) => setForm({ ...form, deadlineDescription: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: 契約日から30日以内" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
            <input value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
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
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="URL or マニュアル名" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">オーナー公開区分 *</label>
            <div className="flex gap-2">
              {(["safe", "caution", "secret"] as OwnerSensitivity[]).map((level) => {
                const config = {
                  safe: { label: "公開OK", desc: "オーナーに見せて問題ない", color: "border-green-400 bg-green-50 text-green-800" },
                  caution: { label: "要確認", desc: "内容次第で注意が必要", color: "border-yellow-400 bg-yellow-50 text-yellow-800" },
                  secret: { label: "非公開", desc: "オーナーには見せない", color: "border-red-400 bg-red-50 text-red-800" },
                }[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm({ ...form, ownerSensitivity: level })}
                    className={`flex-1 border-2 rounded-lg p-2 text-center transition-all ${
                      form.ownerSensitivity === level ? config.color : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    <div className="text-sm font-medium">{config.label}</div>
                    <div className="text-xs mt-0.5 opacity-75">{config.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {form.ownerSensitivity === "safe" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.visibleToOwner}
                onChange={(e) => setForm({ ...form, visibleToOwner: e.target.checked })} className="rounded" />
              オーナーに即時表示する
            </label>
          )}

          {form.ownerSensitivity !== "safe" && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              {form.ownerSensitivity === "caution"
                ? "要確認タスクはデフォルトで非表示です。後からPM画面で確認の上、表示に切り替えできます。"
                : "非公開タスクはデフォルトで非表示です。表示切替時には警告+チェック確認が必須になります。"}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
              追加
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
