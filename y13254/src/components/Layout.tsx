import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", label: "清单主面板" },
  { to: "/locations", label: "点位管理" },
  { to: "/materials", label: "材料中心" },
  { to: "/consistency", label: "一致性" },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <header
        className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 z-10"
      >
        <div className="flex items-center gap-2">
          <span className="font-serif-display text-night-500 text-lg font-semibold">
            夜市外摆公示清单
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-all text-sm ${
                  isActive
                    ? "bg-night-50 text-night-500"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
