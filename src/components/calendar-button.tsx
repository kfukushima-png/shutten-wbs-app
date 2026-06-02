"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { createCalendarEvent, buildTaskEvent } from "@/lib/google-calendar";
import { updateTask } from "@/lib/firestore";
import type { Task } from "@/types";

interface Props {
  storeName: string;
  tasks: Task[];
  onRefresh?: () => void;
}

export default function CalendarButton({ storeName, tasks, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const undoneTasks = tasks.filter((t) => t.status !== "done");
  const unregistered = undoneTasks.filter((t) => !t.calendarEventId);
  const registeredCount = undoneTasks.length - unregistered.length;

  const handleAddToCalendar = async () => {
    if (unregistered.length === 0) {
      setResult("全タスクが登録済みです");
      setTimeout(() => setResult(null), 3000);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");

      const auth = getFirebaseAuth();
      const credential = await signInWithPopup(auth, provider);
      const oauthCredential = GoogleAuthProvider.credentialFromResult(credential);

      if (!oauthCredential?.accessToken) {
        setResult("カレンダーへのアクセス権限が取得できませんでした");
        setLoading(false);
        return;
      }

      let added = 0;
      for (const task of unregistered) {
        const event = buildTaskEvent(storeName, task.name, task.deadline, `フェーズ: ${task.phase}\n${task.details || ""}`);
        const res = await createCalendarEvent(oauthCredential.accessToken, event);
        if (res) {
          await updateTask(task.id, { calendarEventId: res.id } as Partial<Task>);
          added++;
        }
      }

      setResult(`${added}件をカレンダーに登録しました`);
      onRefresh?.();
    } catch (error) {
      console.error("Calendar error:", error);
      setResult("カレンダー登録に失敗しました");
    }

    setLoading(false);
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleAddToCalendar}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {loading ? "登録中..." : "カレンダーに登録"}
        {registeredCount > 0 && (
          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">
            {registeredCount}件済
          </span>
        )}
      </button>
      {result && (
        <div className="absolute top-full left-0 mt-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10">
          {result}
        </div>
      )}
    </div>
  );
}
