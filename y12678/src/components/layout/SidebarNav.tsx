import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Camera,
  Table,
  AlertTriangle,
  GitBranch,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Anchor,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/",
    icon: Camera,
    label: "视角保存",
  },
  {
    to: "/records",
    icon: Table,
    label: "测量记录",
  },
  {
    to: "/collision",
    icon: AlertTriangle,
    label: "碰撞检测",
  },
  {
    to: "/trace",
    icon: GitBranch,
    label: "溯源追踪",
  },
  {
    to: "/consistency",
    icon: ShieldCheck,
    label: "数据一致性",
  },
];

const VERSION = "v1.0.0";

export default function SidebarNav() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-ocean-200 bg-white/95 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-ocean-100 px-4">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ocean-500 text-white shadow-md">
            <Anchor className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-song text-base font-bold text-ocean-700 leading-tight">
                海洋牧场
              </span>
              <span className="text-[10px] text-ocean-400 font-mono-num leading-tight">
                OCEAN RANCH
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-ocean-500 text-white shadow-md shadow-ocean-500/25"
                    : "text-ocean-600 hover:bg-ocean-50 hover:text-ocean-700"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className="font-song tracking-wide">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-ocean-100 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-ocean-500 transition-colors hover:bg-ocean-50 hover:text-ocean-700"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-song">收起菜单</span>
            </>
          )}
        </button>

        <div
          className={cn(
            "mt-2 flex items-center justify-center text-[10px] font-mono-num text-ocean-400",
            collapsed ? "flex-col gap-0.5" : "gap-1"
          )}
        >
          <span>版本</span>
          <span className="text-ocean-600 font-semibold">{VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
