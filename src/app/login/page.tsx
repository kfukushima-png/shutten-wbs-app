"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { appUser, loading, isPending, signIn, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && appUser) {
      router.replace("/");
    }
  }, [appUser, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">WBS管理システム</h1>
        <p className="text-gray-500 mb-8">出店プロジェクト管理</p>

        {isPending ? (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-yellow-800 mb-1">承認待ち</h3>
              <p className="text-yellow-700 text-sm">
                ログインリクエストを受け付けました。
                <br />
                管理者またはPMが承認するまでお待ちください。
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              別のアカウントでログイン
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-6 py-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleアカウントでログイン
          </button>
        )}
      </div>
    </div>
  );
}
