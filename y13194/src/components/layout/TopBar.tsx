import { Bell, ChevronRight, HelpCircle, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { clsx } from "clsx";

interface TopBarProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
}

export function TopBar({ title, subtitle, breadcrumb }: TopBarProps) {
  const collapsed = useAppStore((s) => s.ui.rightPanelCollapsed);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-deepspace-700/60 bg-deepspace-900/50 px-6 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-mono">BR·Analyzer</span>
          <ChevronRight className="h-3 w-3" />
          {breadcrumb?.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={i === (breadcrumb?.length ?? 0) - 1 ? "text-cyber-400" : ""}>{b}</span>
              {i < (breadcrumb?.length ?? 0) - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <h1 className="truncate font-mono text-lg font-semibold text-slate-100">{title}</h1>
          {subtitle && <span className="mb-0.5 text-xs text-slate-500">{subtitle}</span>}
        </div>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="搜索电池编号/备注关键词..."
            className="input-deep w-72 pl-9 py-1.5 text-xs"
          />
        </div>
        <button className="btn-ghost !px-2.5 !py-1.5">
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs">文档</span>
        </button>
        <button className="relative btn-ghost !px-2.5 !py-1.5">
          <Bell className="h-4 w-4" />
          <span className="text-xs">通知</span>
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-alert-500"></span>
        </button>
        <button
          onClick={toggleRightPanel}
          className={clsx(
            "btn-ghost !px-2.5 !py-1.5 transition-all",
            !collapsed && "border-cyber-500/30 text-cyber-400",
          )}
          title={collapsed ? "展开详情面板" : "收起详情面板"}
        >
          {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
