import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GitMerge,
  History,
  FileDown,
  TreePine,
  AlertTriangle,
  Clock3,
} from "lucide-react";
import { useStatusCounts } from "@/hooks/useFilter";
import clsx from "clsx";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "总览仪表盘" },
  { to: "/merge", icon: GitMerge, label: "点位归并工作台" },
  { to: "/history", icon: History, label: "历史追溯面板" },
  { to: "/export", icon: FileDown, label: "数据导出中心" },
];

export function Sidebar() {
  const location = useLocation();
  const counts = useStatusCounts();
  const pendingTotal = counts.pending + counts.doubtful + counts.risk;

  return (
    <aside className="w-60 shrink-0 h-full bg-civic-900 text-civic-100 flex flex-col border-r border-civic-800">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-civic-800">
        <div className="w-10 h-10 rounded-civic bg-civic-600 flex items-center justify-center">
          <TreePine className="w-6 h-6 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-serif text-base font-semibold text-white">
            公园噪声点位归并
          </div>
          <div className="text-[11px] text-civic-300 mt-0.5">
            PARK NOISE MERGE v1.0
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-civic-800">
        <div className="rounded-civic bg-civic-800/50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Clock3 className="w-3.5 h-3.5 text-warning-500" />
            <span className="text-civic-200">彩排交付倒计时</span>
          </div>
          <div className="mt-1.5 font-mono text-sm font-semibold text-white">
            2026-06-20 17:00
          </div>
          {pendingTotal > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-warning-500">
              <AlertTriangle className="w-3 h-3" />
              待处理异常 <span className="font-semibold">{pendingTotal}</span>{" "}
              条
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-civic text-sm transition-colors",
                active
                  ? "bg-civic-600 text-white shadow-inner"
                  : "text-civic-200 hover:bg-civic-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/merge" && pendingTotal > 0 && (
                <span className="text-[10px] bg-warning-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  {pendingTotal}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-civic-800 text-[11px] text-civic-400 leading-relaxed">
        <div className="mb-1">使用说明</div>
        <div>• 饼图扇区可跳转筛选</div>
        <div>• 异常红点可点回原始材料</div>
        <div>• 操作备注必填，历史留痕</div>
      </div>
    </aside>
  );
}
