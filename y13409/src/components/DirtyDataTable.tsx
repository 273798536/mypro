import { useState } from "react";
import { ChevronDown, AlertCircle, Tag, FileText, CheckCircle } from "lucide-react";
import type { SampleRecord, DataIssueType } from "@/types";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";

const issueConfig: Record<DataIssueType, { label: string; color: string; icon: typeof AlertCircle; bar: string }> = {
  normal: { label: "正常", color: "text-teal-jade bg-teal-pale", icon: CheckCircle, bar: "bg-teal-jade" },
  missing_field: { label: "缺字段", color: "text-red-700 bg-red-50", icon: AlertCircle, bar: "bg-red-500" },
  alias: { label: "别名", color: "text-amber-warm bg-amber-pale", icon: Tag, bar: "bg-amber-warm" },
  remark: { label: "补充备注", color: "text-blue-700 bg-blue-50", icon: FileText, bar: "bg-blue-500" },
};

interface RowProps {
  sample: SampleRecord;
  index: number;
}

function SampleRow({ sample, index }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const highlighted = useSamplingStore((s) => s.highlightedSampleId === sample.id);
  const cfg = issueConfig[sample.dataIssue];
  const Icon = cfg.icon;

  return (
    <>
      <tr
        id={`sample-row-${sample.id}`}
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "cursor-pointer transition-all border-l-4",
          cfg.bar,
          index % 2 === 0 ? "bg-white" : "bg-ink-50",
          "hover:bg-slate-100/60",
          highlighted && "animate-pulseHighlight ring-2 ring-amber-warm"
        )}
      >
        <td className="px-3 py-2.5 text-sm font-mono text-ink-500">{sample.id}</td>
        <td className="px-3 py-2.5 text-sm font-mono text-ink-900 font-medium">{sample.name}</td>
        <td className="px-3 py-2.5 text-sm font-mono">
          {sample.value !== undefined ? (
            <span className="text-ink-900">{sample.value.toLocaleString()}</span>
          ) : sample.filledValue ? (
            <span className="text-red-600 italic">{sample.filledValue.toLocaleString()} <span className="text-[10px]">(填充)</span></span>
          ) : (
            <span className="text-ink-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-sm font-mono">
          {sample.category ? (
            <span className="text-ink-700">{sample.category}</span>
          ) : sample.filledCategory ? (
            <span className="text-red-600 italic">{sample.filledCategory} <span className="text-[10px]">(填充)</span></span>
          ) : (
            <span className="text-ink-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono", cfg.color)}>
            <Icon size={11} />
            {cfg.label}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <ChevronDown
            size={14}
            className={cn("inline-block text-ink-500 transition-transform", expanded && "rotate-180")}
          />
        </td>
      </tr>
      {expanded && (
        <tr className={cn(index % 2 === 0 ? "bg-white" : "bg-ink-50")}>
          <td colSpan={6} className="px-6 py-3 border-t border-ink-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {sample.alias && (
                <div>
                  <span className="text-ink-500">别名 / 曾用名：</span>
                  <span className="text-amber-warm font-medium ml-1">{sample.alias}</span>
                </div>
              )}
              {sample.remark && (
                <div className="md:col-span-2">
                  <span className="text-ink-500">补充备注：</span>
                  <span className="text-blue-700 ml-1">{sample.remark}</span>
                </div>
              )}
              {sample.dataIssue === "missing_field" && (
                <div className="md:col-span-2 bg-red-50 border border-red-100 rounded-md p-2.5">
                  <span className="text-red-700 font-medium">⚠ 缺字段处理说明：</span>
                  <span className="text-red-800 ml-1">
                    {sample.id === "s003" && "value 缺失，已使用同批数据均值 1185.7 填充（见抽样步骤 3）"}
                    {sample.id === "s007" && "category 缺失，已标记为「未分类」，单独分层（见抽样步骤 3）"}
                  </span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DirtyDataTable() {
  const samples = useSamplingStore((s) => s.samples);

  return (
    <section id="data-section" className="bg-white rounded-xl shadow-card overflow-hidden animate-fadeUp">
      <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-900">原始数据（不干净版）</h3>
          <p className="text-xs font-mono text-ink-500 mt-0.5">
            缺字段 2 条 · 别名 2 条 · 补充备注 2 条 · 正常 6 条
          </p>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-100/80 text-left">
              <th className="px-3 py-2.5 text-xs font-mono font-semibold text-ink-500 uppercase tracking-wider">ID</th>
              <th className="px-3 py-2.5 text-xs font-mono font-semibold text-ink-500 uppercase tracking-wider">订单名称</th>
              <th className="px-3 py-2.5 text-xs font-mono font-semibold text-ink-500 uppercase tracking-wider">金额</th>
              <th className="px-3 py-2.5 text-xs font-mono font-semibold text-ink-500 uppercase tracking-wider">分层</th>
              <th className="px-3 py-2.5 text-xs font-mono font-semibold text-ink-500 uppercase tracking-wider">数据状态</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s, i) => (
              <SampleRow key={s.id} sample={s} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
