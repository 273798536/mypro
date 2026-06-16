import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { HistoryTimelineItem } from "@/components/history/HistoryTimeline";
import { useAppStore } from "@/store/useAppStore";
import type { HistoryAction } from "@/types";
import { ACTION_LABEL } from "@/types";
import {
  History,
  ArrowLeft,
  Filter,
  UserCheck,
  CalendarClock,
  Download,
  Search,
  X,
} from "lucide-react";
import clsx from "clsx";

const ACTION_FILTERS: HistoryAction[] = ["confirm", "split", "merge", "doubt", "return"];

export function HistoryPage() {
  const records = useAppStore((s) => s.historyRecords);
  const navigate = useNavigate();
  const [actions, setActions] = useState<HistoryAction[]>([]);
  const [onlyLaoCao, setOnlyLaoCao] = useState(false);
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    let arr = [...records].sort(
      (a, b) => new Date(b.operateTime).getTime() - new Date(a.operateTime).getTime()
    );
    if (actions.length > 0) arr = arr.filter((r) => actions.includes(r.action));
    if (onlyLaoCao) arr = arr.filter((r) => r.operator.includes("老曹"));
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      arr = arr.filter((r) =>
        [r.operator, r.remark, r.groupId, r.sessionId, ACTION_LABEL[r.action]]
          .join(" ")
          .toLowerCase()
          .includes(kw)
      );
    }
    return arr;
  }, [records, actions, onlyLaoCao, keyword]);

  const toggleAction = (a: HistoryAction) =>
    setActions((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const laoCaoCount = records.filter((r) => r.operator.includes("老曹")).length;

  return (
    <PageContainer
      title="历史追溯面板"
      subtitle="按时间倒序追溯所有人工判断，老曹的修改蓝色高亮，所有操作不可删除"
      headerActions={
        <>
          <button onClick={() => navigate("/merge")} className="btn-outline">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </button>
          <button onClick={() => navigate("/export")} className="btn-primary">
            <Download className="w-4 h-4" />
            导出版本快照
          </button>
        </>
      }
    >
      <div className="card-base p-4 animate-fade-up">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索操作人 / 备注 / 组号 / 班次..."
                className="input-field pl-9 pr-8"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-600">操作类型:</span>
            {ACTION_FILTERS.map((a) => {
              const active = actions.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleAction(a)}
                  className={clsx(
                    "text-xs px-2 py-1 rounded-civic border transition-all",
                    active
                      ? "bg-civic-600 text-white border-civic-600"
                      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  {ACTION_LABEL[a]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setOnlyLaoCao((v) => !v)}
            className={clsx(
              "flex items-center gap-2 text-xs px-3 py-1.5 rounded-civic border transition-all",
              onlyLaoCao
                ? "bg-civic-600 text-white border-civic-600"
                : "bg-civic-50 text-civic-700 border-civic-200 hover:bg-civic-100"
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            只看老曹判断 ({laoCaoCount})
          </button>

          <div className="flex items-center gap-2 text-sm text-neutral-500 ml-auto">
            <CalendarClock className="w-4 h-4" />
            共 <span className="font-mono font-bold text-civic-600">{filtered.length}</span> 条记录
          </div>
        </div>
      </div>

      <div className="card-base p-6 overflow-hidden animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-civic-300 via-neutral-200 to-neutral-100" />

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div className="font-medium">没有匹配的历史记录</div>
              <div className="text-xs mt-1">请调整筛选条件</div>
            </div>
          ) : (
            <div className="space-y-8 py-4">
              {filtered.map((r, i) => (
                <HistoryTimelineItem
                  key={r.recordId}
                  record={r}
                  index={i}
                  isLeft={i % 2 === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
