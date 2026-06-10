import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Customized,
} from "recharts";
import { Target, Info, Circle, TrendingUp, AlertTriangle, CheckCircle2, XCircle, MousePointer2 } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import { cn } from "@/lib/utils";

type SampleStatusValue = "normal" | "borderline" | "abnormal";

interface RawPCPoint {
  sampleId: string;
  pc1: number;
  pc2: number;
  batch: string;
  isOutlier: boolean;
  sigmaDistance: number;
  reason: string;
}

interface PointWithStatus extends RawPCPoint {
  status: SampleStatusValue;
  color: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateBatchPCA(batchId: string, count: number, seed = 42): RawPCPoint[] {
  const rand = seededRandom(seed);
  const points: RawPCPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() * 1.2;
    const pc1 = Math.cos(angle) * radius + (rand() - 0.5) * 0.4;
    const pc2 = Math.sin(angle) * radius + (rand() - 0.5) * 0.4;
    const sigmaDistance = Math.sqrt(pc1 * pc1 + pc2 * pc2);
    points.push({
      sampleId: `${batchId}-S${(i + 1).toString().padStart(3, "0")}`,
      pc1: Number(pc1.toFixed(3)),
      pc2: Number(pc2.toFixed(3)),
      batch: batchId,
      isOutlier: sigmaDistance > 3,
      sigmaDistance: Number(sigmaDistance.toFixed(2)),
      reason:
        sigmaDistance > 3
          ? `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，超出3σ控制线，疑似批次效应离群点`
          : sigmaDistance > 1.5
          ? `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，位于边界附近需关注`
          : `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，聚类正常`,
    });
  }
  return points;
}

function injectSpecificPoints(): RawPCPoint[] {
  return [
    {
      sampleId: "P-2026-0611-001",
      pc1: 0.42,
      pc2: -0.31,
      batch: "BAT-2026-W24",
      isOutlier: false,
      sigmaDistance: 0.78,
      reason: "距离批次聚类中心0.8σ，完全位于核心聚类区",
    },
    {
      sampleId: "P-2026-0611-002",
      pc1: 1.52,
      pc2: -0.98,
      batch: "BAT-2026-W24",
      isOutlier: false,
      sigmaDistance: 1.81,
      reason: "距离批次聚类中心1.8σ，位于2σ边界，需人工确认是否批次效应",
    },
    {
      sampleId: "P-2026-0611-003",
      pc1: 3.98,
      pc2: 1.52,
      batch: "BAT-2026-W24",
      isOutlier: true,
      sigmaDistance: 4.26,
      reason: "距离批次聚类中心4.3σ，远超3σ控制线，结合采样地C-2-11历史异常3次，高度怀疑环境污染导致批次效应",
    },
  ];
}

function getAllBatchPoints(): RawPCPoint[] {
  const base = generateBatchPCA("BAT-2026-W24", 18, 2026);
  const specific = injectSpecificPoints();
  const merged = base.filter((p) => !specific.find((s) => s.sampleId === p.sampleId));
  return [...merged, ...specific];
}

function buildConcentricCircles(cx: number, cy: number, radiusBase: number) {
  const sigmas = [1, 2, 3];
  return sigmas.map((s) => ({
    sigma: s,
    cx,
    cy,
    r: radiusBase * s,
  }));
}

function ConcentricCircles({ cx, cy, maxRadius }: { cx: number; cy: number; maxRadius: number }) {
  const circles = buildConcentricCircles(cx, cy, maxRadius / 3);
  return (
    <g>
      {circles.map((c) => (
        <circle
          key={c.sigma}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={c.sigma === 3 ? 1.5 : 1}
          strokeDasharray="4 4"
          opacity={c.sigma === 3 ? 0.7 : 0.45}
        />
      ))}
      <text x={cx + 4} y={cy - maxRadius / 3 - 4} fontSize={10} fill="#64748b" opacity={0.7}>
        1σ
      </text>
      <text x={cx + 4} y={cy - (maxRadius / 3) * 2 - 4} fontSize={10} fill="#64748b" opacity={0.7}>
        2σ
      </text>
      <text x={cx + 4} y={cy - maxRadius - 4} fontSize={10} fill="#64748b" opacity={0.8}>
        3σ (控制线)
      </text>
    </g>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PointWithStatus }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="font-mono text-xs font-semibold text-primary-800">{p.sampleId}</p>
      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
        <p>PC1: <span className="font-medium tabular-nums text-slate-800">{p.pc1.toFixed(3)}</span></p>
        <p>PC2: <span className="font-medium tabular-nums text-slate-800">{p.pc2.toFixed(3)}</span></p>
        <p>距离: <span className="font-medium tabular-nums text-primary-700">{p.sigmaDistance}σ</span></p>
      </div>
    </div>
  );
}

export default function BatchEffectChart() {
  const samples = useSampleStore((s) => s.samples);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const points = useMemo<PointWithStatus[]>(() => {
    const statusMap = new Map(samples.map((s) => [s.id, s.status]));
    return getAllBatchPoints().map((p) => {
      const st = statusMap.get(p.sampleId);
      let status: SampleStatusValue;
      let color: string;
      if (st) {
        status = st as SampleStatusValue;
      } else {
        status =
          p.sigmaDistance > 3
            ? "abnormal"
            : p.sigmaDistance > 1.5
            ? "borderline"
            : "normal";
      }
      color =
        status === "abnormal"
          ? "#dc2626"
          : status === "borderline"
          ? "#f59e0b"
          : "#0d9488";
      return { ...p, status, color };
    });
  }, [samples]);

  const normalData = useMemo(() => points.filter((p) => p.status === "normal"), [points]);
  const borderlineData = useMemo(() => points.filter((p) => p.status === "borderline"), [points]);
  const abnormalData = useMemo(() => points.filter((p) => p.status === "abnormal"), [points]);

  const selected = points.find((p) => p.sampleId === selectedId) ?? null;

  const stats = useMemo(() => {
    return {
      total: points.length,
      normal: normalData.length,
      borderline: borderlineData.length,
      abnormal: abnormalData.length,
    };
  }, [points, normalData, borderlineData, abnormalData]);

  return (
    <div
      className="animate-fade-in-up grid grid-cols-1 gap-5 lg:grid-cols-5"
      style={{ animationDelay: "480ms" }}
    >
      <div className="lg:col-span-3 rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-primary-900">
              <Target className="h-5 w-5 text-primary-600" />
              批次效应 PCA 散点图
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              主成分分析可视化 · 灰色虚线为 1σ / 2σ / 3σ 参考同心圆
            </p>
          </div>
          <div className="hidden items-center gap-3 text-xs sm:flex">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              正常 ({stats.normal})
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              边界 ({stats.borderline})
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              异常 ({stats.abnormal})
            </span>
          </div>
        </div>

        <div className="relative h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setSelectedId(e.activePayload[0].payload.sampleId);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="pc1"
                name="PC1"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{
                  value: "主成分 1 (PC1)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 11, fill: "#475569" },
                }}
              />
              <YAxis
                type="number"
                dataKey="pc2"
                name="PC2"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{
                  value: "主成分 2 (PC2)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#475569" },
                }}
              />
              <ZAxis type="number" range={[50, 120]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Customized
                component={(props: unknown) => {
                  const p = props as { viewBox?: { x: number; y: number; width: number; height: number } };
                  if (!p.viewBox) return null;
                  const cx = p.viewBox.x + p.viewBox.width / 2;
                  const cy = p.viewBox.y + p.viewBox.height / 2;
                  const maxR = Math.min(p.viewBox.width, p.viewBox.height) / 2 - 20;
                  return <ConcentricCircles cx={cx} cy={cy} maxRadius={maxR} />;
                }}
              />
              <Scatter
                name="正常"
                data={normalData}
                fill="#0d9488"
                fillOpacity={0.85}
                stroke="#0f766e"
                strokeWidth={selectedId ? 0.5 : 1}
              />
              <Scatter
                name="边界"
                data={borderlineData}
                fill="#f59e0b"
                fillOpacity={0.9}
                stroke="#d97706"
                strokeWidth={1}
              />
              <Scatter
                name="异常"
                data={abnormalData}
                fill="#dc2626"
                fillOpacity={0.9}
                stroke="#b91c1c"
                strokeWidth={1}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400 sm:hidden">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500"/>正常({stats.normal})</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"/>边界({stats.borderline})</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"/>异常({stats.abnormal})</span>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 p-5 shadow-card ring-1 ring-primary-100">
          <div className="flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-primary-600" />
            <h4 className="text-sm font-bold text-primary-900">批次效应判读说明</h4>
          </div>
          <ul className="mt-3 space-y-2.5 text-xs text-primary-800/90">
            <li className="flex gap-2">
              <Circle className="mt-0.5 h-3 w-3 shrink-0 fill-teal-500 text-teal-500" />
              <span>
                <b className="text-teal-700">1σ 以内（绿色）：</b>
                样本位于批次核心聚类区，重复性良好，无批次效应风险
              </span>
            </li>
            <li className="flex gap-2">
              <Circle className="mt-0.5 h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
              <span>
                <b className="text-amber-700">1σ–3σ（黄色）：</b>
                靠近聚类边界，建议结合采样记录与电泳图人工复核
              </span>
            </li>
            <li className="flex gap-2">
              <Circle className="mt-0.5 h-3 w-3 shrink-0 fill-red-500 text-red-500" />
              <span>
                <b className="text-red-700">超出 3σ（红色）：</b>
                显著离群，高度怀疑污染或操作失误，需重采样或废弃
              </span>
            </li>
          </ul>
        </div>

        <div className="flex-1 rounded-2xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-bold text-primary-900">
              <MousePointer2 className="h-4 w-4 text-primary-600" />
              点选明细
            </h4>
            {selected && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                清除
              </button>
            )}
          </div>

          {!selected ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center text-slate-400">
              <TrendingUp className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">点击左侧散点</p>
              <p className="mt-1 text-xs">查看对应样本的 σ 距离与具体原因</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div
                className={cn(
                  "rounded-xl p-3 ring-1",
                  selected.status === "normal"
                    ? "bg-teal-50 ring-teal-200"
                    : selected.status === "borderline"
                    ? "bg-amber-50 ring-amber-200"
                    : "bg-red-50 ring-red-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">样本 ID</p>
                    <p className="font-mono text-sm font-bold text-slate-800">{selected.sampleId}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      selected.status === "normal"
                        ? "bg-teal-500 text-white"
                        : selected.status === "borderline"
                        ? "bg-amber-500 text-white"
                        : "bg-red-500 text-white"
                    )}
                  >
                    {selected.status === "normal" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : selected.status === "borderline" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {selected.status === "normal"
                      ? "正常"
                      : selected.status === "borderline"
                      ? "边界"
                      : "异常"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">σ 距离</p>
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      selected.status === "normal"
                        ? "text-teal-700"
                        : selected.status === "borderline"
                        ? "text-amber-700"
                        : "text-red-700"
                    )}
                  >
                    {selected.sigmaDistance}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">PC1</p>
                  <p className="text-lg font-bold tabular-nums text-primary-700">
                    {selected.pc1.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">PC2</p>
                  <p className="text-lg font-bold tabular-nums text-primary-700">
                    {selected.pc2.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  具体原因
                </p>
                <div
                  className={cn(
                    "rounded-xl p-3.5 text-xs leading-relaxed",
                    selected.status === "normal"
                      ? "bg-teal-50/60 text-teal-900/90 border border-teal-100"
                      : selected.status === "borderline"
                      ? "bg-amber-50/60 text-amber-900/90 border border-amber-100"
                      : "bg-red-50/60 text-red-900/90 border border-red-100"
                  )}
                >
                  {selected.reason}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-[11px] text-slate-600">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                所属批次：<span className="font-mono font-semibold text-slate-800">{selected.batch}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
