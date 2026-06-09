import { useVolumeStore } from "@/store/useVolumeStore";
import { compareBatches } from "@/utils/historyComparator";
import { ArrowDown, ArrowUp, Minus, GitCompare } from "lucide-react";

export default function HistoryCompare() {
  const { currentBatch, compareBatch, batches, compareBatchId, setCompareBatchId } = useVolumeStore();

  const diffs = compareBatch ? compareBatches(compareBatch, currentBatch) : [];

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card animate-fadeUp" style={{ animationDelay: "420ms" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-ink-500" />
          <h3 className="serif text-base font-semibold text-ink-800">历史对比 · 约束校验前后差别</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="serif text-ink-400">对比批次</span>
          <select
            value={compareBatchId ?? ""}
            onChange={(e) => setCompareBatchId(e.target.value || null)}
            className="bg-paper border border-ink-100 rounded px-2 py-1 mono text-ink-700 focus:outline-none focus:border-amber-300"
          >
            <option value="">（不对比）</option>
            {batches.filter((b) => b.id !== currentBatch.id).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5">
        {!compareBatch ? (
          <p className="serif text-sm text-ink-400 text-center py-6">请在右上角选择对比批次</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ConstraintColumn title={`旧批次 · ${compareBatch.name}`} batch={compareBatch} side="old" diffs={diffs} />
            <ConstraintColumn title={`新批次 · ${currentBatch.name}`} batch={currentBatch} side="new" diffs={diffs} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConstraintColumn({
  title, batch, side, diffs,
}: {
  title: string; batch: ReturnType<typeof useVolumeStore.getState>["currentBatch"];
  side: "old" | "new"; diffs: ReturnType<typeof compareBatches>;
}) {
  const constraints = batch.constraints ?? [];

  return (
    <div className="border border-ink-100 rounded-lg overflow-hidden">
      <div className="bg-ink-50 px-4 py-2 border-b border-ink-100">
        <p className="serif text-sm font-semibold text-ink-700">{title}</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="serif text-ink-400 text-left">
            <th className="px-3 py-2 font-normal">约束项</th>
            <th className="px-3 py-2 font-normal mono text-right">当前值</th>
            <th className="px-3 py-2 font-normal mono text-right">阈值</th>
            <th className="px-3 py-2 font-normal text-center">状态</th>
          </tr>
        </thead>
        <tbody>
          {constraints.map((c) => {
            const diff = diffs.find((d) => d.constraintName === c.constraintName);
            const changed = diff?.changed;
            const val = side === "old" ? diff?.oldValue ?? c.value : diff?.newValue ?? c.value;
            const passed = side === "old" ? diff?.oldPassed ?? c.passed : diff?.newPassed ?? c.passed;
            const delta = diff && side === "new" ? diff.newValue - diff.oldValue : 0;

            return (
              <tr
                key={c.id}
                className={`border-t border-ink-50 ${changed ? "animate-breathe" : ""}`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="serif text-ink-700">{c.constraintName}</span>
                    {changed && (
                      <span className="serif text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                        前后有变化
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 mono text-ink-800 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {side === "new" && diff && delta !== 0 && (
                      delta > 0
                        ? <ArrowUp className="w-3 h-3 text-brick-500" />
                        : <ArrowDown className="w-3 h-3 text-mist-500" />
                    )}
                    {val >= 1000 ? val.toLocaleString() : val}{c.unit ? ` ${c.unit}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2 mono text-ink-400 text-right">
                  {c.threshold >= 1000 ? c.threshold.toLocaleString() : c.threshold}{c.unit ? ` ${c.unit}` : ""}
                </td>
                <td className="px-3 py-2 text-center">
                  {passed ? (
                    <span className="inline-flex items-center gap-1 serif text-[11px] text-mist-600 bg-mist-50 px-2 py-0.5 rounded border border-mist-100">
                      <Minus className="w-2.5 h-2.5" /> 通过
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 serif text-[11px] text-brick-600 bg-brick-50 px-2 py-0.5 rounded border border-brick-100">
                      <Minus className="w-2.5 h-2.5" /> 未通过
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
