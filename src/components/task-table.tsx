"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import StatusBadge from "./status-badge";
import VisibilityToggle from "./visibility-toggle";
import TaskComments from "./task-comments";
import EditTaskModal from "./edit-task-modal";
import { updateTaskStatus, updateTask, deleteTask, getCommentCountsByStore, updateTaskSortOrders } from "@/lib/firestore";
import type { Task, TaskStatus, UserRole } from "@/types";
import { sensitivityLabels, sensitivityColors, PHASE_COLORS, PHASE_BG_COLORS } from "@/types";

interface Props {
  tasks: Task[];
  viewerRole: UserRole;
  storeId?: string;
  onRefresh: () => void;
  ganttSelectedIds?: Set<string>;
  onToggleGantt?: (taskId: string) => void;
}

interface TaskRowProps {
  task: Task;
  canEdit: boolean;
  overdue: boolean;
  blocked: boolean;
  isExpanded: boolean;
  commentCount: number;
  ganttSelectedIds?: Set<string>;
  isDraggable: boolean;
  editingId: string | null;
  editField: "startDate" | "deadline";
  editDate: string;
  storeId?: string;
  onToggleGantt?: (taskId: string) => void;
  onToggleExpand: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onStartEdit: (taskId: string, field: "startDate" | "deadline", date: string) => void;
  onDateSave: (taskId: string) => void;
  onEditDateChange: (date: string) => void;
  onDelete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onRefresh: () => void;
  onCommentAdded: () => void;
  getBlockedByNames: (task: Task) => string[];
}

function SortableTaskRow(props: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id, disabled: !props.isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : "auto" as const,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 ${props.overdue ? "bg-red-50" : ""} ${props.blocked ? "bg-orange-50/30" : ""} ${isDragging ? "shadow-lg" : ""}`}
    >
      <TaskRowContent {...props} dragListeners={listeners} dragAttributes={attributes} />
    </tr>
  );
}

function TaskRowContent({
  task, canEdit, overdue, blocked, isExpanded, commentCount,
  ganttSelectedIds, isDraggable,
  editingId, editField, editDate, storeId,
  onToggleGantt, onToggleExpand, onStatusChange,
  onStartEdit, onDateSave, onEditDateChange, onDelete, onEditTask,
  onRefresh, onCommentAdded, getBlockedByNames,
  dragListeners, dragAttributes,
}: TaskRowProps & { dragListeners?: ReturnType<typeof useSortable>["listeners"]; dragAttributes?: ReturnType<typeof useSortable>["attributes"] }) {
  return (
    <td colSpan={canEdit ? 10 : 7} className="p-0">
      <div className={`flex items-center py-2.5 px-1 border-l-4 ${PHASE_COLORS[task.phase] || "border-l-gray-200"}`}>
        {/* ドラッグハンドル */}
        {isDraggable && (
          <div
            className="pr-1 w-6 shrink-0 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center text-gray-300 hover:text-gray-500"
            {...dragListeners}
            {...dragAttributes}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>
        )}
        {/* ガント表示トグル */}
        {onToggleGantt && (
          <div className="pr-1 w-7 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleGantt(task.id); }}
              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${
                ganttSelectedIds?.has(task.id)
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-300 hover:text-gray-500"
              }`}
              title={ganttSelectedIds?.has(task.id) ? "ガントから除外" : "ガントに表示"}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="7" height="4" rx="1" fill={ganttSelectedIds?.has(task.id) ? "currentColor" : "none"} />
                <rect x="6" y="10" width="12" height="4" rx="1" fill={ganttSelectedIds?.has(task.id) ? "currentColor" : "none"} />
                <rect x="4" y="16" width="9" height="4" rx="1" fill={ganttSelectedIds?.has(task.id) ? "currentColor" : "none"} />
              </svg>
            </button>
          </div>
        )}
        {/* タスク名 */}
        <div className="pr-4 flex-1 min-w-[160px] cursor-pointer" onClick={onToggleExpand}>
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
            {task.calendarEventId && <span className="text-[10px] text-green-500 shrink-0" title="カレンダー登録済み">📅</span>}
            {commentCount > 0 && <span className="text-[10px] text-blue-500 shrink-0">💬{commentCount}</span>}
          </div>
        </div>
        {/* フェーズ */}
        <div className="pr-4 text-gray-600 w-24 shrink-0 text-xs">{task.phase}</div>
        {/* 開始日 */}
        <div className="pr-4 w-24 shrink-0">
          {editingId === task.id && editField === "startDate" ? (
            <div className="flex items-center gap-1">
              <input type="date" value={editDate} onChange={(e) => onEditDateChange(e.target.value)}
                className="border rounded px-1 py-0.5 text-xs w-28" />
              <button onClick={() => onDateSave(task.id)} className="text-blue-600 text-[10px]">保存</button>
            </div>
          ) : (
            <span className={`text-xs ${canEdit ? "cursor-pointer hover:underline" : ""} text-gray-500`}
              onClick={() => { if (canEdit) onStartEdit(task.id, "startDate", format(task.startDate, "yyyy-MM-dd")); }}>
              {format(task.startDate, "MM/dd")}
            </span>
          )}
        </div>
        {/* 期限 */}
        <div className="pr-4 w-24 shrink-0">
          {editingId === task.id && editField === "deadline" ? (
            <div className="flex items-center gap-1">
              <input type="date" value={editDate} onChange={(e) => onEditDateChange(e.target.value)}
                className="border rounded px-1 py-0.5 text-xs w-28" />
              <button onClick={() => onDateSave(task.id)} className="text-blue-600 text-[10px]">保存</button>
            </div>
          ) : (
            <span className={`text-xs ${overdue ? "text-red-600 font-bold" : "text-gray-700"} ${canEdit ? "cursor-pointer hover:underline" : ""}`}
              onClick={() => { if (canEdit) onStartEdit(task.id, "deadline", format(task.deadline, "yyyy-MM-dd")); }}>
              {format(task.deadline, "MM/dd")}
            </span>
          )}
        </div>
        {/* 担当者 */}
        <div className="pr-4 text-gray-600 w-20 shrink-0 text-xs truncate">{task.assigneeName}</div>
        {/* ステータス */}
        <div className="pr-4 w-24 shrink-0">
          {canEdit ? (
            <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
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
            <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-500 text-xs">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>機密: <span className={`px-1.5 py-0.5 rounded-full font-medium ${sensitivityColors[task.ownerSensitivity || "safe"]}`}>{sensitivityLabels[task.ownerSensitivity || "safe"]}</span></span>
                    {task.basePhaseCode && <span>基準: {task.basePhaseCode}</span>}
                    <span>理想: {format(task.idealStartDate, "MM/dd")}〜{format(task.idealEndDate, "MM/dd")}</span>
                  </div>
                  <button onClick={() => onEditTask(task)}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100">
                    編集
                  </button>
                </div>
              )}
            </div>
            <div>
              {storeId && (
                <TaskComments taskId={task.id} storeId={storeId}
                  onCommentAdded={onCommentAdded} />
              )}
            </div>
          </div>
        </div>
      )}
    </td>
  );
}

export default function TaskTable({ tasks, viewerRole, storeId, onRefresh, ganttSelectedIds, onToggleGantt }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"startDate" | "deadline">("deadline");
  const [editDate, setEditDate] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);
  const canEdit = viewerRole === "admin" || viewerRole === "pm";
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const sorted = [...tasks].sort((a, b) => {
      const aOrder = a.sortOrder ?? Infinity;
      const bOrder = b.sortOrder ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return 0;
    });
    setOrderedTasks(sorted);
  }, [tasks]);

  const phases = [...new Set(orderedTasks.map((t) => t.phase))];
  const filtered = filter === "all" ? orderedTasks : orderedTasks.filter((t) => t.phase === filter);
  const isDraggable = canEdit && filter === "all";

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 300, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  useEffect(() => {
    if (storeId) {
      getCommentCountsByStore(storeId).then(setCommentCounts);
    }
  }, [storeId, tasks]);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedTasks.findIndex((t) => t.id === active.id);
    const newIndex = orderedTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...orderedTasks];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    setOrderedTasks(newOrder);

    await updateTaskSortOrders(newOrder.map((t) => t.id));
  };

  const refreshCommentCounts = () => {
    if (storeId) getCommentCountsByStore(storeId).then(setCommentCounts);
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
              filter === phase ? "bg-blue-600 text-white" : PHASE_BG_COLORS[phase] || "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {phase}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                {isDraggable && <th className="pb-3 w-6"></th>}
                {onToggleGantt && <th className="pb-3 w-7"></th>}
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
            <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {filtered.map((task) => {
                  const overdue = task.status !== "done" && task.deadline < new Date();
                  const blocked = isBlocked(task);
                  const isExpanded = expandedTaskId === task.id;
                  const commentCount = commentCounts[task.id] || 0;

                  return (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      canEdit={canEdit}
                      overdue={overdue}
                      blocked={blocked}
                      isExpanded={isExpanded}
                      commentCount={commentCount}
                      ganttSelectedIds={ganttSelectedIds}
                      isDraggable={isDraggable}
                      editingId={editingId}
                      editField={editField}
                      editDate={editDate}
                      storeId={storeId}
                      onToggleGantt={onToggleGantt}
                      onToggleExpand={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      onStatusChange={handleStatusChange}
                      onStartEdit={(id, field, date) => { setEditingId(id); setEditField(field); setEditDate(date); }}
                      onDateSave={handleDateSave}
                      onEditDateChange={setEditDate}
                      onDelete={handleDelete}
                      onEditTask={setEditingTask}
                      onRefresh={onRefresh}
                      onCommentAdded={refreshCommentCounts}
                      getBlockedByNames={getBlockedByNames}
                    />
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">タスクがありません</p>
        )}
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onUpdated={onRefresh} />
      )}
    </div>
  );
}
