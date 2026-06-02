"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import type { UserRole } from "@/types";

const mobileNavItems: { label: string; href: string; roles: UserRole[] }[] = [
  { label: "ダッシュボード", href: "/admin", roles: ["admin"] },
  { label: "ブランド", href: "/admin/brands", roles: ["admin"] },
  { label: "テンプレート", href: "/admin/templates", roles: ["admin"] },
  { label: "ユーザー", href: "/admin/users", roles: ["admin"] },
  { label: "ダッシュボード", href: "/pm", roles: ["pm"] },
  { label: "店舗", href: "/pm/stores", roles: ["pm"] },
  { label: "マイ店舗", href: "/owner", roles: ["owner"] },
];

export default function MobileNav() {
  const { appUser, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!appUser) return null;

  const items = mobileNavItems.filter((i) => i.roles.includes(appUser.role));

  return (
    <div className="md:hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">WBS管理</h1>
        <button onClick={() => setOpen(!open)} className="p-2 text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)}>
          <div className="absolute right-0 top-14 w-64 bg-white shadow-lg rounded-bl-xl p-4" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                    pathname === item.href ? "bg-blue-50 text-blue-700" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 truncate mb-2">{appUser.email}</p>
              <button onClick={signOut} className="text-sm text-gray-500 hover:text-red-600">
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-14" />
    </div>
  );
}
