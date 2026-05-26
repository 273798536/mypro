import { AlertTriangle, CheckCircle2, Factory, FileSignature, LayoutDashboard, Route, Cog } from "lucide-react";
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "工作台", icon: LayoutDashboard },
  { to: "/materials", label: "材料与来源", icon: FileSignature },
  { to: "/setup", label: "任务配置", icon: Cog },
];

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-amber-500/15 text-amber-400">
            <Factory className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-100">
              钢卷吊运平衡局
            </div>
            <div className="text-[11px] text-slate-400">Steel Coil Balance Prototype</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`
              }
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span>重心 / 轨道 / 禁区规则实时校验</span>
          <Route className="h-3.5 w-3.5 text-slate-500" />
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>
    </header>
  );
}
