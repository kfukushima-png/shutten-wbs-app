"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!appUser) {
      router.replace("/login");
      return;
    }
    switch (appUser.role) {
      case "admin":
        router.replace("/admin");
        break;
      case "pm":
        router.replace("/pm");
        break;
      case "owner":
        router.replace("/owner");
        break;
    }
  }, [appUser, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-lg text-gray-500">読み込み中...</div>
    </div>
  );
}
