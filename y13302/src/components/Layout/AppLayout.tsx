import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  ClipboardCheck,
  BarChart3,
  History,
  Scale,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "工作台总览" },
  { to: "/materials", icon: Database, label: "材料导入管理" },
  { to: "/workbench", icon: ClipboardCheck, label: "人工改判工作台" },
  { to: "/review", icon: BarChart3, label: "评审分析" },
  { to: "/history", icon: History, label: "历史追溯" },
];

export default function AppLayout() {
  const resetAll = useAppStore((s) => s.resetAll);
  const navigate = useNavigate();

  const handleReset = () => {
    if (window.confirm("确定要重置所有数据到初始状态吗？此操作不可撤销。")) {
      resetAll();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-white/80 backdrop-blur-md border-r border-navy-100 flex flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-navy-50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center shadow-md shadow-navy-600/20">
            <Scale className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[15px] font-serif font-semibold text-navy-800 leading-tight">
              客服摘要改判
            </h1>
            <p className="text-[11px] text-navy-400">人工复核工作台</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-50 space-y-2">
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            <span>重置初始数据</span>
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-navy-400">
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            <span>当前角色：标注负责人 · 周姐</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="px-8 py-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
