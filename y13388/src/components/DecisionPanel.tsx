import { useState } from "react";
import { useDashboardStore } from "@/store/dashboardStore";
import { useNavigate } from "react-router-dom";
import { DECISION_CATEGORY } from "@/utils/constants";
import type { DecisionCategoryKey } from "@/utils/constants";
import { formatRelativeTime, shortSampleId } from "@/utils/formatters";
import { ClipboardList, Plus, CheckCircle2, AlertOctagon, Trash2, ExternalLink, X } from "lucide-react";

export default function DecisionPanel() {
  const nav = useNavigate();
  const { decisionItems, removeDecision, markDecision, allSamples, filters } = useDashboardStore();
  const [showAdd, setShowAdd] = useState<null | { category: DecisionCategoryKey }>(null);
  const [addSampleId, setAddSampleId] = useState("");
  const [addRemark, setAddRemark] = useState("");

  const needMore = decisionItems.filter((d) => d.category === "NEED_MORE");
  const passed = decisionItems.filter((d) => d.category === "PASSED");

  const doAdd = () => {
    if (!showAdd || !addSampleId.trim()) return;
    markDecision(addSampleId.trim(), showAdd.category, addRemark.trim() || "值班快速标记");
    setShowAdd(null);
    setAddSampleId("");
    setAddRemark("");
  };

  return (
    <aside className="panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 p-4">
        <div>
          <div className="section-title">
            <ClipboardList size={15} className="text-signal-amber" />
            值班决策面板
          </div>
          <div className="mt-1 text-[11px] text-ink-500">
            告诉小林：哪条材料该补 · 哪条可以放行
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <DecisionSection
          title="待补材料"
          accent="amber"
          icon={AlertOctagon}
          items={needMore}
          onAdd={() => setShowAdd({ category: "NEED_MORE" })}
          onRemove={removeDecision}
          onOpen={(sid) => nav(`/sample/${sid}`)}
          categoryLabel={DECISION_CATEGORY.NEED_MORE}
        />
        <DecisionSection
          title="可放行"
          accent="green"
          icon={CheckCircle2}
          items={passed}
          onAdd={() => setShowAdd({ category: "PASSED" })}
          onRemove={removeDecision}
          onOpen={(sid) => nav(`/sample/${sid}`)}
          categoryLabel={DECISION_CATEGORY.PASSED}
        />
      </div>

      <div className="border-t border-ink-700/60 p-3">
        <button
          onClick={() => nav("/timeline")}
          className="btn-primary w-full !justify-center"
        >
          导出当日时间线留档
          <ExternalLink size={14} />
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700/60 p-4">
              <div className="section-title">
                {showAdd.category === "NEED_MORE" ? (
                  <AlertOctagon size={15} className="text-signal-amber" />
                ) : (
                  <CheckCircle2 size={15} className="text-signal-green" />
                )}
                新增「{DECISION_CATEGORY[showAdd.category]}」
              </div>
              <button onClick={() => setShowAdd(null)} className="text-ink-500 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  样本 ID
                </label>
                <input
                  value={addSampleId}
                  onChange={(e) => setAddSampleId(e.target.value)}
                  placeholder="例如 SPL-20260621-00482"
                  className="input-field font-mono"
                  list="sample-suggest"
                />
                <datalist id="sample-suggest">
                  {allSamples
                    .filter(
                      (s) =>
                        !decisionItems.some((d) => d.sampleId === s.id) &&
                        (!filters.keyword || s.id.toLowerCase().includes(filters.keyword.toLowerCase()))
                    )
                    .slice(0, 12)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.source} · {s.conclusion}
                      </option>
                    ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  原因备注
                </label>
                <textarea
                  value={addRemark}
                  onChange={(e) => setAddRemark(e.target.value)}
                  rows={3}
                  placeholder="为什么补材料 / 为什么放行"
                  className="input-field resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowAdd(null)} className="btn-ghost">取消</button>
                <button
                  onClick={doAdd}
                  disabled={!addSampleId.trim()}
                  className={showAdd.category === "NEED_MORE" ? "btn-primary" : "btn-primary !border-signal-green/70 !bg-signal-green/10 !text-signal-green hover:!bg-signal-green/20"}
                >
                  <Plus size={14} />
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function DecisionSection({
  title,
  accent,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  onOpen,
  categoryLabel,
}: {
  title: string;
  accent: "amber" | "green";
  icon: typeof AlertOctagon;
  items: ReturnType<typeof useDashboardStore.getState>["decisionItems"];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onOpen: (sampleId: string) => void;
  categoryLabel: string;
}) {
  const barColor = accent === "amber" ? "bg-signal-amber" : "bg-signal-green";
  const textColor = accent === "amber" ? "text-signal-amber" : "text-signal-green";
  const tagBorder = accent === "amber" ? "border-signal-amber/40 bg-signal-amber/10" : "border-signal-green/40 bg-signal-green/10";

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-4 w-1 rounded-full ${barColor}`} />
          <div className="text-sm font-semibold text-slate-200">{title}</div>
          <span className={`tag ${tagBorder} ${textColor}`}>{items.length}</span>
        </div>
        <button onClick={onAdd} className={`rounded-md p-1 ${textColor} transition hover:bg-ink-800`} title={`新增${categoryLabel}`}>
          <Plus size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink-700/60 bg-ink-900/30 p-4 text-center text-[11px] text-ink-500">
            暂无「{categoryLabel}」项，点击 <Plus size={11} className="mx-0.5 inline" /> 添加
          </div>
        )}
        {items.map((d) => (
          <div
            key={d.id}
            className="group rounded-lg border border-ink-700/50 bg-ink-900/40 p-3 transition hover:border-ink-600/80 hover:bg-ink-900/70"
          >
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => onOpen(d.sampleId)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-200 truncate">
                    {shortSampleId(d.sampleId)}
                  </span>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] ${tagBorder} ${textColor}`}>
                    {categoryLabel}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-ink-500 line-clamp-2">
                  {d.remark || <span className="italic">无备注</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-500">
                  <Icon size={10} className={textColor} />
                  <span>{formatRelativeTime(d.createdAt)}</span>
                  <span>·</span>
                  <span>{d.operator}</span>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => onOpen(d.sampleId)}
                  className="rounded p-1 text-ink-500 hover:bg-ink-800 hover:text-signal-cyan"
                  title="打开样本详情"
                >
                  <ExternalLink size={12} />
                </button>
                <button
                  onClick={() => onRemove(d.id)}
                  className="rounded p-1 text-ink-500 hover:bg-ink-800 hover:text-signal-red"
                  title="移除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
