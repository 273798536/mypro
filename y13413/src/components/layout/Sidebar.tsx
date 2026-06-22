import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus,
  Archive,
  AlertTriangle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/",
    label: "总览看板",
    Icon: LayoutDashboard,
  },
  {
    to: "/batches/new",
    label: "新建复核",
    Icon: FilePlus,
  },
  {
    to: "/records",
    label: "记录档案",
    Icon: Archive,
  },
  {
    to: "/anomalies",
    label: "异常看板",
    Icon: AlertTriangle,
  },
  {
    to: "/export",
    label: "报告导出",
    Icon: Download,
  },
];

export default function Sidebar() {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 flex h-screen w-[260px] flex-col",
        "bg-parchment-50 border-r border-parchment-200"
      )}
    >
      <div className="px-6 py-6 border-b border-parchment-200">
        <div className="flex items-baseline gap-2">
          <span className="font-serif italic text-2xl text-ink-600">∂</span>
          <h1 className="font-serif text-lg font-semibold text-ink-700 leading-tight">
            微分方程边界复核
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-charcoal-500 tracking-wide">
          DE Boundary Review
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-all duration-150",
                "text-charcoal-600 hover:bg-parchment-100 hover:text-ink-700",
                isActive &&
                  "bg-ink-50 text-ink-700 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-ink-600 before:rounded-r-sm"
              )
            }
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="font-serif">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-parchment-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ink-600 text-white flex items-center justify-center font-serif text-base flex-shrink-0">
            L
          </div>
          <div className="min-w-0">
            <p className="font-serif text-sm font-semibold text-ink-700 truncate">
              老叶
            </p>
            <span className="badge badge-new mt-0.5">
              教研教师
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
