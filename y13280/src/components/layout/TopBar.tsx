import { User, Bell, Search, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function TopBar() {
  const operator = useAppStore((s) => s.currentOperator);
  const session = useAppStore((s) => s.currentSession);
  const keyword = useAppStore((s) => s.filter.keyword);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-neutral-200 px-6 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <h1 className="font-serif text-lg font-semibold text-neutral-900">
          公园噪声点位归并
        </h1>
        <span className="px-2 py-0.5 bg-risk-50 text-risk-600 text-xs font-medium rounded-civic border border-risk-200">
          彩排版本
        </span>
      </div>

      <div className="flex-1 max-w-md ml-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
            placeholder="搜索点位名称 / 组号 / 坐标..."
            className="input-field pl-9 pr-9"
          />
          {keyword && (
            <button
              onClick={() => setFilter({ keyword: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-neutral-500">值班班次</div>
          <div className="text-sm font-mono text-neutral-700">{session}</div>
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-civic border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-late-500 rounded-full border-2 border-white" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-neutral-200">
          <div className="w-8 h-8 rounded-full bg-civic-100 text-civic-700 flex items-center justify-center border border-civic-200">
            <User className="w-4 h-4" />
          </div>
          <div className="text-sm">
            <div className="font-medium text-neutral-800 leading-tight">
              {operator}
            </div>
            <div className="text-[11px] text-neutral-500 leading-tight">
              {operator.includes("老曹") ? "市政设计" : "算法值班"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
