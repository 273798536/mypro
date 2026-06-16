import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  MapPin,
  FileBarChart,
  Droplets,
  Database,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store";

const navItems = [
  { to: "/", label: "总览仪表盘", icon: LayoutDashboard },
  { to: "/feedbacks", label: "居民反馈", icon: MessageSquare },
  { to: "/locations", label: "地点归并", icon: MapPin },
  { to: "/plans", label: "方案比选", icon: FileBarChart },
];

export default function Sidebar() {
  const loc = useLocation();
  const resetAll = useAppStore((s) => s.resetAll);
  const feedbackCount = useAppStore((s) => s.feedbacks.length);
  const planCount = useAppStore((s) => s.plans.length);
  const pendingPairs = useAppStore((s) => s.locationPairs.filter((p) => !p.reviewed).length);

  return (
    <aside className="w-60 h-screen bg-municipal-700 text-municipal-50 flex flex-col sticky top-0">
      <div className="px-5 py-5 border-b border-municipal-600 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-municipal-500 flex items-center justify-center">
          <Droplets size={20} className="text-white" />
        </div>
        <div>
          <div className="font-serif text-base font-semibold leading-tight">
            雨水口积淤方案
          </div>
          <div className="text-xs text-municipal-300 mt-0.5">比选复核系统</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.to === "/" && loc.pathname === "/") ||
            (item.to !== "/" && loc.pathname.startsWith(item.to));
          const badge =
            item.to === "/feedbacks"
              ? feedbackCount
              : item.to === "/locations"
                ? pendingPairs
                : item.to === "/plans"
                  ? planCount
                  : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm transition-colors ${
                isActive
                  ? "bg-municipal-500 text-white shadow-sm"
                  : "text-municipal-200 hover:bg-municipal-600 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? "bg-white text-municipal-700" : "bg-municipal-600 text-municipal-100"
                  }`}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-municipal-600 space-y-2">
        <div className="flex items-center gap-2 px-2 text-xs text-municipal-300">
          <Database size={14} />
          <span>数据持久化于本地</span>
        </div>
        <button
          onClick={() => {
            if (confirm("确认清空所有数据？此操作不可撤销。")) resetAll();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-municipal-200 hover:bg-municipal-600 rounded-[2px] transition-colors"
        >
          <Trash2 size={14} />
          清空所有数据
        </button>
      </div>
    </aside>
  );
}
