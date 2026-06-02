"use client";

import { useMemo, useRef, useState } from "react";
import { format, differenceInDays, isValid, min, max } from "date-fns";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "#9CA3AF",
  in_progress: "#3B82F6",
  done: "#22C55E",
};

const BAR_HEIGHT = 28;
const ROW_HEIGHT = 38;
const HEADER_HEIGHT = 50;
const LEFT_LABEL_WIDTH = 200;
const MIN_BAR_WIDTH = 6;

function safeDate(d: unknown): Date | null {
  if (d instanceof Date && isValid(d)) return d;
  if (typeof d === "string" && d) {
    const parsed = new Date(d);
    if (isValid(parsed)) return parsed;
  }
  if (d && typeof d === "object" && "toDate" in d && typeof (d as { toDate: () => Date }).toDate === "function") {
    const parsed = (d as { toDate: () => Date }).toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
}

export default function GanttChart({ tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");

  const { chartData, totalWidth, totalHeight, dateLabels, dayWidth, minDate } = useMemo(() => {
    if (tasks.length === 0) return { chartData: [], totalWidth: 0, totalHeight: 0, dateLabels: [], dayWidth: 0, minDate: new Date() };

    // 全タスクの日付範囲を計算
    const allDates: Date[] = [];
    for (const t of tasks) {
      const s = safeDate(t.startDate);
      const e = safeDate(t.deadline);
      if (s) allDates.push(s);
      if (e) allDates.push(e);
    }
    if (allDates.length === 0) return { chartData: [], totalWidth: 0, totalHeight: 0, dateLabels: [], dayWidth: 0, minDate: new Date() };

    const rangeStart = min(allDates);
    const rangeEnd = max(allDates);
    const totalDays = Math.max(differenceInDays(rangeEnd, rangeStart) + 1, 7);

    // パディング
    const paddingDays = Math.max(Math.ceil(totalDays * 0.1), 3);
    const chartStart = new Date(rangeStart);
    chartStart.setDate(chartStart.getDate() - paddingDays);
    const chartEnd = new Date(rangeEnd);
    chartEnd.setDate(chartEnd.getDate() + paddingDays);
    const chartDays = differenceInDays(chartEnd, chartStart) + 1;

    const dw = viewMode === "day" ? 40 : viewMode === "week" ? 20 : 8;
    const tw = LEFT_LABEL_WIDTH + chartDays * dw;
    const th = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 10;

    // 日付ラベル生成
    const labels: { x: number; label: string; isMajor: boolean }[] = [];
    let lastMonth = -1;
    let lastWeek = -1;
    for (let i = 0; i < chartDays; i++) {
      const d = new Date(chartStart);
      d.setDate(d.getDate() + i);
      const x = LEFT_LABEL_WIDTH + i * dw;

      if (viewMode === "day") {
        if (d.getMonth() !== lastMonth) {
          labels.push({ x, label: format(d, "M月"), isMajor: true });
          lastMonth = d.getMonth();
        }
        if (d.getDate() % 5 === 1 || d.getDate() === 1) {
          labels.push({ x, label: format(d, "d"), isMajor: false });
        }
      } else if (viewMode === "week") {
        if (d.getMonth() !== lastMonth) {
          labels.push({ x, label: format(d, "M月"), isMajor: true });
          lastMonth = d.getMonth();
        }
        const week = Math.floor(d.getDate() / 7);
        if (week !== lastWeek && d.getDay() === 1) {
          labels.push({ x, label: format(d, "d"), isMajor: false });
          lastWeek = week;
        }
      } else {
        if (d.getMonth() !== lastMonth && d.getDate() <= 7) {
          labels.push({ x, label: format(d, "M月"), isMajor: true });
          lastMonth = d.getMonth();
        }
      }
    }

    // タスクバーデータ
    const data = tasks.map((task, idx) => {
      const start = safeDate(task.startDate) || chartStart;
      const end = safeDate(task.deadline) || chartStart;
      const startDay = differenceInDays(start, chartStart);
      const endDay = differenceInDays(end, chartStart);
      const barX = LEFT_LABEL_WIDTH + startDay * dw;
      const barWidth = Math.max((endDay - startDay + 1) * dw, MIN_BAR_WIDTH);
      const barY = HEADER_HEIGHT + idx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

      return {
        task,
        barX,
        barY,
        barWidth,
        rowY: HEADER_HEIGHT + idx * ROW_HEIGHT,
        label: task.taskCode ? `${task.taskCode} ${task.name}` : task.name,
        color: STATUS_COLORS[task.status] || STATUS_COLORS.not_started,
      };
    });

    return { chartData: data, totalWidth: tw, totalHeight: th, dateLabels: labels, dayWidth: dw, minDate: chartStart };
  }, [tasks, viewMode]);

  if (tasks.length === 0) {
    return <p className="text-gray-400 text-center py-8">表示するタスクを選択してください</p>;
  }

  // 今日の線
  const todayX = LEFT_LABEL_WIDTH + differenceInDays(new Date(), minDate) * dayWidth;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.not_started }} /> 未着手
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.in_progress }} /> 進行中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.done }} /> 完了
          </span>
        </div>
        <div className="flex gap-1">
          {(["day", "week", "month"] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {mode === "day" ? "日" : mode === "week" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <svg width={totalWidth} height={totalHeight} className="select-none">
          {/* ヘッダー背景 */}
          <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="#F9FAFB" />
          <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke="#E5E7EB" />

          {/* 日付ラベル */}
          {dateLabels.map((dl, i) => (
            <text key={i} x={dl.x + 2} y={dl.isMajor ? 18 : 38}
              fontSize={dl.isMajor ? 12 : 10} fill={dl.isMajor ? "#374151" : "#9CA3AF"}
              fontWeight={dl.isMajor ? 600 : 400}>
              {dl.label}
            </text>
          ))}

          {/* 行背景 + グリッド */}
          {chartData.map((d, i) => (
            <g key={d.task.id}>
              <rect x={0} y={d.rowY} width={totalWidth} height={ROW_HEIGHT}
                fill={i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"} />
              <line x1={0} y1={d.rowY + ROW_HEIGHT} x2={totalWidth} y2={d.rowY + ROW_HEIGHT}
                stroke="#F3F4F6" />
            </g>
          ))}

          {/* 今日の線 */}
          {todayX > LEFT_LABEL_WIDTH && todayX < totalWidth && (
            <g>
              <line x1={todayX} y1={HEADER_HEIGHT} x2={todayX} y2={totalHeight}
                stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />
              <text x={todayX + 3} y={HEADER_HEIGHT - 5} fontSize={9} fill="#EF4444" fontWeight={600}>今日</text>
            </g>
          )}

          {/* ラベル背景 */}
          <rect x={0} y={HEADER_HEIGHT} width={LEFT_LABEL_WIDTH} height={totalHeight - HEADER_HEIGHT} fill="white" />
          <line x1={LEFT_LABEL_WIDTH} y1={0} x2={LEFT_LABEL_WIDTH} y2={totalHeight} stroke="#E5E7EB" />

          {/* タスクバー */}
          {chartData.map((d) => (
            <g key={d.task.id}>
              {/* ラベル */}
              <text x={8} y={d.barY + BAR_HEIGHT / 2 + 4} fontSize={11} fill="#374151"
                className="truncate" clipPath={`url(#labelClip)`}>
                {d.label}
              </text>
              {/* バー */}
              <rect x={d.barX} y={d.barY} width={d.barWidth} height={BAR_HEIGHT}
                rx={4} ry={4} fill={d.color} opacity={0.85} />
              {/* 進捗バー（done以外） */}
              {d.task.status === "in_progress" && (
                <rect x={d.barX} y={d.barY} width={d.barWidth * 0.5} height={BAR_HEIGHT}
                  rx={4} ry={4} fill={d.color} opacity={1} />
              )}
              {/* バー内ラベル（幅が十分な場合） */}
              {d.barWidth > 60 && (
                <text x={d.barX + 6} y={d.barY + BAR_HEIGHT / 2 + 4}
                  fontSize={10} fill="white" fontWeight={500}>
                  {format(safeDate(d.task.startDate) || new Date(), "M/d")}〜{format(safeDate(d.task.deadline) || new Date(), "M/d")}
                </text>
              )}
            </g>
          ))}

          {/* ラベルクリップ */}
          <defs>
            <clipPath id="labelClip">
              <rect x={0} y={0} width={LEFT_LABEL_WIDTH - 8} height={totalHeight} />
            </clipPath>
          </defs>
        </svg>
      </div>
    </div>
  );
}
