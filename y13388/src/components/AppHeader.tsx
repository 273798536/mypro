import { Link, useLocation } from "react-router-dom";
import { Activity, LayoutDashboard, History, Radar, UserCog } from "lucide-react";

const navItems = [
  { to: "/", label: "看板总览", icon: LayoutDashboard },
  { to: "/timeline", label: "历史时间线", icon: History },
];

export default function AppHeader() {
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-md bg-signal-cyan/20 blur-sm group-hover:bg-signal-cyan/30 transition" />
            <div className="relative rounded-md border border-signal-cyan/40 bg-signal-cyan/10 p-1.5 text-signal-cyan">
              <Radar size={18} />
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-wide text-slate-100">漂移监控成本看板</div>
            <div className="text-[10px] font-medium tracking-wider text-ink-500">DRIFT · COST · DASHBOARD</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-signal-cyan/15 text-signal-cyan shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-ink-800/60"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 rounded-md border border-ink-700/70 bg-ink-900/50 px-2.5 py-1.5">
            <Activity size={14} className="text-signal-green" />
            <span className="text-xs text-slate-400">流水线</span>
            <span className="text-xs font-mono text-signal-green">正常</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-ink-700/70 bg-ink-900/50 px-2.5 py-1.5">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-signal-violet/40 to-signal-cyan/40 text-[11px] font-bold text-white">
              林
            </div>
            <div className="leading-tight">
              <div className="text-xs font-medium text-slate-200">小林</div>
              <div className="text-[10px] text-ink-500 flex items-center gap-1">
                <UserCog size={9} /> MLOps值班
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
