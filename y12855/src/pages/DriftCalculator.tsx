import {
  Calculator,
  CloudSun,
  Compass,
  FileWarning,
  Gauge,
  Layers,
  MapPin,
  Play,
  RefreshCw,
  Radar,
  Ruler,
  Table2,
  Thermometer,
  Wind,
} from "lucide-react";
import { useDriftStore } from "@/store/driftStore";
import {
  FailureHint,
  FormulaCard,
  SectionTitle,
} from "@/components/FormulaCard";
import {
  APPLICABLE_SCOPE,
  DRIFT_RATE_FORMULA,
  HAVERSINE_FORMULA,
} from "@/utils/formulas";

export default function DriftCalculator() {
  const { input, setInput, result, isCalculating, run, reset } = useDriftStore();

  const rate = result?.driftRatePercent ?? 0;
  const driftLevel =
    rate >= 8 ? { label: "显著漂移", cls: "text-red-600", bar: "bg-red-500" }
      : rate >= 3 ? { label: "轻微漂移", cls: "text-amber-600", bar: "bg-amber-500" }
      : { label: "正常", cls: "text-emerald-600", bar: "bg-emerald-500" };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto animate-slide-in-up">
      <SectionTitle
        title="轨迹漂移计算工具"
        subtitle="透明化公式、单位、适用范围与失败原因，处理失败时给出可操作的补传指引"
        icon={<Compass className="w-5 h-5" />}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-5">
          <div className="card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-ocean-100 text-ocean-700 flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-semibold text-ocean-800">输入参数</h3>
              <span className="ml-auto text-[11px] text-ocean-500">
                已自动填充东湾 A 区示例数据
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label mb-1 block flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    有效轨迹点数
                  </label>
                  <div className="font-mono text-sm bg-steel-50 px-3 py-2 rounded-md border border-steel-200">
                    {input.actualTrajectory.length} 点
                  </div>
                </div>
                <div>
                  <label className="label mb-1 block flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    计划航路点
                  </label>
                  <div className="font-mono text-sm bg-steel-50 px-3 py-2 rounded-md border border-steel-200">
                    {input.plannedRoute.length} 个
                  </div>
                </div>
              </div>

              <div>
                <label className="label mb-1 block flex items-center gap-1">
                  <CloudSun className="w-3 h-3" />
                  气象风场数据
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInput("meteoAvailable", !input.meteoAvailable)}
                    className={`flex-1 text-left rounded-md border px-3 py-2 text-sm transition-all ${
                      input.meteoAvailable
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {input.meteoAvailable ? "✅ 已获取当日 06:00 时风场" : "❌ 缺失风场预报数据"}
                  </button>
                </div>
                {!input.meteoAvailable && (
                  <input
                    type="text"
                    value={input.windReportDate}
                    onChange={(e) => setInput("windReportDate", e.target.value)}
                    placeholder="请输入缺失的日期，例如 2026-06-12"
                    className="mt-2 w-full font-mono text-xs rounded-md border border-red-200 bg-white px-3 py-1.5 focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>

              <div>
                <label className="label mb-1 block flex items-center gap-1">
                  <Radar className="w-3 h-3" />
                  AIS 原始报文
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInput("aisRawAvailable", !input.aisRawAvailable)}
                    className={`flex-1 text-left rounded-md border px-3 py-2 text-sm transition-all ${
                      input.aisRawAvailable
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {input.aisRawAvailable ? "✅ AIS 报文完整" : "❌ AIS 原始报文缺失"}
                  </button>
                </div>
                {!input.aisRawAvailable && (
                  <input
                    type="text"
                    value={input.aisTimeRange}
                    onChange={(e) => setInput("aisTimeRange", e.target.value)}
                    placeholder="缺失时段，例如 2026-06-12 05:00-07:00"
                    className="mt-2 w-full font-mono text-xs rounded-md border border-red-200 bg-white px-3 py-1.5 focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>

              <div className="divider-thin" />

              <div className="flex gap-2">
                <button
                  onClick={run}
                  disabled={isCalculating}
                  className="btn-primary flex-1 disabled:opacity-60"
                >
                  {isCalculating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isCalculating ? "计算中..." : "运行漂移计算"}
                </button>
                <button onClick={reset} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" />
                  重置
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormulaCard
              title="公式 ① Haversine 大圆距离"
              formula={HAVERSINE_FORMULA}
              unit="米 / 海里（1 NM = 1,852 m）"
              applicable={APPLICABLE_SCOPE.haversine.note}
              note="本工具使用 Haversine 公式计算实际轨迹点到计划航线各段的投影最短距离。用于计算单点漂移量。"
            />
            <FormulaCard
              title="公式 ② 航迹偏差率 P"
              formula={DRIFT_RATE_FORMULA}
              unit="百分比 %"
              applicable={APPLICABLE_SCOPE.driftRate.note}
              note="偏差率是海事处判断是否需要重新巡检的核心指标：>8% 一般要求补拍。"
            />
          </div>
        </div>

        <div className="col-span-7 space-y-5">
          {result && result.status === "FAILED" && result.failureSteps ? (
            <>
              <FailureHint
                title="计算未能完成"
                overall={result.failureHint ?? "请补传以下缺失数据后重试"}
                steps={result.failureSteps}
              />
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileWarning className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-ocean-800">缺失数据清单</h3>
                </div>
                <ul className="space-y-2">
                  {result.missingInputs.map((m, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-ocean-700 rounded-md bg-red-50 border border-red-100 px-3 py-2"
                    >
                      <span className="w-5 h-5 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {result && result.status === "SUCCESS" ? (
            <>
              <div className="card overflow-hidden animate-slide-in-up">
                <div className={`h-1.5 ${driftLevel.bar}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className={`w-5 h-5 ${driftLevel.cls}`} />
                        <div className="font-serif font-bold text-xl text-ocean-800">
                          计算结果 · {driftLevel.label}
                        </div>
                      </div>
                      <div className="text-xs text-ocean-500">
                        计算模型：{result.formulaUsed}
                      </div>
                    </div>
                    <div className={`font-serif font-bold text-4xl ${driftLevel.cls}`}>
                      {rate.toFixed(2)}
                      <span className="text-lg ml-1 opacity-80">%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <StatTile
                      label="平均漂移距离"
                      value={result.driftDistanceMeters?.toFixed(1) ?? "-"}
                      unit="米"
                      icon={<Wind className="w-4 h-4" />}
                      tone="ocean"
                    />
                    <StatTile
                      label="折算海里"
                      value={result.driftDistanceNautical?.toFixed(4) ?? "-"}
                      unit="海里"
                      icon={<Thermometer className="w-4 h-4" />}
                      tone="parchment"
                    />
                    <StatTile
                      label="偏差等级"
                      value={driftLevel.label}
                      unit=""
                      icon={<Compass className="w-4 h-4" />}
                      tone={rate >= 8 ? "red" : rate >= 3 ? "amber" : "emerald"}
                    />
                  </div>

                  <div className="w-full h-3 rounded-full bg-steel-100 overflow-hidden mb-6 relative">
                    <div
                      className={`h-full ${driftLevel.bar} transition-all duration-700`}
                      style={{ width: `${Math.min(100, rate * 8)}%` }}
                    />
                    <div className="absolute top-0 left-[24%] h-full w-px bg-amber-300/70" />
                    <div className="absolute top-0 left-[64%] h-full w-px bg-red-300/70" />
                    <div className="absolute -bottom-5 left-[24%] text-[10px] text-amber-600">
                      3%
                    </div>
                    <div className="absolute -bottom-5 left-[64%] text-[10px] text-red-600">
                      8%
                    </div>
                  </div>
                  <div className="h-6" />
                </div>
              </div>

              {result.calculationSteps && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-4 h-4 text-ocean-600" />
                    <h3 className="font-semibold text-ocean-800">计算过程（可追溯）</h3>
                  </div>
                  <div className="rounded-md border border-steel-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-steel-50 text-ocean-600 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold w-1/2">
                            步骤
                          </th>
                          <th className="text-right px-4 py-2.5 font-semibold">结果</th>
                          <th className="text-left px-4 py-2.5 font-semibold w-24">单位</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-steel-100">
                        {result.calculationSteps.map((s, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-ocean-50/40 ${
                              idx === result.calculationSteps!.length - 1
                                ? "bg-amber-50/50 font-semibold text-amber-800"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-ocean-700">
                              <span className="font-mono text-[10px] text-ocean-400 mr-2">
                                S{String(idx + 1).padStart(2, "0")}
                              </span>
                              {s.label}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {s.value}
                            </td>
                            <td className="px-4 py-3 text-ocean-500 text-xs">{s.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : !result ? (
            <div className="card p-12 text-center animate-slide-in-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-ocean-50 flex items-center justify-center mb-4">
                <Compass className="w-8 h-8 text-ocean-400" />
              </div>
              <div className="font-serif font-semibold text-ocean-700 mb-1">
                尚未运行计算
              </div>
              <div className="text-sm text-ocean-500 mb-5 max-w-md mx-auto">
                勾选左侧缺失数据模拟各种失败场景，或直接点击「运行漂移计算」查看成功示例。
              </div>
              <div className="flex justify-center gap-2 text-[11px] text-ocean-500">
                <span className="chip bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Table2 className="w-3 h-3" /> 28 轨迹点 × 4 航路点示例
                </span>
                <span className="chip bg-amber-50 text-amber-700 border-amber-200">
                  可勾选缺失项测试失败场景
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  tone: "ocean" | "parchment" | "emerald" | "amber" | "red";
}) {
  const toneMap = {
    ocean: "from-ocean-500 to-ocean-700",
    parchment: "from-amber-600 to-amber-700",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
  } as const;
  return (
    <div className="rounded-lg border border-steel-100 p-4 hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-2 text-ocean-500 text-[11px] font-semibold uppercase tracking-wider">
        <span
          className={`w-6 h-6 rounded-md bg-gradient-to-br ${toneMap[tone]} text-white flex items-center justify-center shadow-inner`}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="font-mono">
        <span className="font-serif font-bold text-2xl text-ocean-800">{value}</span>
        <span className="text-xs text-ocean-500 ml-1.5">{unit}</span>
      </div>
    </div>
  );
}
