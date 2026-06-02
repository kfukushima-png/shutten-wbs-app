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
  selectedTaskIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  showCheckboxes?: boolean;
}

export default function TaskTable({ tasks, viewerRole, storeId, onRefresh, selectedTaskIds, onToggleSelect, showCheckboxes }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"startDate" | "deadline">("deadline");
  const [editDate, setEditDate] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const canEdit = viewerRole === "admin" || viewerRole === "pm";
  const [filter, setFilter] = useState<string>("all");

  const phases = [...new Set(tasks.map((t) => t.phase))];
  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.phase === filter);

  useEffect(() => {
    if (storeId) {
      getCommentCountsByStore(storeId).then(setCommentCounts);
    }
  }, [storeId, tasks]);

  // タスク依存チェック
  const isBlocked = (task: Task): boolean => {
    if (!task.dependsOn) return false;
    const depCodes = task.dependsOn.split("/").map((s) => s.trim()).filter(Boolean);
    return depCodes.some((code) => {
      const depTask = tasks.find((t) => t.taskCode === code);
      return depTask && depTask.status !== "done";
    });
  };

  const getBlockedByNames = (task: Task): string[] => {
    if (!task.dependsOn) return [];
    return task.dependsOn.split("/").map((s) => s.trim()).filter(Boolean)
      .filter((code) => {
        const depTask = tasks.find((t) => t.taskCode === code);
        return depTask && depTask.status !== "done";
      })
      .map((code) => {
        const depTask = tasks.find((t) => t.taskCode === code);
        return depTask ? `${depTask.taskCode} ${depTask.name}` : code;
      });
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, newStatus);
    onRefresh();
  };

  const handleDateSave = async (taskId: string) => {
    if (editDate) {
      await updateTask(taskId, { [editField]: new Date(editDate) } as Partial<Task>);
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
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          全て
        </button>
        {phases.map((phase) => (
          <button key={phase} onClick={() => setFilter(phase)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === phase ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {phase}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              {showCheckboxes && <th className="pb-3 pr-2 w-8"></th>}
              <th className="pb-3 pr-4 font-medium text-gray-500">タスク</th>
              <th className="pb-3 pr-4 font-medium text-gray-500 w-24">フェーズ</th>
              <th className="pb-3 pr-4 font-medium text-gray-500 w-24">開始日</th>
              <th className="pb-3 pr-4 font-medium text-gray-500 w-24">期限</th>
              <th className="pb-3 pr-4 font-medium text-gray-500 w-20">担当者</th>
              <th className="pb-3 pr-4 font-medium text-gray-500 w-24">ステータス</th>
              {canEdit && <th className="pb-3 pr-4 font-medium text-gray-500 w-16">公開</th>}
              {canEdit && <th className="pb-3 font-medium text-gray-500 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const overdue = task.status !== "done" && task.deadline < new Date();
              const blocked = isBlocked(task);
              const isExpanded = expandedTaskId === task.id;
              const commentCount = commentCounts[task.id] || 0;

              return (
                <tr key={task.id} className={`border-b border-gray-100 ${overdue ? "bg-red-50" : ""} ${blocked ? "bg-orange-50/30" : ""}`}>
                  <td colSpan={canEdit ? 9 : 7} className="p-0">
                    {/* メイン行 */}
                    <div className="flex items-center py-2.5 px-1">
                      {showCheckboxes && (
                        <div className="pr-2 w-8 shrink-0">
                          <input type="checkbox"
                            checked={selectedTaskIds?.has(task.id) || false}
                            onChange={() => onToggleSelect?.(task.id)}
                            className="rounded" />
                        </div>
                      )}
                      {/* タスク名 */}
                      <div className="pr-4 flex-1 min-w-[160px] cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                        <div className="flex items-center gap-1.5">
                          <svg className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {task.taskCode && (
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded shrink-0">{task.taskCode}</span>
                          )}
                          <span className="font-medium text-gray-800 truncate">{task.name}</span>
                          {blocked && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 text-[9px] rounded font-medium shrink-0">ブロック</span>}
                          {commentCount > 0 && <span className="text-[10px] text-blue-500 shrink-0">💬{commentCount}</span>}
                        </div>
                      </div>
                      {/* フェーズ */}
                      <div className="pr-4 text-gray-600 w-24 shrink-0 text-xs">{task.phase}</div>
                      {/* 開始日 */}
                      <div className="pr-4 w-24 shrink-0">
                        {editingId === task.id && editField === "startDate" ? (
                          <div className="flex items-center gap-1">
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                              className="border rounded px-1 py-0.5 text-xs w-28" />
                            <button onClick={() => handleDateSave(task.id)} className="text-blue-600 text-[10px]">保存</button>
                          </div>
                        ) : (
                          <span className={`text-xs ${canEdit ? "cursor-pointer hover:underline" : ""} text-gray-500`}
                            onClick={() => { if (canEdit) { setEditingId(task.id); setEditField("startDate"); setEditDate(format(task.startDate, "yyyy-MM-dd")); } }}>
                            {format(task.startDate, "MM/dd")}
                          </span>
                        )}
                      </div>
                      {/* 期限 */}
                      <div className="pr-4 w-24 shrink-0">
                        {editingId === task.id && editField === "deadline" ? (
                          <div className="flex items-center gap-1">
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                              className="border rounded px-1 py-0.5 text-xs w-28" />
                            <button onClick={() => handleDateSave(task.id)} className="text-blue-600 text-[10px]">保存</button>
                          </div>
                        ) : (
                          <span className={`text-xs ${overdue ? "text-red-600 font-bold" : "text-gray-700"} ${canEdit ? "cursor-pointer hover:underline" : ""}`}
                            onClick={() => { if (canEdit) { setEditingId(task.id); setEditField("deadline"); setEditDate(format(task.deadline, "yyyy-MM-dd")); } }}>
                            {format(task.deadline, "MM/dd")}
                          </span>
                        )}
                      </div>
                      {/* 担当者 */}
                      <div className="pr-4 text-gray-600 w-20 shrink-0 text-xs truncate">{task.assigneeName}</div>
                      {/* ステータス */}
                      <div className="pr-4 w-24 shrink-0">
                        {canEdit ? (
                          <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="border rounded px-1 py-0.5 text-xs bg-white w-full">
                            <option value="not_started">未着手</option>
                            <option value="in_progress">進行中</option>
                            <option value="done">完了</option>
                          </select>
                        ) : (
                          <StatusBadge status={task.status} />
                        )}
                      </div>
                      {/* オーナー表示 */}
                      {canEdit && (
                        <div className="pr-4 w-16 shrink-0">
                          <VisibilityToggle task={task} onUpdated={onRefresh} />
                        </div>
                      )}
                      {/* 削除 */}
                      {canEdit && (
                        <div className="w-10 shrink-0">
                          <button onClick={() => handleDelete(task.id)} className="text-gray-300 hover:text-red-500 text-xs">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 展開エリア */}
                    {isExpanded && (
                      <div className="px-8 pb-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-sm">
                          {/* 左カラム: 詳細情報 */}
                          <div className="space-y-2">
                            {task.details && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">詳細・意図</span>
                                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{task.details}</p>
                              </div>
                            )}
                            {task.ownerResources && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">共有資料・URL</span>
                                <p className="text-sm text-blue-600 mt-0.5 break-all">
                                  <a href={task.ownerResources.startsWith("http") ? task.ownerResources : `https://${task.ownerResources}`}
                                    target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {task.ownerResources}
                                  </a>
                                </p>
                              </div>
                            )}
                            {canEdit && task.ownerMessage && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">PM用メモ</span>
                                <p className="text-sm text-gray-600 mt-0.5 bg-yellow-50 rounded px-2 py-1">{task.ownerMessage}</p>
                              </div>
                            )}
                            {task.dependsOn && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">前提タスク</span>
                                <p className="text-sm mt-0.5">
                                  {blocked ? (
                                    <span className="text-orange-600">{getBlockedByNames(task).join(", ")} の完了待ち</span>
                                  ) : (
                                    <span className="text-green-600">{task.dependsOn}（完了済み）</span>
                                  )}
                                </p>
                              </div>
                            )}
                            {canEdit && (
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>機密: <span className={`px-1.5 py-0.5 rounded-full font-medium ${sensitivityColors[task.ownerSensitivity || "safe"]}`}>{sensitivityLabels[task.ownerSensitivity || "safe"]}</span></span>
                                {task.basePhaseCode && <span>基準: {task.basePhaseCode}</span>}
                                <span>理想: {format(task.idealStartDate, "MM/dd")}〜{format(task.idealEndDate, "MM/dd")}</span>
                              </div>
                            )}
                          </div>
                          {/* 右カラム: コメント */}
                          <div>
                            {storeId && (
                              <TaskComments taskId={task.id} storeId={storeId}
                                onCommentAdded={() => { if (storeId) getCommentCountsByStore(storeId).then(setCommentCounts); }} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
