"use client";

import { useState } from "react";
import { updateTask } from "@/lib/firestore";
import type { Task, OwnerSensitivity, sensitivityLabels as labels } from "@/types";

interface Props {
  task: Task;
  onUpdated: () => void;
}

export default function VisibilityToggle({ task, onUpdated }: Props) {
  const [showAlert, setShowAlert] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleToggle = () => {
    if (task.visibleToOwner) {
      updateTask(task.id, { visibleToOwner: false }).then(onUpdated);
      return;
    }

    if (task.ownerSensitivity === "secret") {
      setShowAlert(true);
      setConfirmed(false);
      return;
    }

    if (task.ownerSensitivity === "caution") {
      setShowAlert(true);
      setConfirmed(false);
      return;
    }

    updateTask(task.id, { visibleToOwner: true }).then(onUpdated);
  };

  const handleConfirm = async () => {
    await updateTask(task.id, { visibleToOwner: true });
    setShowAlert(false);
    setConfirmed(false);
    onUpdated();
  };

  const sensitivityConfig: Record<OwnerSensitivity, { title: string; message: string; color: string }> = {
    safe: { title: "", message: "", color: "" },
    caution: {
      title: "確認: オーナーに表示しますか？",
      message: `このタスク「${task.name}」は【要確認】に分類されています。\nオーナーに見せても問題ない内容か確認してください。`,
      color: "border-yellow-400 bg-yellow-50",
    },
    secret: {
      title: "警告: このタスクは【非公開】です",
      message: `このタスク「${task.name}」は【非公開】（オーナーには見せない）に分類されています。\n\n本当にオーナーに表示しますか？\nこの操作を行うと、オーナー画面にこのタスクが表示されます。`,
      color: "border-red-400 bg-red-50",
    },
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          task.visibleToOwner
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-red-100 text-red-600 hover:bg-red-200"
        }`}
      >
        {task.visibleToOwner ? "表示中" : "非表示"}
      </button>

      {showAlert && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAlert(false)}>
          <div
            className={`bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-l-4 ${sensitivityConfig[task.ownerSensitivity].color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              {sensitivityConfig[task.ownerSensitivity].title}
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-line mb-4">
              {sensitivityConfig[task.ownerSensitivity].message}
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">タスク名:</span>
                <span className="font-medium">{task.name}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">フェーズ:</span>
                <span>{task.phase}</span>
              </div>
              {task.ownerMessage && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500 text-xs">オーナー共有文章:</span>
                  <p className="text-gray-700 mt-0.5">{task.ownerMessage}</p>
                </div>
              )}
            </div>

            {task.ownerSensitivity === "secret" && (
              <label className="flex items-center gap-2 text-sm mb-4 text-red-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-red-300"
                />
                内容を確認し、オーナーに表示して問題ないことを確認しました
              </label>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={task.ownerSensitivity === "secret" && !confirmed}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  task.ownerSensitivity === "secret"
                    ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    : "bg-yellow-500 text-white hover:bg-yellow-600"
                }`}
              >
                オーナーに表示する
              </button>
              <button
                onClick={() => setShowAlert(false)}
                className="px-4 py-2.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
