import { useState } from "react";
import { useStore } from "@/store/useStore";
import { exportComparison, downloadFile } from "@/utils/export";
import type { ExportFormat } from "@/types";

function DeltaValue({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const color =
    value < 0
      ? "text-orange-600"
      : value > 0
        ? "text-[#00BFA5]"
        : "text-slate-400";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`font-mono text-sm ${color}`}>
      {label}: {sign}
      {value.toFixed(3)}
    </span>
  );
}

function GmHighlight({ deltaGm }: { deltaGm: number | null }) {
  if (deltaGm === null) return null;
  let desc: string;
  let bgCls: string;
  let textCls: string;
  if (deltaGm < -0.05) {
    desc = "稳性显著降低";
    bgCls = "bg-orange-50 border-orange-200";
    textCls = "text-orange-600";
  } else if (deltaGm < 0) {
    desc = "稳性轻微降低";
    bgCls = "bg-orange-50/60 border-orange-100";
    textCls = "text-orange-500";
  } else if (deltaGm < 0.05) {
    desc = "稳性轻微提升";
    bgCls = "bg-teal-50/60 border-teal-100";
    textCls = "text-[#00BFA5]";
  } else {
    desc = "稳性显著提升";
    bgCls = "bg-teal-50 border-teal-200";
    textCls = "text-[#00a890]";
  }
  const sign = deltaGm > 0 ? "+" : "";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border ${bgCls} px-4 py-3`}
    >
      <span className={`font-display text-3xl font-bold ${textCls}`}>
        {sign}
        {deltaGm.toFixed(3)}
      </span>
      <span className={`text-sm ${textCls}`}>{desc}</span>
    </div>
  );
}

function CgColumn({
  title,
  cg,
  gm,
}: {
  title: string;
  cg: { x: number; y: number; z: number };
  gm: number | null;
}) {
  return (
    <div className="flex-1 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="font-mono text-sm text-slate-700">X: {cg.x.toFixed(3)}</p>
      <p className="font-mono text-sm text-slate-700">Y: {cg.y.toFixed(3)}</p>
      <p className="font-mono text-sm text-slate-700">Z: {cg.z.toFixed(3)}</p>
      {gm !== null && (
        <p className="font-mono text-sm text-[#00BFA5]">GM: {gm.toFixed(3)}</p>
      )}
    </div>
  );
}

export default function Compare() {
  const { impacts } = useStore();
  const [format, setFormat] = useState<ExportFormat>("csv");

  const handleExport = () => {
    if (!impacts.length) return;
    const content = exportComparison(impacts, format);
    const ext = format === "csv" ? "csv" : "json";
    downloadFile(content, `重心修改对比.${ext}`);
  };

  if (!impacts.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-body">
        <p className="text-lg text-slate-500">
          暂无重心修改记录。若船体参数中重心被人工修改，校验后将在此展示对比。
        </p>
        <a
          href="/"
          className="text-[#00BFA5] underline hover:text-[#00a890]"
        >
          前往数据录入
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-body">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-slate-800">方案对比</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs">
            <button
              onClick={() => setFormat("csv")}
              className={`px-2.5 py-1 ${format === "csv" ? "bg-[#0A2540] text-white" : "bg-white text-gray-600"}`}
            >
              CSV
            </button>
            <button
              onClick={() => setFormat("json")}
              className={`px-2.5 py-1 ${format === "json" ? "bg-[#0A2540] text-white" : "bg-white text-gray-600"}`}
            >
              JSON
            </button>
          </div>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a890]"
          >
            导出对比
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {impacts.map((impact, idx) => (
          <div
            key={impact.hullId}
            className="animate-fadeIn bg-white rounded-xl shadow-sm border border-slate-100 p-5"
            style={{
              animationDelay: `${idx * 80}ms`,
              animationFillMode: "both",
            }}
          >
            <h3 className="mb-4 font-display text-lg text-slate-800">
              {impact.hullName}
              <span className="ml-2 text-xs font-body text-orange-500 font-medium">
                重心已修改
              </span>
            </h3>

            <div className="flex items-start gap-2">
              <CgColumn
                title="修改前"
                cg={impact.originalCg}
                gm={impact.originalGm}
              />
              <div className="flex items-center px-2 text-slate-400">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
              <CgColumn
                title="修改后"
                cg={impact.modifiedCg}
                gm={impact.modifiedGm}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
              <DeltaValue label="ΔX" value={impact.deltaCg.x} />
              <DeltaValue label="ΔY" value={impact.deltaCg.y} />
              <DeltaValue label="ΔZ" value={impact.deltaCg.z} />
              <DeltaValue label="ΔGM" value={impact.deltaGm} />
            </div>

            {impact.deltaGm !== null && (
              <div className="mt-4">
                <GmHighlight deltaGm={impact.deltaGm} />
              </div>
            )}

            {impact.impactDescription && (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {impact.impactDescription}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
