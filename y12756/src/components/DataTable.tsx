import { AlertTriangle, CheckCircle2, Clock, Edit3 } from "lucide-react";
import type { SampleRecord } from "@/types";
import { useLabStore } from "@/store/useLabStore";
import { useState } from "react";

interface Props {
  samples: SampleRecord[];
}

export const DataTable = ({ samples }: Props) => {
  const { selectedSampleId, setSelectedSample, supplementField } = useLabStore();
  const [editing, setEditing] = useState<{
    sampleId: string;
    field: "reactionTime" | "concentrationUnit";
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const judgeColor = (r: string) =>
    r === "络合"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : r === "未络合"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  const startEdit = (sampleId: string, field: "reactionTime" | "concentrationUnit", current: string | number | null) => {
    setEditing({ sampleId, field });
    setEditValue(current == null ? "" : String(current));
  };

  const commitEdit = () => {
    if (!editing) return;
    if (editing.field === "reactionTime") {
      const numVal = Number(editValue);
      if (Number.isNaN(numVal) || numVal <= 0) return;
      supplementField(editing.sampleId, editing.field, numVal);
    } else {
      if (!editValue.trim()) return;
      supplementField(editing.sampleId, editing.field, editValue);
    }
    setEditing(null);
    setEditValue("");
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-5 py-3">
        <h3 className="panel-title">浓度数据原始记录</h3>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span className="tag bg-rose-50 text-rose-600">
            <AlertTriangle className="mr-1 h-3 w-3" />
            斜纹=漏记
          </span>
          <span className="tag bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            完整
          </span>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto scrollbar-thin">
        <table className="w-full min-w-[780px] border-collapse font-mono text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">
              <th className="border-b border-ink-100 px-4 py-3">样本</th>
              <th className="border-b border-ink-100 px-4 py-3">金属离子</th>
              <th className="border-b border-ink-100 px-4 py-3">配体</th>
              <th className="border-b border-ink-100 px-4 py-3">浓度</th>
              <th className="border-b border-ink-100 px-4 py-3">反应时间</th>
              <th className="border-b border-ink-100 px-4 py-3">λ峰(nm)</th>
              <th className="border-b border-ink-100 px-4 py-3">吸光度A</th>
              <th className="border-b border-ink-100 px-4 py-3">判读</th>
              <th className="border-b border-ink-100 px-4 py-3">来源</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s, idx) => {
              const isSelected = s.id === selectedSampleId;
              return (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSample(isSelected ? null : s.id)}
                  className={`cursor-pointer transition-colors ${
                    idx % 2 === 0 ? "bg-white" : "bg-ink-50/30"
                  } ${isSelected ? "!bg-copper-50/70" : "hover:bg-ink-50"}`}
                >
                  <td className="border-b border-ink-50 px-4 py-3 text-ink-800 font-semibold">
                    <div className="flex items-center gap-2">
                      {s.isAnomaly && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {s.sampleNo}
                    </div>
                    {s.supplementNote && (
                      <div className="mt-0.5 text-[10px] text-copper-700 italic not-italic">
                        ✎ {s.supplementNote}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-ink-50 px-4 py-3">{s.metalIon}</td>
                  <td className="border-b border-ink-50 px-4 py-3 text-xs">{s.ligand}</td>
                  <td
                    className={`border-b border-ink-50 px-4 py-3 ${
                      s.isMissingUnit ? "missing-cell" : ""
                    }`}
                  >
                    {editing?.sampleId === s.id && editing.field === "concentrationUnit" ? (
                      <div className="flex items-center gap-1">
                        <span className="text-ink-500">{s.concentration}</span>
                        <input
                          autoFocus
                          className="w-20 rounded border border-copper-400 bg-white px-1 py-0.5 text-xs outline-none focus:ring-2 focus:ring-copper-300"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                          onBlur={commitEdit}
                          placeholder="单位"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {s.concentration == null ? (
                          <span className="text-red-500">—</span>
                        ) : (
                          <span>{s.concentration}</span>
                        )}
                        {s.isMissingUnit ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(s.id, "concentrationUnit", s.concentrationUnit);
                            }}
                            className="rounded border border-dashed border-red-400 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-100"
                          >
                            <Edit3 className="inline h-3 w-3" /> 缺单位
                          </button>
                        ) : (
                          <span className="text-ink-500">{s.concentrationUnit}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td
                    className={`border-b border-ink-50 px-4 py-3 ${
                      s.isMissingReactionTime ? "missing-cell" : ""
                    }`}
                  >
                    {editing?.sampleId === s.id && editing.field === "reactionTime" ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="number"
                          className="w-16 rounded border border-copper-400 bg-white px-1 py-0.5 text-xs outline-none focus:ring-2 focus:ring-copper-300"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                          onBlur={commitEdit}
                        />
                        <span className="text-xs text-ink-500">
                          {s.reactionTimeUnit || "min"}
                        </span>
                      </div>
                    ) : s.isMissingReactionTime ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(s.id, "reactionTime", null);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-dashed border-red-400 bg-red-50 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-100"
                      >
                        <Clock className="h-3 w-3" />
                        漏记 · 点击补录
                      </button>
                    ) : (
                      <span>
                        {s.reactionTime} {s.reactionTimeUnit}
                      </span>
                    )}
                  </td>
                  <td className="border-b border-ink-50 px-4 py-3">{s.peakWavelength}</td>
                  <td
                    className={`border-b border-ink-50 px-4 py-3 ${
                      s.anomalyType === "outlier" ? "text-red-600 font-semibold" : ""
                    }`}
                  >
                    {s.peakAbsorbance.toFixed(3)}
                    {s.anomalyType === "outlier" && (
                      <span className="ml-1 text-[10px] text-red-500">⚠离群</span>
                    )}
                  </td>
                  <td className="border-b border-ink-50 px-4 py-3">
                    <span
                      className={`tag border ${judgeColor(s.judgeResult)}`}
                    >
                      {s.judgeResult}
                      {s.manuallyOverridden && (
                        <span className="ml-1 text-[9px] opacity-70">人工</span>
                      )}
                    </span>
                  </td>
                  <td className="border-b border-ink-50 px-4 py-3 text-[11px] text-ink-500">
                    {s.sourceDoc}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
