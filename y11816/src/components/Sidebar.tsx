import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileUp,
  Cog,
  SearchCheck,
  Calculator,
  FileSpreadsheet,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "工作台" },
  { path: "/import", icon: FileUp, label: "数据导入" },
  { path: "/process", icon: Cog, label: "兑付处理" },
  { path: "/review", icon: SearchCheck, label: "异常复核" },
  { path: "/settlement", icon: Calculator, label: "渠道结算" },
  { path: "/export", icon: FileSpreadsheet, label: "报表导出" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-ink-700 text-ink-100 flex flex-col z-30">
      <div className="px-6 py-6 border-b border-ink-600">
        <h1 className="font-display text-xl font-semibold text-brand-400 tracking-wide">
          影城票券兑付结算
        </h1>
        <p className="text-xs text-ink-400 mt-1 font-body">
          Cinema Ticket Settlement
        </p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-brand-400/15 text-brand-400 border-l-2 border-brand-400"
                      : "text-ink-300 hover:bg-ink-600/50 hover:text-ink-100 border-l-2 border-transparent"
                  }`
                }
              >
                <item.icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-ink-600">
        <div className="text-xs text-ink-400 space-y-1">
          <p className="font-medium text-ink-300">系统状态</p>
          <div className="flex items-center gap-2">
            <span className="status-dot status-dot-success animate-pulse" />
            <span>数据引擎运行正常</span>
          </div>
          <p className="text-ink-500 pt-1">
            v1.0.0 · 纯前端版本
          </p>
        </div>
      </div>
    </aside>
  );
}
