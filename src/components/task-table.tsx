"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import StatusBadge from "./status-badge";
import VisibilityToggle from "./visibility-toggle";
import TaskComments from "./task-comments";
import { updateTaskStatus, updateTask, deleteTask, getCommentCountsByStore } from "@/lib/firestore";
import type { Task, TaskStatus, UserRole } from "@/types";
import { sensitivityLabels, sensitivityColors } from "@/types";

interface Props {
  tasks: Task[];
  viewerRole: UserRole;
  storeId?: string;
  onRefresh: () => void;
}

export default function TaskTable({ tasks, viewerRole, storeId, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeadline, setEditDeadline] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const canEdit = viewerRole === "admin" || viewerRole === "pm";
  const [filter, setFilter] = useState<string>("all");

  const phases = [...new Set(tasks.map((t) => t.phase))];
  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.phase === filter);

  // コメント数を取得
  useEffect(() => {
    if (storeId) {
      getCommentCountsByStore(storeId).then(setCommentCounts);
    }
  }, [storeId, tasks]);

  // タスク依存チェック: 前フェーズが未完了ならブロック中
  const isBlocked = (task: Task): boolean => {
    if (!task.dependsOnPhase) return false;
    const depPhaseTasks = tasks.filter((t) => t.phase === task.dependsOnPhase);
    if (depPhaseTasks.length === 0) return false;
    return depPhaseTasks.some((t) => t.status !== "done");
  };

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
              <th className="pb-3 pr-4 font-medium text-gray-500">メモ</th>
              {canEdit && <th className="pb-3 font-medium text-gray-500">操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const overdue = task.status !== "done" && task.deadline < new Date();
              const blocked = isBlocked(task);
              const sensitivity = task.ownerSensitivity || "safe";
              const commentCount = commentCounts[task.id] || 0;
              const isExpanded = expandedTaskId === task.id;

              return (
                <tr key={task.id} className="group">
                  <td colSpan={canEdit ? 9 : 7} className="p-0">
                    <div className={`border-b border-gray-100 ${overdue ? "bg-red-50" : ""} ${blocked ? "bg-orange-50/50" : ""}`}>
                      <div className="flex items-center py-3">
                        {/* タスク名 */}
                        <div className="pr-4 flex-1 min-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-800">{task.name}</span>
                            {blocked && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded font-medium">
                                ブロック中
                              </span>
                            )}
                          </div>
                          {task.details && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.details}</div>}
                          {/* 依存関係: PM以上は編集可能、オーナーは表示のみ */}
                          {canEdit ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-400">前提:</span>
                              <select
                                value={task.dependsOnPhase || ""}
                                onChange={async (e) => {
                                  await updateTask(task.id, { dependsOnPhase: e.target.value });
                                  onRefresh();
                                }}
                                className="text-[10px] border rounded px-1 py-0.5 bg-white text-gray-600 max-w-[120px]"
                              >
                                <option value="">なし</option>
                                {phases.filter((p) => p !== task.phase).map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            blocked && task.dependsOnPhase && (
                              <div className="text-[10px] text-orange-500 mt-0.5">
                                前提: 「{task.dependsOnPhase}」フェーズの完了待ち
                              </div>
                            )
                          )}
                        </div>
                        {/* フェーズ */}
                        <div className="pr-4 text-gray-600 w-24 shrink-0">{task.phase}</div>
                        {/* 期限 */}
                        <div className="pr-4 w-28 shrink-0">
                          {editingId === task.id ? (
                            <div className="flex items-center gap-1">
                              <input type="date" value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                className="border rounded px-2 py-1 text-sm w-32" />
                              <button onClick={() => handleDeadlineSave(task.id)} className="text-blue-600 text-xs">保存</button>
                              <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs">取消</button>
                            </div>
                          ) : (
                            <span
                              className={`${overdue ? "text-red-600 font-medium" : "text-gray-600"} ${canEdit ? "cursor-pointer hover:underline" : ""}`}
                              onClick={() => { if (canEdit) { setEditingId(task.id); setEditDeadline(format(task.deadline, "yyyy-MM-dd")); } }}
                            >
                              {format(task.deadline, "yyyy/MM/dd")}
                            </span>
                          )}
                        </div>
                        {/* 担当者 */}
                        <div className="pr-4 text-gray-600 w-20 shrink-0">{task.assigneeName}</div>
                        {/* ステータス */}
                        <div className="pr-4 w-24 shrink-0">
                          {canEdit ? (
                            <select value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="border rounded px-2 py-1 text-sm bg-white w-full">
                              <option value="not_started">未着手</option>
                              <option value="in_progress">進行中</option>
                              <option value="done">完了</option>
                            </select>
                          ) : (
                            <StatusBadge status={task.status} />
                          )}
                        </div>
                        {/* 機密区分 */}
                        {canEdit && (
                          <div className="pr-4 w-20 shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${sensitivityColors[sensitivity]}`}>
                              {sensitivityLabels[sensitivity]}
                            </span>
                          </div>
                        )}
                        {/* オーナー表示 */}
                        {canEdit && (
                          <div className="pr-4 w-20 shrink-0">
                            <VisibilityToggle task={task} onUpdated={onRefresh} />
                          </div>
                        )}
                        {/* コメント */}
                        <div className="pr-4 w-16 shrink-0">
                          <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                              isExpanded ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-blue-600 hover:bg-gray-100"
                            }`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {commentCount > 0 && <span>{commentCount}</span>}
                          </button>
                        </div>
                        {/* 操作 */}
                        {canEdit && (
                          <div className="w-12 shrink-0">
                            <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                          </div>
                        )}
                      </div>
                      {/* コメント展開 */}
                      {isExpanded && storeId && (
                        <div className="px-4 pb-3 border-t border-gray-100 bg-gray-50/50">
                          <TaskComments
                            taskId={task.id}
                            storeId={storeId}
                            onCommentAdded={() => {
                              if (storeId) getCommentCountsByStore(storeId).then(setCommentCounts);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
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
