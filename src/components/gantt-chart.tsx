"use client";

import { useRef, useEffect } from "react";
import { format } from "date-fns";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
}

const statusColors: Record<string, string> = {
  not_started: "#9CA3AF",
  in_progress: "#3B82F6",
  done: "#22C55E",
};

export default function GanttChart({ tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const loadGantt = async () => {
      const { default: Gantt } = await import("frappe-gantt");
      containerRef.current!.innerHTML = "";

      const ganttTasks: {
        id: string;
        name: string;
        start: string;
        end: string;
        progress: number;
        custom_class?: string;
        dependencies?: string;
      }[] = [];

      tasks.forEach((task) => {
        const idealStart = format(task.idealStartDate || task.startDate, "yyyy-MM-dd");
        const idealEnd = format(task.idealEndDate || task.deadline, "yyyy-MM-dd");
        const actualStart = format(task.startDate, "yyyy-MM-dd");
        const actualEnd = format(task.deadline, "yyyy-MM-dd");

        // 理想と実際が異なる場合、理想バーを薄く表示
        const hasDeviation = idealStart !== actualStart || idealEnd !== actualEnd;

        if (hasDeviation) {
          ganttTasks.push({
            id: `ideal-${task.id}`,
            name: `[理想] ${task.name}`,
            start: idealStart,
            end: idealEnd,
            progress: 0,
            custom_class: "gantt-ideal",
          });
        }

        // 実際バー
        ganttTasks.push({
          id: task.id,
          name: task.name,
          start: actualStart,
          end: actualEnd,
          progress: task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0,
          custom_class: `gantt-${task.status}`,
        });
      });

      new Gantt(containerRef.current!, ganttTasks, {
        view_mode: "Week",
        language: "ja",
        readonly: true,
      });
    };

    loadGantt();
  }, [tasks]);

  if (tasks.length === 0) {
    return <p className="text-gray-400 text-center py-8">タスクがありません</p>;
  }

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-gray-500 flex-wrap">
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
      <div ref={containerRef} className="overflow-x-auto" />
      <style jsx global>{`
        .gantt-not_started .bar { fill: ${statusColors.not_started} !important; }
        .gantt-in_progress .bar { fill: ${statusColors.in_progress} !important; }
        .gantt-done .bar { fill: ${statusColors.done} !important; }
        .gantt-ideal .bar { fill: #E5E7EB !important; stroke: #9CA3AF; stroke-width: 1; stroke-dasharray: 4,2; opacity: 0.6; }
        .gantt-ideal .bar-label { fill: #6B7280 !important; font-size: 10px; font-style: italic; }
        .gantt .bar-label { fill: white !important; font-size: 12px; }
        .gantt .grid-header { fill: #F9FAFB; }
      `}</style>
    </div>
  );
}
