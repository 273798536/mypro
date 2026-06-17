import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Upload, GitMerge, FileText, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import Toast from "@/components/Toast";

const NAV = [
  { to: "/import", label: "材料导入", icon: Upload },
  { to: "/merge", label: "归并操作", icon: GitMerge },
  { to: "/summary", label: "摘要查看", icon: FileText },
];

function useCurrentTitle(): string {
  const { pathname } = useLocation();
  const item = NAV.find((n) => pathname.startsWith(n.to));
  return item?.label ?? "慢行桥坡道点位归并";
}

export default function Layout() {
  const title = useCurrentTitle();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-slate-700/40 bg-slate-850">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-900">
            <Footprints size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">慢行桥坡道</p>
            <p className="text-xs text-slate-400">点位归并系统</p>
          </div>
        </div>
        <nav className="mt-3 flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 border-l-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-amber-500 bg-slate-700/60 text-white"
                      : "border-transparent text-slate-300 hover:bg-slate-700/40 hover:text-white",
                  )
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-xs text-slate-500">市政慢行设施 · 内部工具</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <span className="text-xs text-slate-400">慢行桥坡道点位归并</span>
        </header>
        <main className="flex-1 overflow-x-hidden p-8">
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  );
}
