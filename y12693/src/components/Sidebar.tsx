import { NavLink, useLocation } from "react-router-dom";
import {
  Layers,
  ListChecks,
  Box,
  FlaskConical,
  Lightbulb,
} from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/section", label: "剖切查看", icon: Layers, desc: "日常入口" },
  { to: "/records", label: "记录列表", icon: ListChecks, desc: "全量复核" },
  { to: "/render-3d", label: "3D 渲染", icon: Box, desc: "月底课前" },
  { to: "/test", label: "重复导入测试", icon: FlaskConical, desc: "测试路径" },
];

export default function Sidebar() {
  const loc = useLocation();
  return (
    <aside className="w-64 shrink-0 h-screen bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-accent/20 border border-accent/50 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="font-display font-semibold text-text-primary text-lg leading-tight">
              大型展台灯光预演
            </div>
            <div className="text-xs text-text-muted font-mono mt-0.5">
              LIGHT PREVIEW WORKSTATION
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all duration-200",
                active
                  ? "bg-accent/10 border-accent/50 text-accent shadow-glow-soft"
                  : "border-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  active ? "text-accent" : "text-text-muted group-hover:text-accent"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{it.label}</div>
                <div className="text-[10px] font-mono text-text-muted mt-0.5">{it.desc}</div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="panel p-3">
          <div className="text-xs text-text-muted font-mono">当前操作员</div>
          <div className="text-sm font-medium text-text-primary mt-1">李讲解员</div>
          <div className="text-[10px] font-mono text-text-muted mt-1">
            BATCH-2026-0603 · 今日 15 条
          </div>
        </div>
      </div>
    </aside>
  );
}
