import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ShieldCheck, LayoutDashboard, AlertTriangle, GitCompare, Clock, FileDown } from "lucide-react";

export const metadata: Metadata = {
  title: "数据质量脏行隔离 · 安全审计工作台",
  description: "权限越权检测、备份对比、审计留痕一体化工作台",
};

const navItems = [
  { href: "/", label: "运行概览", icon: LayoutDashboard },
  { href: "/dirty-rows", label: "脏行明细", icon: AlertTriangle },
  { href: "/compare", label: "备份对比", icon: GitCompare },
  { href: "/slow-queries", label: "慢查询归因", icon: Clock },
  { href: "/audit-log", label: "审计日志", icon: ShieldCheck },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen flex">
          <aside className="w-60 bg-white border-r border-zinc-200 flex-shrink-0">
            <div className="p-5 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <span className="font-semibold text-zinc-900 text-sm">脏行隔离工作台</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">安全审计员专用</p>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 w-60 p-4 border-t border-zinc-200 bg-white">
              <div className="text-xs text-zinc-500">数据说明</div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                图表、明细、下载结果均来自同一批检测记录，批次号可追溯完整链路。
              </p>
            </div>
          </aside>
          <main className="flex-1 p-8 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
