"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { format, differenceInDays, isValid, min, max } from "date-fns";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
  openingDate?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "#9CA3AF",
  in_progress: "#3B82F6",
  done: "#22C55E",
};

const BAR_HEIGHT = 28;
const ROW_HEIGHT = 38;
const HEADER_HEIGHT = 50;
const LEFT_LABEL_WIDTH = 180;
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

export default function GanttChart({ tasks, openingDate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewMode, setViewMode] = useState<"auto" | "day" | "week" | "month">("auto");

  // コンテナ幅を監視
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  const openingDateParsed = safeDate(openingDate);

  const { chartData, totalWidth, totalHeight, dateLabels, dayWidth, minDate, openingX } = useMemo(() => {
    const empty = { chartData: [], totalWidth: 0, totalHeight: 0, dateLabels: [], dayWidth: 0, minDate: new Date(), openingX: -1 };
    if (tasks.length === 0 || containerWidth === 0) return empty;

    // 全タスクの日付範囲を計算
    const allDates: Date[] = [];
    for (const t of tasks) {
      const s = safeDate(t.startDate);
      const e = safeDate(t.deadline);
      if (s) allDates.push(s);
      if (e) allDates.push(e);
    }
    if (openingDateParsed) allDates.push(openingDateParsed);
    if (allDates.length === 0) return empty;

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

    // 横軸自動調整: コンテナ幅に合わせてdayWidthを計算
    const availableWidth = containerWidth - LEFT_LABEL_WIDTH;
    let dw: number;
    if (viewMode === "auto") {
      dw = Math.max(Math.floor(availableWidth / chartDays), 3);
    } else {
      dw = viewMode === "day" ? 40 : viewMode === "week" ? 20 : 8;
    }

    const tw = Math.max(LEFT_LABEL_WIDTH + chartDays * dw, containerWidth);
    const th = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 10;

    // 日付ラベル生成
    const labels: { x: number; label: string; isMajor: boolean }[] = [];
    let lastMonth = -1;
    const labelInterval = dw >= 30 ? 5 : dw >= 15 ? 7 : dw >= 8 ? 14 : 30;

    for (let i = 0; i < chartDays; i++) {
      const d = new Date(chartStart);
      d.setDate(d.getDate() + i);
      const x = LEFT_LABEL_WIDTH + i * dw;

      if (d.getMonth() !== lastMonth) {
        labels.push({ x, label: format(d, "M月"), isMajor: true });
        lastMonth = d.getMonth();
      }

      if (dw >= 8) {
        const dayOfMonth = d.getDate();
        if (dayOfMonth === 1 || (dayOfMonth % labelInterval === 1 && dayOfMonth !== 1)) {
          labels.push({ x, label: format(d, "d"), isMajor: false });
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

    // 出店日のX座標
    let opX = -1;
    if (openingDateParsed) {
      opX = LEFT_LABEL_WIDTH + differenceInDays(openingDateParsed, chartStart) * dw;
    }

    return { chartData: data, totalWidth: tw, totalHeight: th, dateLabels: labels, dayWidth: dw, minDate: chartStart, openingX: opX };
  }, [tasks, viewMode, containerWidth, openingDateParsed]);

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
          {openingDateParsed && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-orange-500 inline-block" style={{ borderTop: "2px solid #F97316" }} /> 出店日
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["auto", "day", "week", "month"] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {mode === "auto" ? "自動" : mode === "day" ? "日" : mode === "week" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        {containerWidth > 0 && (
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

            {/* 出店日の線（目立つ太線） */}
            {openingX > LEFT_LABEL_WIDTH && openingX < totalWidth && (
              <g>
                {/* 背景帯 */}
                <rect x={openingX - 1} y={0} width={3} height={totalHeight}
                  fill="#F97316" opacity={0.15} />
                {/* メイン線 */}
                <line x1={openingX} y1={0} x2={openingX} y2={totalHeight}
                  stroke="#F97316" strokeWidth={2.5} />
                {/* ラベル */}
                <rect x={openingX - 32} y={2} width={64} height={18} rx={4} fill="#F97316" />
                <text x={openingX} y={14} fontSize={10} fill="white" fontWeight={700}
                  textAnchor="middle">
                  出店 {format(openingDateParsed!, "M/d")}
                </text>
              </g>
            )}

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
                  clipPath="url(#labelClip)">
                  {d.label}
                </text>
                {/* バー */}
                <rect x={d.barX} y={d.barY} width={d.barWidth} height={BAR_HEIGHT}
                  rx={4} ry={4} fill={d.color} opacity={0.85} />
                {/* 進捗バー */}
                {d.task.status === "in_progress" && (
                  <rect x={d.barX} y={d.barY} width={d.barWidth * 0.5} height={BAR_HEIGHT}
                    rx={4} ry={4} fill={d.color} opacity={1} />
                )}
                {/* バー内日付 */}
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
        )}
      </div>
    </div>
  );
}
