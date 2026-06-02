"use client";

import { useEffect, useRef } from "react";
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

      const ganttTasks = tasks.map((task) => {
        const start = new Date(task.deadline);
        start.setDate(start.getDate() - 7);
        return {
          id: task.id,
          name: task.name,
          start: format(start, "yyyy-MM-dd"),
          end: format(task.deadline, "yyyy-MM-dd"),
          progress: task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0,
          custom_class: `gantt-${task.status}`,
        };
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
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.not_started }} /> 未着手
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.in_progress }} /> 進行中
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: statusColors.done }} /> 完了
        </span>
      </div>
      <div ref={containerRef} className="overflow-x-auto" />
      <style jsx global>{`
        .gantt-not_started .bar { fill: ${statusColors.not_started} !important; }
        .gantt-in_progress .bar { fill: ${statusColors.in_progress} !important; }
        .gantt-done .bar { fill: ${statusColors.done} !important; }
        .gantt .bar-label { fill: white !important; font-size: 12px; }
        .gantt .grid-header { fill: #F9FAFB; }
      `}</style>
    </div>
  );
}
