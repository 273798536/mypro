import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun, Bell, User, Search } from "lucide-react";
import { useAppStore } from "@/store/appStore";

interface TopNavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopNav({ title, subtitle, actions }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const pendingCount = useAppStore((s) =>
    s.records.filter((r) => r.status === "pending").length
  );
  const conflictCount = useAppStore((s) => s.conflicts.filter((c) => !c.resolution).length);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-serif-sc font-semibold text-slate-800 dark:text-slate-100 truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
        )}
      </div>

      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="搜索记录..."
            className="w-56 pl-9 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      <div className="flex items-center gap-1">
        <button className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
          {(pendingCount > 0 || conflictCount > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount + conflictCount}
            </span>
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
          ) : (
            <Moon className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
          )}
        </button>

        <div className="flex items-center gap-2 pl-2 ml-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">
              {currentUser}
            </p>
            <p className="text-xs text-slate-400">投研助理</p>
          </div>
        </div>
      </div>
    </header>
  );
}
