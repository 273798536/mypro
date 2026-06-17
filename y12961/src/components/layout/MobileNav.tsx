import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Waypoints,
  GitCompareArrows,
  ShieldAlert,
  DatabaseBackup,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "总览", icon: LayoutDashboard, end: true },
  { to: "/routes", label: "明细", icon: Waypoints, end: false },
  { to: "/schema", label: "Schema", icon: GitCompareArrows, end: false },
  { to: "/audit", label: "审计", icon: ShieldAlert, end: false },
  { to: "/backup", label: "备份", icon: DatabaseBackup, end: false },
];

export default function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-ink-950/40 px-3 py-2 lg:hidden">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-sky/10 text-sky"
                : "text-ink-500 hover:bg-ink-850 hover:text-zinc-200",
            )
          }
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
