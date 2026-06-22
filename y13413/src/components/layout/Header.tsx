import { useLocation } from "react-router-dom";
import { Search, Bell, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const breadcrumbMap: Record<string, string> = {
  "/": "总览看板",
  "/batches/new": "新建复核",
  "/records": "记录档案",
  "/anomalies": "异常看板",
  "/export": "报告导出",
};

export default function Header() {
  const location = useLocation();
  const currentPath = breadcrumbMap[location.pathname] || "未知页面";

  return (
    <header
      className={cn(
        "flex h-[60px] items-center justify-between",
        "px-8 bg-white border-b border-parchment-200"
      )}
    >
      <div className="flex items-center">
        <nav className="flex items-center gap-2 text-sm">
          <span className="font-mono text-charcoal-400">/</span>
          <span className="font-serif text-ink-700 font-medium">
            {currentPath}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            placeholder="搜索批次 / 记录编号..."
            className={cn(
              "pl-10 pr-4 py-2 w-72 rounded-md",
              "bg-parchment-50 border border-parchment-200",
              "font-mono text-sm text-charcoal-700 placeholder-charcoal-400",
              "focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-100",
              "transition-all duration-200"
            )}
          />
        </div>

        <button
          className={cn(
            "relative w-10 h-10 rounded-md flex items-center justify-center",
            "text-charcoal-500 hover:text-ink-600 hover:bg-parchment-100",
            "transition-colors duration-150"
          )}
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-vermilion-500" />
        </button>

        <button
          className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center",
            "text-charcoal-500 hover:text-ink-600 hover:bg-parchment-100",
            "transition-colors duration-150"
          )}
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
