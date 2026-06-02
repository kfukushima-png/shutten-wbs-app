"use client";

import { useState } from "react";
import { format } from "date-fns";
import { updateTask } from "@/lib/firestore";
import type { Task, OwnerSensitivity } from "@/types";
import { PHASE_DEFINITIONS } from "@/types";

interface Props {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
}

const phaseOptions = PHASE_DEFINITIONS.map((p) => p.dateLabel);

export default function EditTaskModal({ task, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    taskCode: task.taskCode || "",
    name: task.name,
    phase: task.phase,
    startDate: format(task.startDate, "yyyy-MM-dd"),
    deadline: format(task.deadline, "yyyy-MM-dd"),
    dependsOn: task.dependsOn || "",
    deadlineDescription: task.deadlineDescription || "",
    assigneeName: task.assigneeName || "",
    details: task.details || "",
    ownerMessage: task.ownerMessage || "",
    ownerResources: task.ownerResources || "",
    ownerSensitivity: task.ownerSensitivity || "safe" as OwnerSensitivity,
  });
  const [saving, setSaving] = useState(false);

  const dateReversed = form.startDate && form.deadline && new Date(form.startDate) > new Date(form.deadline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dateReversed) {
      alert("開始日が完了期限より後になっています。");
      return;
    }
    setSaving(true);
    await updateTask(task.id, {
      taskCode: form.taskCode,
      name: form.name,
      phase: form.phase,
      startDate: new Date(form.startDate),
      deadline: new Date(form.deadline),
      dependsOn: form.dependsOn,
      deadlineDescription: form.deadlineDescription,
      assigneeName: form.assigneeName,
      details: form.details,
      ownerMessage: form.ownerMessage,
      ownerResources: form.ownerResources,
      ownerSensitivity: form.ownerSensitivity,
    });
    setSaving(false);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">タスク編集</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タスクID</label>
              <input value={form.taskCode} onChange={(e) => setForm({ ...form, taskCode: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タスク名 *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">フェーズ *</label>
              <select required value={phaseOptions.includes(form.phase) ? form.phase : "__custom"}
                onChange={(e) => { if (e.target.value !== "__custom") setForm({ ...form, phase: e.target.value }); }}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                {phaseOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                {!phaseOptions.includes(form.phase) && (
                  <option value="__custom">{form.phase}（カスタム）</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">完了期限</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {dateReversed && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs font-medium">
              開始日が完了期限より後になっています。
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
              <input value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">前提タスク</label>
              <input value={form.dependsOn} onChange={(e) => setForm({ ...form, dependsOn: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="例: BE-B-01 / BE-S-01" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期限設定の説明</label>
            <input value={form.deadlineDescription} onChange={(e) => setForm({ ...form, deadlineDescription: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">詳細・意図</label>
            <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PM用メモ</label>
            <textarea value={form.ownerMessage} onChange={(e) => setForm({ ...form, ownerMessage: e.target.value })}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm bg-yellow-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">共有資料・URL</label>
            <input value={form.ownerResources} onChange={(e) => setForm({ ...form, ownerResources: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">オーナー公開区分</label>
            <div className="flex gap-2">
              {(["safe", "caution", "secret"] as OwnerSensitivity[]).map((level) => {
                const config = {
                  safe: { label: "公開OK", color: "border-green-400 bg-green-50 text-green-800" },
                  caution: { label: "要確認", color: "border-yellow-400 bg-yellow-50 text-yellow-800" },
                  secret: { label: "非公開", color: "border-red-400 bg-red-50 text-red-800" },
                }[level];
                return (
                  <button key={level} type="button"
                    onClick={() => setForm({ ...form, ownerSensitivity: level })}
                    className={`flex-1 border-2 rounded-lg p-2 text-center text-sm font-medium transition-all ${
                      form.ownerSensitivity === level ? config.color : "border-gray-200 bg-white text-gray-500"
                    }`}>
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
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
