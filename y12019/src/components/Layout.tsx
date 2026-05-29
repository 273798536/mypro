import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Cpu,
  FileText,
  Calculator,
  AlertTriangle,
  Download,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/store";

const navItems = [
  { to: "/", label: "总览看板", icon: LayoutDashboard },
  { to: "/equipment", label: "设备台账", icon: Cpu },
  { to: "/contracts", label: "合同管理", icon: FileText },
  { to: "/accrual", label: "费用预提", icon: Calculator },
  { to: "/exceptions", label: "异常处理", icon: AlertTriangle },
  { to: "/reports", label: "报表导出", icon: Download },
];

const periods = [
  "2024-Q1",
  "2024-Q2",
  "2024-Q3",
  "2024-Q4",
  "2025-Q1",
  "2025-Q2",
  "2025-Q3",
  "2025-Q4",
];

const pageTitles: Record<string, string> = {
  "/": "总览看板",
  "/equipment": "设备台账",
  "/contracts": "合同管理",
  "/accrual": "费用预提",
  "/exceptions": "异常处理",
  "/reports": "报表导出",
};

export default function Layout() {
  const currentPeriod = useAppStore((s) => s.currentPeriod);
  const setCurrentPeriod = useAppStore((s) => s.setCurrentPeriod);
  const location = useLocation();
  const [periodOpen, setPeriodOpen] = useState(false);

  const pageTitle = pageTitles[location.pathname] ?? "设备维保预提费用系统";

  return (
    <div className="flex h-screen font-['Noto_Sans_SC',sans-serif] bg-surface text-steel-800">
      <aside className="w-[240px] shrink-0 bg-steel-500 flex flex-col">
        <div className="h-16 flex items-center px-5 gap-3 border-b border-steel-400/30">
          <div className="w-1 h-6 rounded-full bg-amber-500" />
          <span className="text-xl font-bold text-steel-50 tracking-wide">
            维保预提
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 h-11 text-sm font-medium transition-colors border-l-[3px] ${
                  isActive
                    ? "border-amber-500 text-steel-50 bg-steel-400/20"
                    : "border-transparent text-steel-200 hover:text-steel-50 hover:bg-steel-400/10"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-steel-400/30">
          <p className="text-xs text-steel-300">设备维保预提费用系统</p>
          <p className="text-xs text-steel-400 mt-1">v1.0.0</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-surface-card border-b border-steel-100 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-steel-800">{pageTitle}</h1>

          <div className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-steel-200 text-sm text-steel-600 hover:border-steel-300 hover:text-steel-800 transition-colors bg-white"
            >
              <span>{currentPeriod}</span>
              <ChevronDown size={14} className="text-steel-400" />
            </button>

            {periodOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPeriodOpen(false)}
                />
                <ul className="absolute right-0 top-full mt-1 z-20 w-32 bg-white rounded-md border border-steel-100 shadow-lg py-1 max-h-64 overflow-y-auto">
                  {periods.map((p) => (
                    <li key={p}>
                      <button
                        onClick={() => {
                          setCurrentPeriod(p);
                          setPeriodOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          p === currentPeriod
                            ? "bg-amber-500/10 text-amber-600 font-medium"
                            : "text-steel-600 hover:bg-steel-50"
                        }`}
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
