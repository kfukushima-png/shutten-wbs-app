"use client";

import { useRef, useEffect, useState } from "react";
import { format, addDays, isValid } from "date-fns";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
}

const statusColors: Record<string, string> = {
  not_started: "#9CA3AF",
  in_progress: "#3B82F6",
  done: "#22C55E",
};

function safeDate(d: unknown): Date {
  if (d instanceof Date && isValid(d)) return d;
  if (typeof d === "string" && d) {
    const parsed = new Date(d);
    if (isValid(parsed)) return parsed;
  }
  return new Date();
}

function ensureEndAfterStart(start: string, end: string): string {
  // frappe-ganttはstart === endだと表示できないので、最低1日の差をつける
  if (end <= start) {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return format(d, "yyyy-MM-dd");
  }
  return end;
}

export default function GanttChart({ tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("Week");

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const loadGantt = async () => {
      try {
        const { default: Gantt } = await import("frappe-gantt");
        containerRef.current!.innerHTML = "";
        setError(null);

        const ganttTasks: {
          id: string;
          name: string;
          start: string;
          end: string;
          progress: number;
          custom_class?: string;
        }[] = [];

        tasks.forEach((task, index) => {
          const startDate = safeDate(task.startDate);
          const endDate = safeDate(task.deadline);
          const idealStart = safeDate(task.idealStartDate || task.startDate);
          const idealEnd = safeDate(task.idealEndDate || task.deadline);

          const actualStart = format(startDate, "yyyy-MM-dd");
          const actualEnd = ensureEndAfterStart(actualStart, format(endDate, "yyyy-MM-dd"));
          const idealStartStr = format(idealStart, "yyyy-MM-dd");
          const idealEndStr = ensureEndAfterStart(idealStartStr, format(idealEnd, "yyyy-MM-dd"));

          // 理想と実際が異なる場合、理想バーを表示
          if (idealStartStr !== actualStart || idealEndStr !== actualEnd) {
            ganttTasks.push({
              id: `ideal-${task.id}-${index}`,
              name: `[理想] ${task.name}`,
              start: idealStartStr,
              end: idealEndStr,
              progress: 0,
              custom_class: "gantt-ideal",
            });
          }

          // 実際バー
          ganttTasks.push({
            id: `task-${task.id}-${index}`,
            name: task.taskCode ? `${task.taskCode} ${task.name}` : task.name,
            start: actualStart,
            end: actualEnd,
            progress: task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0,
            custom_class: `gantt-${task.status}`,
          });
        });

        if (ganttTasks.length === 0) return;

        new Gantt(containerRef.current!, ganttTasks, {
          view_mode: viewMode as "Day" | "Week" | "Month",
          language: "ja",
          readonly: true,
        });
      } catch (err) {
        console.error("Gantt error:", err);
        setError("ガントチャートの表示に失敗しました");
      }
    };

    loadGantt();
  }, [tasks, viewMode]);

  if (tasks.length === 0) {
    return <p className="text-gray-400 text-center py-8">タスクがありません</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.not_started }} /> 未着手
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.in_progress }} /> 進行中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.done }} /> 完了
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-dashed border-gray-400 bg-gray-100" /> 理想期間
          </span>
        </div>
        <div className="flex gap-1">
          {["Day", "Week", "Month"].map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {mode === "Day" ? "日" : mode === "Week" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-red-500 text-center py-8">{error}</p>
      ) : (
        <div ref={containerRef} className="overflow-x-auto" />
      )}
      <style jsx global>{`
        .gantt-not_started .bar { fill: ${statusColors.not_started} !important; }
        .gantt-in_progress .bar { fill: ${statusColors.in_progress} !important; }
        .gantt-done .bar { fill: ${statusColors.done} !important; }
        .gantt-ideal .bar { fill: #E5E7EB !important; stroke: #9CA3AF; stroke-width: 1; stroke-dasharray: 4,2; opacity: 0.6; }
        .gantt-ideal .bar-label { fill: #6B7280 !important; font-size: 10px; font-style: italic; }
        .gantt .bar-label { fill: white !important; font-size: 12px; }
        .gantt .grid-header { fill: #F9FAFB; }
        .gantt-container { overflow-x: auto; }
      `}</style>
    </div>
  );
}
