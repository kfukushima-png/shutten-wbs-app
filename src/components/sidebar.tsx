"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/admin", roles: ["admin"] },
  { label: "ブランド管理", href: "/admin/brands", roles: ["admin"] },
  { label: "テンプレート管理", href: "/admin/templates", roles: ["admin"] },
  { label: "ユーザー管理", href: "/admin/users", roles: ["admin"] },
  { label: "ダッシュボード", href: "/pm", roles: ["pm"] },
  { label: "店舗一覧", href: "/pm/stores", roles: ["pm"] },
  { label: "マイ店舗", href: "/owner", roles: ["owner"] },
];

export default function Sidebar() {
  const { appUser, signOut } = useAuth();
  const pathname = usePathname();

  if (!appUser) return null;

  const roleLabel = { admin: "管理者", pm: "本部PM", owner: "オーナー" }[appUser.role];
  const filteredNav = navItems.filter((item) => item.roles.includes(appUser.role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col max-md:hidden">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-800">WBS管理</h1>
        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {roleLabel}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 truncate mb-2">{appUser.email}</p>
        <button
          onClick={signOut}
          className="w-full text-sm text-gray-500 hover:text-red-600 transition-colors text-left"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}
