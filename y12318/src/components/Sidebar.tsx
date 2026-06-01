import { NavLink } from "react-router-dom";
import { Upload, BarChart3, FileSearch, Database } from "lucide-react";

const navItems = [
  { to: "/import", label: "数据导入", icon: Upload },
  { to: "/overview", label: "概览分析", icon: BarChart3 },
  { to: "/detail/SKU-001", label: "详情溯源", icon: FileSearch },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-base-50 border-r border-base-100 flex flex-col z-40">
      <div className="px-5 py-5 border-b border-base-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-steel flex items-center justify-center">
            <Database className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary leading-tight">概率库存</h1>
            <p className="text-xs text-text-muted leading-tight">补货台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/import"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 ${
                isActive
                  ? "bg-steel/15 text-steel font-medium"
                  : "text-text-secondary hover:bg-base-100 hover:text-text-primary"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-base-100">
        <p className="text-xs text-text-muted">
          v1.0 · 数据本地处理
        </p>
      </div>
    </aside>
  );
}
