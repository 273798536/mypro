import { useState, useMemo } from "react";
import { usePartitionStore } from "@/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function ResultTable() {
  const { currentResult, showRemoved, toggleShowRemoved, warnings, config } =
    usePartitionStore();
  const [page, setPage] = useState(0);
  const [showMore, setShowMore] = useState(false);

  const hasExplosion = warnings.some((w) => w.type === "explosion");

  const filteredPartitions = useMemo(() => {
    if (!currentResult) return [];
    if (hasExplosion && !showMore) return currentResult.filteredPartitions.slice(0, 100);
    return currentResult.filteredPartitions;
  }, [currentResult, hasExplosion, showMore]);

  const totalCount = currentResult?.allPartitions.length ?? 0;
  const filteredCount = currentResult?.filteredPartitions.length ?? 0;
  const removedCount = currentResult?.removedPartitions.length ?? 0;

  const totalPages = Math.max(1, Math.ceil(filteredPartitions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedPartitions = filteredPartitions.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  const target = config.targetNumber;

  if (!currentResult) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50">
        <p className="text-lg text-slate-400 font-handwriting">
          暂无方案，请设置参数并点击生成
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-800/70 px-4 py-3 border border-slate-600/50">
        <span className="text-sm text-slate-300">
          全部方案: <strong className="text-amber-300 font-handwriting">{totalCount}</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-sm text-slate-300">
          符合条件: <strong className="text-emerald-400 font-handwriting">{filteredCount}</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-sm text-slate-300">
          已移除: <strong className="text-red-400 font-handwriting">{removedCount}</strong>
        </span>

        {removedCount > 0 && (
          <button
            onClick={toggleShowRemoved}
            className={cn(
              "ml-auto rounded px-3 py-1 text-xs transition-colors",
              showRemoved
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : "bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600"
            )}
          >
            {showRemoved ? "隐藏已移除" : "显示已移除"}
          </button>
        )}
      </div>

      <div className="max-h-[480px] overflow-y-auto rounded-lg border border-slate-600/50 bg-slate-800/50 scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-800">
            <tr className="border-b border-slate-600/50">
              <th className="w-14 px-3 py-2 text-left text-slate-400 font-normal">#</th>
              <th className="px-3 py-2 text-left text-slate-400 font-normal">拆分方案</th>
              <th className="w-20 px-3 py-2 text-right text-slate-400 font-normal">验证</th>
            </tr>
          </thead>
          <tbody>
            {pagedPartitions.map((partition, idx) => {
              const globalIdx = safePage * PAGE_SIZE + idx + 1;
              const sum = partition.reduce((a, b) => a + b, 0);
              const isValid = sum === target;

              return (
                <tr
                  key={`${globalIdx}-${partition.join(",")}`}
                  className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/40"
                >
                  <td className="px-3 py-2 text-slate-500 font-mono">{globalIdx}</td>
                  <td className="px-3 py-2">
                    <span className="font-handwriting text-emerald-300 tracking-wide">
                      {partition.join(" + ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isValid ? (
                      <span className="text-emerald-400 font-mono text-xs">✓ {sum}</span>
                    ) : (
                      <span className="text-red-400 font-mono text-xs">✗ {sum}</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {showRemoved &&
              currentResult.removedPartitions.map((item, idx) => {
                const sum = item.partition.reduce((a, b) => a + b, 0);
                return (
                  <tr
                    key={`removed-${idx}`}
                    className="border-b border-slate-700/50 bg-red-900/10 transition-colors hover:bg-red-900/20"
                  >
                    <td className="px-3 py-2 text-slate-600 font-mono line-through">
                      {filteredCount + idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-handwriting text-red-400/70 tracking-wide line-through">
                        {item.partition.join(" + ")}
                      </span>
                      <span className="ml-2 text-xs text-red-400/60">({item.reason})</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-red-400/50 font-mono text-xs line-through">
                        {sum}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {hasExplosion && !showMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowMore(true)}
            className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm text-amber-300 border border-amber-500/30 transition-colors hover:bg-amber-500/25"
          >
            显示更多（共 {filteredCount} 条）
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="rounded px-3 py-1 text-sm text-slate-300 bg-slate-700 border border-slate-600 transition-colors hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-slate-400">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded px-3 py-1 text-sm text-slate-300 bg-slate-700 border border-slate-600 transition-colors hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
