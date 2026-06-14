import { NavLink } from "react-router-dom";
import { AlertTriangle, History, Headphones } from "lucide-react";

export default function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded transition-all duration-200 ${
      isActive
        ? "bg-surface-600 text-amber border-l-2 border-amber"
        : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-700"
    }`;

  return (
    <aside className="w-56 h-screen bg-surface-800 border-r border-surface-600 flex flex-col fixed left-0 top-0 z-10">
      <div className="px-4 py-5 border-b border-surface-600">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-amber" />
          <h1 className="font-mono text-sm font-semibold text-zinc-100 tracking-tight">
            耳返异常提醒
          </h1>
        </div>
        <p className="text-xs text-zinc-500 mt-1">巡演 IEM 监控系统</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/" className={linkClass} end>
          <AlertTriangle className="w-4 h-4" />
          <span>异常提醒与分析</span>
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <History className="w-4 h-4" />
          <span>变更溯源与对齐</span>
        </NavLink>
      </nav>

      <div className="px-4 py-3 border-t border-surface-600">
        <p className="text-xs text-zinc-500 font-mono">v1.0 · 换班前交付</p>
      </div>
    </aside>
  );
}
