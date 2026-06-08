import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Upload, ListTodo, Route, ScrollText, Plane, Settings } from "lucide-react";
import { useRouteStore } from "@/store/routeStore";

const navItems = [
  { to: "/import", label: "数据导入", icon: Upload },
  { to: "/routes", label: "航线总览", icon: ListTodo },
];

export default function AppLayout() {
  const { routes } = useRouteStore();
  const location = useLocation();
  const anomalyCount = routes.filter((r) => r.anomalyTypes.length > 0).length;
  const pendingCount = routes.filter(
    (r) => r.status !== "all_completed" && r.anomalyTypes.length > 0
  ).length;

  const showDetailNav = location.pathname.startsWith("/routes/") && location.pathname !== "/routes";
  const routeId = location.pathname.split("/")[2];

  return (
    <div className="min-h-screen bg-industrial-bg flex">
      <aside className="w-60 bg-industrial-panel border-r border-industrial-border flex flex-col">
        <div className="p-4 border-b border-industrial-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-gradient-to-br from-status-safe to-status-warning flex items-center justify-center">
              <Plane className="w-5 h-5 text-industrial-bg" />
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-industrial-text tracking-wide">
                无人机航线
              </div>
              <div className="text-[10px] font-mono text-industrial-muted tracking-widest">
                HEIGHT SANDBOX
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-status-safe/15 text-status-safe border-l-2 border-status-safe"
                    : "text-industrial-muted hover:text-industrial-text hover:bg-industrial-border/30 border-l-2 border-transparent"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {to === "/routes" && anomalyCount > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-status-danger/20 text-status-danger px-1.5 py-0.5 rounded">
                  {anomalyCount}
                </span>
              )}
            </NavLink>
          ))}

          {showDetailNav && routeId && (
            <div className="mt-4 pt-3 border-t border-industrial-border/60">
              <div className="px-3 pb-2 text-[10px] font-mono text-industrial-muted tracking-widest">
                当前航线
              </div>
              <div className="px-3 py-1.5 mb-1 text-xs font-mono text-status-warning truncate">
                {routeId}
              </div>
              <NavLink
                to={`/routes/${routeId}`}
                end
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-status-warning/15 text-status-warning border-l-2 border-status-warning"
                      : "text-industrial-muted hover:text-industrial-text hover:bg-industrial-border/30 border-l-2 border-transparent"
                  }`
                }
              >
                <Route className="w-4 h-4" />
                <span>航线详情</span>
              </NavLink>
              <NavLink
                to={`/routes/${routeId}/review`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? "bg-status-warning/15 text-status-warning border-l-2 border-status-warning"
                      : "text-industrial-muted hover:text-industrial-text hover:bg-industrial-border/30 border-l-2 border-transparent"
                  }`
                }
              >
                <ScrollText className="w-4 h-4" />
                <span>评审工作台</span>
                {pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-mono bg-status-warning/20 text-status-warning px-1.5 py-0.5 rounded">
                    待审
                  </span>
                )}
              </NavLink>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-industrial-border/60 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="panel p-2">
              <div className="text-industrial-muted">总航线</div>
              <div className="font-mono text-sm text-industrial-text font-bold">
                {routes.length}
              </div>
            </div>
            <div className="panel p-2">
              <div className="text-industrial-muted">异常</div>
              <div className="font-mono text-sm text-status-danger font-bold">
                {anomalyCount}
              </div>
            </div>
          </div>
          <button className="w-full btn btn-default flex items-center justify-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            <span className="text-xs">仿真工程师</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
