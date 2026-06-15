import { NavLink } from "react-router-dom";
import { Waves, Settings2, FileBarChart, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-tide-green/20 text-tide-green shadow-glow"
        : "text-ocean-200 hover:text-white hover:bg-ocean-700/50"
    );

  return (
    <nav className="bg-ocean-900/90 backdrop-blur-md border-b border-ocean-700/50 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tide-green to-ocean-400 flex items-center justify-center shadow-glow">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">潮汐发电闸门演示</h1>
            <p className="text-xs text-ocean-300">海洋课堂教学演示系统</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            <Home className="w-4 h-4" />
            <span>演示控制台</span>
          </NavLink>
          <NavLink to="/experiment" className={linkClass}>
            <Settings2 className="w-4 h-4" />
            <span>策略实验</span>
          </NavLink>
          <NavLink to="/report" className={linkClass}>
            <FileBarChart className="w-4 h-4" />
            <span>课堂报告</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
