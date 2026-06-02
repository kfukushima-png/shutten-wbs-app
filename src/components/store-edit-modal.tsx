"use client";

import { useState } from "react";
import { updateStore, updateStorePhaseDate } from "@/lib/firestore";
import { PHASE_DEFINITIONS } from "@/types";
import type { Store } from "@/types";

interface Props {
  store: Store;
  onClose: () => void;
  onUpdated: () => void;
}

export default function StoreEditModal({ store, onClose, onUpdated }: Props) {
  const [name, setName] = useState(store.name);
  const [ownerName, setOwnerName] = useState(store.ownerName);
  const [phaseDates, setPhaseDates] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(store.phaseDates || {}).map(([k, v]) => [k, v.date || ""])
    )
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // 店舗名・オーナー名を更新
    await updateStore(store.id, { name, ownerName } as Partial<Store>);

    // 変更されたフェーズ日付を更新
    for (const [code, date] of Object.entries(phaseDates)) {
      const original = store.phaseDates?.[code]?.date || "";
      if (date !== original && date) {
        await updateStorePhaseDate(store.id, code, date);
      }
    }

    setSaving(false);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">店舗情報の編集</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">店舗名</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">オーナー名</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">フェーズ基準日</label>
            <div className="space-y-2">
              {PHASE_DEFINITIONS.map((pd) => (
                <div key={pd.code} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono w-6">{pd.code}</span>
                  <span className="text-sm text-gray-700 w-32 shrink-0">{pd.dateLabel}</span>
                  <input
                    type="date"
                    value={phaseDates[pd.code] || ""}
                    onChange={(e) => setPhaseDates({ ...phaseDates, [pd.code]: e.target.value })}
                    className="border rounded-lg px-3 py-1.5 text-sm flex-1"
                  />
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    pd.dateType === "auto" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                  }`}>
                    {pd.dateType === "auto" ? "自動" : "手入力"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              基準日を変更すると、紐づくタスクの理想期限が自動再計算されます
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
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
