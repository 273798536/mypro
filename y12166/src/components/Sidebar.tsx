import { Link, useLocation } from "react-router-dom";
import { Droplets, Calendar, AlertTriangle } from "lucide-react";

const navItems = [
  { path: "/", label: "仿真总览", icon: Droplets },
  { path: "/schedule", label: "排程建议", icon: Calendar },
  { path: "/anomaly", label: "异常追溯", icon: AlertTriangle },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-slate-950 border-r border-slate-800/60 flex flex-col z-50">
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">水循环仿真</div>
            <div className="text-[10px] text-slate-600">Pool Circulation Sim</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-800/60">
        <div className="text-[10px] text-slate-700">
          游泳池水循环仿真系统
        </div>
        <div className="text-[10px] text-slate-800">
          数据一致性保证 · 可追溯
        </div>
      </div>
    </aside>
  );
}
