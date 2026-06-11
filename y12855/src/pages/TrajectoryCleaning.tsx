import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers3,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CLEANING_PIPELINE } from "@/data/mockData";
import { PipelineStep } from "@/components/AuditCredential";
import { SectionTitle } from "@/components/FormulaCard";

export default function TrajectoryCleaning() {
  const [activeStep, setActiveStep] = useState(5);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const totalRemoved = useMemo(
    () => CLEANING_PIPELINE.reduce((acc, s) => acc + s.removedCount, 0),
    [],
  );
  const finalCount = CLEANING_PIPELINE[CLEANING_PIPELINE.length - 1].outputCount;
  const startCount = CLEANING_PIPELINE[0].outputCount;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto animate-slide-in-up">
      <SectionTitle
        title="轨迹清洗数据管道"
        subtitle="5 步可视化流程：去重 → 排序 → 插值 → 平滑 → 异常剔除，每步数据量可追溯"
        icon={<Layers3 className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-4 text-sm">
            <span className="chip bg-slate-100 text-slate-700 border border-slate-200">
              起始 {startCount} 点
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">
              最终 {finalCount} 点
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="chip bg-red-50 text-red-700 border border-red-200">
              剔除 {totalRemoved} 点
            </span>
          </div>
        }
      />

      <div className="card p-6 bg-gradient-to-br from-ocean-50/40 via-white to-parchment-50/30">
        <div className="flex flex-wrap items-stretch gap-x-1 gap-y-3">
          {CLEANING_PIPELINE.map((s, idx) => (
            <div
              key={s.step}
              className="flex-1 min-w-[140px]"
            >
              <PipelineStep
                step={String(idx + 1)}
                label={s.stepLabel}
                inputCount={s.inputCount}
                outputCount={s.outputCount}
                description={s.description}
                isFirst={idx === 0}
                isLast={idx === CLEANING_PIPELINE.length - 1}
                isActive={activeStep === idx}
                onClick={() => setActiveStep(idx)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-5">
          <div className="card overflow-hidden">
            <button
              onClick={() => setDetailsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-3 border-b border-steel-100 bg-ocean-50/40 hover:bg-ocean-50"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ocean-600" />
                <h3 className="font-serif font-semibold text-ocean-800">
                  第 {activeStep + 1} 步详情：{CLEANING_PIPELINE[activeStep].stepLabel}
                </h3>
              </div>
              {detailsOpen ? (
                <ChevronUp className="w-4 h-4 text-ocean-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-ocean-500" />
              )}
            </button>
            {detailsOpen && (
              <div className="p-5 space-y-4 animate-slide-in-up">
                <p className="text-sm text-ocean-700 leading-relaxed">
                  {CLEANING_PIPELINE[activeStep].description}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <MiniStat
                    label="输入点数量"
                    value={CLEANING_PIPELINE[activeStep].inputCount}
                    tone="slate"
                  />
                  <MiniStat
                    label="输出点数量"
                    value={CLEANING_PIPELINE[activeStep].outputCount}
                    tone="emerald"
                  />
                  <MiniStat
                    label="本步剔除"
                    value={CLEANING_PIPELINE[activeStep].removedCount}
                    tone={CLEANING_PIPELINE[activeStep].removedCount > 0 ? "red" : "slate"}
                  />
                </div>

                <div>
                  <div className="label mb-2">剔除样例记录（本步）</div>
                  <div className="rounded-md border border-steel-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-steel-50 text-ocean-600 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">轨迹点 ID</th>
                          <th className="text-left px-3 py-2 font-semibold">时间戳</th>
                          <th className="text-right px-3 py-2 font-semibold">经纬度</th>
                          <th className="text-right px-3 py-2 font-semibold">航速</th>
                          <th className="text-left px-3 py-2 font-semibold">剔除原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-steel-100">
                        {buildSampleRows(CLEANING_PIPELINE[activeStep].step).map((r, i) => (
                          <tr key={i} className="hover:bg-ocean-50/40">
                            <td className="px-3 py-2 font-mono text-ocean-600">{r.id}</td>
                            <td className="px-3 py-2 font-mono text-ocean-500">{r.time}</td>
                            <td className="px-3 py-2 font-mono text-right">{r.coord}</td>
                            <td className="px-3 py-2 font-mono text-right">{r.speed}</td>
                            <td className="px-3 py-2">
                              <span className="chip bg-red-50 text-red-700 border border-red-200 text-[10px]">
                                {r.reason}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-ocean-600" />
              <h3 className="font-serif font-semibold text-ocean-800">
                清洗后轨迹缩略（可视化）
              </h3>
            </div>
            <TrajectoryMiniChart />
          </div>
        </div>

        <div className="col-span-5 space-y-5">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif font-semibold text-lg leading-tight">
                    清洗完成 · 质量评估
                  </div>
                  <div className="text-xs text-emerald-50/90 mt-0.5">
                    数据完整性评估 95.6%，可用于后续漂移计算
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  label: "时间覆盖率",
                  value: 97,
                  hint: "巡检时段 05:30 - 07:50 覆盖完整",
                },
                {
                  label: "空间连续性",
                  value: 94,
                  hint: "仅 2 处插值补点，误差 < 30 米",
                },
                {
                  label: "速度合理性",
                  value: 99,
                  hint: "所有点航速 3.2 - 5.7 节，符合投喂船特征",
                },
                {
                  label: "AIS 报文匹配率",
                  value: 92,
                  hint: "44 个点中 2 点无法匹配 MMSI，已剔除",
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ocean-700 font-medium">{m.label}</span>
                    <span className="font-mono text-ocean-800 font-bold">{m.value}%</span>
                  </div>
                  <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        m.value >= 95
                          ? "bg-emerald-500"
                          : m.value >= 90
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-ocean-500">{m.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-ocean-800">数据工程师提示</h3>
            </div>
            <ul className="space-y-2 text-sm text-ocean-700 leading-relaxed">
              {[
                "本管道输出已缓存至本地，可直接用于「轨迹漂移计算」模块。",
                "若后续发现新的异常规则，可重跑整条管道而非人工修正。",
                "本步剔除的 2 个跳点已备份，可在修正留痕中心申请恢复。",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 mt-0.5 shrink-0 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-ocean-800">剔除点汇总</h3>
            </div>
            <div className="rounded-md border border-steel-100 divide-y divide-steel-100 text-xs">
              {CLEANING_PIPELINE.filter((s) => s.removedCount > 0).map((s) => (
                <div key={s.step} className="flex items-center justify-between px-3 py-2">
                  <span className="text-ocean-600">{s.stepLabel}</span>
                  <span className="chip bg-red-50 text-red-700 border border-red-200">
                    -{s.removedCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "red";
}) {
  const map = {
    slate: "bg-steel-50 border-steel-200 text-ocean-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
  } as const;
  return (
    <div className={`rounded-md border px-4 py-3 ${map[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
        {label}
      </div>
      <div className="font-serif font-bold text-2xl mt-0.5">{value}</div>
    </div>
  );
}

function buildSampleRows(step: string) {
  switch (step) {
    case "dedup":
      return [
        {
          id: "tp-0612-0042",
          time: "06:32:15",
          coord: "35.6298, 120.1196",
          speed: "4.1 kn",
          reason: "与 #0041 重复",
        },
        {
          id: "tp-0612-0067",
          time: "06:47:03",
          coord: "35.6311, 120.1202",
          speed: "4.6 kn",
          reason: "与 #0066 同时间戳",
        },
      ];
    case "outlier":
      return [
        {
          id: "tp-0612-0089",
          time: "07:02:44",
          coord: "35.9028, 120.4501",
          speed: "32.4 kn",
          reason: "速度>30节跳点",
        },
        {
          id: "tp-0612-0111",
          time: "07:15:10",
          coord: "36.0012, 121.0018",
          speed: "41.2 kn",
          reason: "位置跳变异常",
        },
      ];
    case "smooth":
    case "interpolate":
      return [
        {
          id: "—",
          time: "—",
          coord: "—",
          speed: "—",
          reason: "本步不剔除数据",
        },
      ];
    default:
      return [
        { id: "—", time: "—", coord: "—", speed: "—", reason: "本步无剔除" },
      ];
  }
}

function TrajectoryMiniChart() {
  const pts = [];
  for (let i = 0; i < 44; i++) {
    const t = i / 43;
    const x = 40 + t * 520;
    const y = 180 - Math.sin(t * 3.5) * 55 - t * 40 + (Math.sin(i * 0.9) * 8);
    pts.push({ x, y });
  }
  return (
    <svg viewBox="0 0 600 240" className="w-full h-60 rounded-md bg-ocean-50/40 border border-steel-100">
      <defs>
        <linearGradient id="traj" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#1A5F7A" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#1A5F7A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d={pts
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(" ")}
        fill="none"
        stroke="url(#traj)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.filter((_, i) => i % 5 === 0).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#1A5F7A" strokeWidth="1.5" />
      ))}
      <text x="40" y="30" fontSize="11" fill="#86aac3" fontFamily="monospace">
        起 · 青岛港锚地 35.58,120.08
      </text>
      <text x="560" y="220" fontSize="11" fill="#10B981" fontFamily="monospace" textAnchor="end">
        终 · 返港点
      </text>
      <text x="300" y="15" fontSize="10" fill="#6490ae" textAnchor="middle">
        清洗后 44 个轨迹点示意图（非真实比例）
      </text>
    </svg>
  );
}
