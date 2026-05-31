import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { Calculator, GitBranch, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "费用归集", icon: Calculator },
  { to: "/tracking", label: "变更追踪", icon: GitBranch },
  { to: "/report", label: "报表导出", icon: FileSpreadsheet },
];

export default function Layout() {
  return (
    <div
      className="flex h-screen"
      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
    >
      <aside className="flex w-[220px] shrink-0 flex-col bg-[#1a2332]">
        <div className="flex h-16 items-center px-5">
          <span className="text-lg font-semibold tracking-wide text-white">
            研发费用加计归集
          </span>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-[3px] border-[#d4a853] bg-[#243044] text-[#d4a853]"
                    : "border-l-[3px] border-transparent text-[#8b95a5] hover:bg-[#1f2d3d] hover:text-[#c0c8d4]"
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#2a3a4e] px-5 py-4">
          <p className="text-xs text-[#5a6a7e]">v1.0.0</p>
        </div>
      </aside>

      <main
        className="flex-1 overflow-auto bg-[#f5f6f8] p-6"
        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
      >
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
