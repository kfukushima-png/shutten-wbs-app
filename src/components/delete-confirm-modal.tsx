"use client";

import { useState } from "react";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  confirmPlaceholder: string;
  confirmValue: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  title,
  message,
  confirmLabel,
  confirmPlaceholder,
  confirmValue,
  onConfirm,
  onCancel,
}: Props) {
  const [input, setInput] = useState("");
  const isMatch = input.trim() === confirmValue.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">{message}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{confirmLabel}</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2">
            <code className="text-sm text-red-600 font-medium">{confirmValue}</code>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={confirmPlaceholder}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!isMatch}
            className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            削除する
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
