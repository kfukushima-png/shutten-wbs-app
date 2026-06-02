"use client";

import { useState } from "react";
import { format } from "date-fns";
import StatusBadge from "./status-badge";
import VisibilityToggle from "./visibility-toggle";
import { updateTaskStatus, updateTask, deleteTask } from "@/lib/firestore";
import type { Task, TaskStatus, UserRole, OwnerSensitivity } from "@/types";
import { sensitivityLabels, sensitivityColors } from "@/types";

interface Props {
  tasks: Task[];
  viewerRole: UserRole;
  onRefresh: () => void;
}

export default function TaskTable({ tasks, viewerRole, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeadline, setEditDeadline] = useState("");
  const canEdit = viewerRole === "admin" || viewerRole === "pm";
  const [filter, setFilter] = useState<string>("all");

  const phases = [...new Set(tasks.map((t) => t.phase))];
  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.phase === filter);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, newStatus);
    onRefresh();
  };

  const handleDeadlineSave = async (taskId: string) => {
    if (editDeadline) {
      await updateTask(taskId, { deadline: new Date(editDeadline) });
      setEditingId(null);
      onRefresh();
    }
  };

  const handleDelete = async (taskId: string) => {
    if (confirm("このタスクを削除しますか？")) {
      await deleteTask(taskId);
      onRefresh();
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          全て
        </button>
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => setFilter(phase)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === phase ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {phase}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-4 font-medium text-gray-500">タスク名</th>
              <th className="pb-3 pr-4 font-medium text-gray-500">フェーズ</th>
              <th className="pb-3 pr-4 font-medium text-gray-500">期限</th>
              <th className="pb-3 pr-4 font-medium text-gray-500">担当者</th>
              <th className="pb-3 pr-4 font-medium text-gray-500">ステータス</th>
              {canEdit && <th className="pb-3 pr-4 font-medium text-gray-500">機密区分</th>}
              {canEdit && <th className="pb-3 pr-4 font-medium text-gray-500">オーナー表示</th>}
              {canEdit && <th className="pb-3 font-medium text-gray-500">操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const overdue = task.status !== "done" && task.deadline < new Date();
              const sensitivity = task.ownerSensitivity || "safe";
              return (
                <tr key={task.id} className={`border-b border-gray-100 ${overdue ? "bg-red-50" : ""}`}>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800">{task.name}</div>
                    {task.details && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.details}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{task.phase}</td>
                  <td className="py-3 pr-4">
                    {editingId === task.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => handleDeadlineSave(task.id)} className="text-blue-600 text-xs">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs">取消</button>
                      </div>
                    ) : (
                      <span
                        className={`${overdue ? "text-red-600 font-medium" : "text-gray-600"} ${canEdit ? "cursor-pointer hover:underline" : ""}`}
                        onClick={() => {
                          if (canEdit) {
                            setEditingId(task.id);
                            setEditDeadline(format(task.deadline, "yyyy-MM-dd"));
                          }
                        }}
                      >
                        {format(task.deadline, "yyyy/MM/dd")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{task.assigneeName}</td>
                  <td className="py-3 pr-4">
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      >
                        <option value="not_started">未着手</option>
                        <option value="in_progress">進行中</option>
                        <option value="done">完了</option>
                      </select>
                    ) : (
                      <StatusBadge status={task.status} />
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-3 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sensitivityColors[sensitivity]}`}>
                        {sensitivityLabels[sensitivity]}
                      </span>
                    </td>
                  )}
                  {canEdit && (
                    <td className="py-3 pr-4">
                      <VisibilityToggle task={task} onUpdated={onRefresh} />
                    </td>
                  )}
                  {canEdit && (
                    <td className="py-3">
                      <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 text-xs">
                        削除
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">タスクがありません</p>
        )}
      </div>
    </div>
  );
}
