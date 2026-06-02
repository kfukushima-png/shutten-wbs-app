"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { addTasksToCalendar } from "@/lib/google-calendar";
import type { Task } from "@/types";

interface Props {
  storeName: string;
  tasks: Task[];
}

export default function CalendarButton({ storeName, tasks }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAddToCalendar = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Googleカレンダーのスコープ付きでログイン
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

      const undoneTasks = tasks.filter((t) => t.status !== "done");

      const added = await addTasksToCalendar(
        oauthCredential.accessToken,
        storeName,
        undoneTasks.map((t) => ({
          name: t.name,
          deadline: t.deadline,
          details: `フェーズ: ${t.phase}\n${t.details || ""}`,
        }))
      );

      setResult(`${added}件のタスクをGoogleカレンダーに登録しました`);
    } catch (error) {
      console.error("Calendar error:", error);
      setResult("カレンダー登録に失敗しました");
    }

    setLoading(false);
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
      </button>
      {result && (
        <div className="absolute top-full left-0 mt-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10">
          {result}
        </div>
      )}
    </div>
  );
}
