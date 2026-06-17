import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FlaskConical, ShieldAlert, FileText, GitBranch, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const NAV = [
  { to: "/", label: "总览看板", icon: LayoutDashboard, end: true },
  { to: "/samples", label: "边界样本库", icon: FlaskConical, end: false },
  { to: "/leakage", label: "训练验证泄漏", icon: ShieldAlert, end: false },
  { to: "/reports", label: "报告与导出", icon: FileText, end: false },
];

function VersionSelector() {
  const versions = useDashboardStore((s) => s.versions);
  const currentId = useDashboardStore((s) => s.currentVersionId);
  const setVersion = useDashboardStore((s) => s.setVersion);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = versions.find((v) => v.id === currentId);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg border border-edge2 bg-panel/60 px-3 py-2 transition-colors hover:border-amber-500/40"
      >
        <GitBranch className="h-4 w-4 text-amber-300" />
        <div className="text-left">
          <div className="font-mono text-xs leading-none text-faint">版本</div>
          <div className="font-mono text-sm leading-tight text-cream">{current?.id}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-edge2 bg-panel shadow-panel">
          <div className="px-3 py-2 eyebrow !text-faint">切换版本 · 全局联动</div>
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setVersion(v.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/5",
                v.id === currentId && "bg-amber-500/5",
              )}
            >
              <div className="mt-0.5">
                <span
                  className={cn(
                    "block h-2 w-2 rounded-full",
                    v.id === currentId ? "bg-amber-400" : "bg-edge2",
                  )}
                />
              </div>
              <div>
                <div className="font-mono text-sm text-cream">{v.id}</div>
                <div className="text-xs text-muted">{v.name}</div>
                <div className="mt-0.5 font-mono text-[0.65rem] text-faint">
                  {v.modelVersion} · {v.createdAt}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const currentId = useDashboardStore((s) => s.currentVersionId);
  const versions = useDashboardStore((s) => s.versions);
  const current = versions.find((v) => v.id === currentId);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-edge2/60 bg-ink/60 px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10">
              <span className="font-display text-lg text-amber-300">R</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-soft rounded-full bg-amber-400" />
            </div>
            <div>
              <div className="font-display text-sm leading-tight text-cream">拒答边界</div>
              <div className="font-mono text-[0.6rem] uppercase tracking-wider2 text-faint">
                Boundary Lab
              </div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-amber-500/10 text-cream"
                      : "text-muted hover:bg-white/5 hover:text-cream",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-amber-300" : "text-faint group-hover:text-muted",
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-edge2/60 bg-panel/40 p-3">
          <div className="eyebrow !text-faint">单一事实源</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            安全拦截 / 人工修正 / 泄漏检测共用同一批处理记录，界面与报告同源派生。
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-edge2/60 bg-ink/80 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="md:hidden font-display text-cream">拒答边界</div>
            <div className="hidden md:block">
              <div className="font-mono text-[0.65rem] uppercase tracking-wider2 text-faint">
                {NAV.find((n) => n.to === location.pathname.split("/")[1] || location.pathname === n.to)?.label ?? "总览看板"}
              </div>
              <div className="font-display text-lg leading-tight text-cream">
                {current?.name}
              </div>
            </div>
          </div>
          <VersionSelector />
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
