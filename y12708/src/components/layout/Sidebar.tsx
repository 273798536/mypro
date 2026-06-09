import { NavLink } from "react-router-dom";
import { Calculator, Upload, Wrench, ClipboardCheck, GitCompare, Scale } from "lucide-react";

const navItems = [
  { path: "/", label: "公式计算", icon: Calculator, description: "日常入口" },
  { path: "/import", label: "数据导入", icon: Upload, description: "题目清单导入" },
  { path: "/correction", label: "人工修正", icon: Wrench, description: "待确认记录" },
  { path: "/review", label: "批量复核", icon: ClipboardCheck, description: "月底/课前复核" },
  { path: "/versions", label: "版本管理", icon: GitCompare, description: "草稿与冲突" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-primary-700 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-primary-600/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-400 rounded flex items-center justify-center">
            <Scale className="w-6 h-6 text-primary-900" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-white font-serif-sc text-base font-semibold leading-tight">
              线性规划配餐约束
            </h1>
            <p className="text-primary-300 text-xs mt-0.5">投研助理工作平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? "nav-item-active" : "nav-item-inactive"
            }
          >
            <item.icon className="w-5 h-5" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-[11px] opacity-70 font-normal">{item.description}</div>
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-primary-600/50">
        <div className="text-xs text-primary-300 space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success-400 rounded-full"></span>
            系统正常运行
          </p>
          <p>数据版本：v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
