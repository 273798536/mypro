import { NavLink } from "react-router-dom";
import { Upload, BarChart3, Edit } from "lucide-react";

const navItems = [
  { path: "/import", label: "数据导入", icon: Upload },
  { path: "/dashboard", label: "分摊看板", icon: BarChart3 },
  { path: "/correction", label: "手动修正", icon: Edit },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-primary text-white flex flex-col z-50">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-wide">年卡分摊</h1>
        <p className="text-xs text-white/50 mt-1">文旅年卡分摊收入分析</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 border-l-4 border-accent text-accent"
                  : "border-l-4 border-transparent text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/30">
        © 2026 文旅年卡系统
      </div>
    </aside>
  );
}
