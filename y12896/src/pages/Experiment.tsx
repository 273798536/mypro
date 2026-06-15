import { useEffect, useState } from "react";
import { usePlaybackStore } from "@/store/playbackStore";
import TideChart from "@/components/TideChart";
import type { CalcResult, Scenario, StrategyType } from "~/shared/types";
import { api } from "@/lib/api";
import { Zap, Layers, ArrowRight, BarChart3, Percent, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";

export default function Experiment() {
  const { init, scenarios, scenario, timezone, loading, selectScenario, setTimezone, tideData } =
    usePlaybackStore();

  const [compareResults, setCompareResults] = useState<{
    correct?: CalcResult;
    wrong?: CalcResult;
  }>({});
  const [scenarioId, setScenarioId] = useState<string>("");

  useEffect(() => {
    if (!scenario?.id) init();
  }, [scenario, init]);

  useEffect(() => {
    if (scenario?.id) setScenarioId(scenario.id);
  }, [scenario?.id]);

  const runCompare = async () => {
    if (!scenarioId) return;
    const [correct, wrong] = await Promise.all([
      api.calculate({ scenarioId, strategy: "correct", timezone }),
      api.calculate({ scenarioId, strategy: "wrong", timezone }),
    ]);
    setCompareResults({ correct, wrong });
  };

  useEffect(() => {
    if (scenarioId && scenarios.length > 0) runCompare();
  }, [scenarioId, timezone]);

  const c = compareResults.correct;
  const w = compareResults.wrong;
  const energyDelta = c && w ? c.totalEnergy - w.totalEnergy : 0;
  const energyRatio = c && w && w.totalEnergy > 0 ? (c.totalEnergy / w.totalEnergy) : 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-ocean-800/60 via-tide-teal/10 to-ocean-800/60 border border-ocean-700/50 p-6 shadow-glow">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-tide-green" />
            策略对比实验
          </h1>
          <p className="text-sm text-ocean-300 mt-1.5 leading-relaxed max-w-3xl">
            对比"落潮开闸发电（正确）"和"涨潮开闸（错误理解）"两种策略的发电量差异。调整场景和时区，观察发电量和弃水量的变化，直观理解潮汐发电的物理原理。
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ocean-400 uppercase tracking-wider">潮汐场景</label>
              <div className="flex gap-1.5">
                {scenarios.map((s: Scenario) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setScenarioId(s.id);
                      selectScenario(s.id);
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-sm font-medium transition border",
                      scenarioId === s.id
                        ? "bg-tide-green/20 border-tide-green/50 text-tide-green"
                        : "bg-ocean-800/60 border-ocean-700/40 text-ocean-200 hover:bg-ocean-700/60"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    {s.name.replace("（", " ").replace("）", "")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ocean-400 uppercase tracking-wider">时区（对比时区差异）</label>
              <div className="flex gap-1.5">
                {[
                  { v: "Asia/Shanghai", l: "上海(+8)" },
                  { v: "UTC", l: "UTC(+0)" },
                  { v: "America/New_York", l: "纽约(-5)" },
                ].map((tz) => (
                  <button
                    key={tz.v}
                    onClick={() => setTimezone(tz.v)}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-sm font-medium transition border font-mono",
                      timezone === tz.v
                        ? "bg-tide-warning/20 border-tide-warning/50 text-tide-warning"
                        : "bg-ocean-800/60 border-ocean-700/40 text-ocean-200 hover:bg-ocean-700/60"
                    )}
                  >
                    {tz.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {tideData?.timezoneWarning && (
            <div className="mt-4 rounded-xl bg-tide-warning/10 border border-tide-warning/30 p-3 text-xs text-tide-warning leading-relaxed">
              {tideData.timezoneWarning}
            </div>
          )}
        </div>

        {loading && <div className="text-center py-10 text-ocean-300">正在计算对比数据...</div>}

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6 space-y-4">
            <StrategyCard
              title="正确策略"
              subtitle="落潮开闸发电 · 涨潮关闸蓄水"
              accentClass="from-tide-green/20 to-transparent border-tide-green/40"
              titleColor="text-tide-green"
              result={c}
              badge="✓ 正确"
            />
            <TideChart tides={tideData?.data} timeline={c?.timeline} compact />
          </div>

          <div className="col-span-6 space-y-4">
            <StrategyCard
              title="错误策略（常见误解）"
              subtitle="涨潮开闸 · 落潮关闸（学生常见想法）"
              accentClass="from-tide-danger/20 to-transparent border-tide-danger/40"
              titleColor="text-tide-danger"
              result={w}
              badge="✗ 错误"
            />
            <TideChart tides={tideData?.data} timeline={w?.timeline} compact />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
            <ArrowRight className="w-5 h-5 text-tide-green" />
            对比结论
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={<Zap className="w-5 h-5" />}
              label="发电量差额"
              value={`+${energyDelta.toFixed(0)} kWh`}
              valueClass="text-tide-green"
              hint="正确策略多产出"
            />
            <MetricCard
              icon={<Percent className="w-5 h-5" />}
              label="发电倍率"
              value={`${energyRatio.toFixed(1)}×`}
              valueClass="text-tide-warning"
              hint="正确/错误"
            />
            <MetricCard
              icon={<Droplets className="w-5 h-5" />}
              label="错误策略弃水"
              value={`${((w?.waterDiscarded.reduce((s, x) => s + x.volume, 0) ?? 0) / 1000).toFixed(1)} km³`}
              valueClass="text-tide-danger"
              hint="因涨潮开闸浪费"
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="效率差值"
              value={`${((c ? c.averageEfficiency : 0) - (w ? w.averageEfficiency : 0)).toFixed(1)}%`}
              valueClass="text-ocean-200"
              hint="正确策略效率"
            />
          </div>

          <div className="rounded-xl bg-ocean-900/60 border border-ocean-700/40 p-5">
            <h4 className="text-sm font-bold text-tide-green mb-3 flex items-center gap-2">
              💡 教学要点
            </h4>
            <ul className="space-y-2.5 text-sm text-ocean-200 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="text-tide-green shrink-0 font-bold mt-0.5">1.</span>
                <span>
                  潮汐发电的核心是利用<span className="text-tide-green font-semibold">水头差</span>（水库与大海的高度差）推动水轮机。落潮时水库水位高于大海，开闸才能让水流做功。
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-tide-green shrink-0 font-bold mt-0.5">2.</span>
                <span>
                  涨潮时开闸，大海与水库水位同步上升，两者<span className="text-tide-danger font-semibold">永远平齐</span>，落潮时就没有水头差可利用——这就是"涨潮开闸"策略只能获得1/3甚至更少发电量的物理原因。
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-tide-green shrink-0 font-bold mt-0.5">3.</span>
                <span>
                  尝试切换时区：将"混合潮"场景切换到UTC或纽约时区，观察高潮时间错位对发电曲线的影响——这就是<span className="text-tide-warning font-semibold">时区错误</span>的典型教学场景。
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-tide-green shrink-0 font-bold mt-0.5">4.</span>
                <span>
                  对比"半日潮"和"全日潮"：半日潮一日有两次发电窗口，全日潮只有一次。但全日潮每次发电时长更长，需要注意<span className="text-tide-danger font-semibold">机组过热保护</span>。
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <TimelineKeyMoments label="正确策略关键时段" timeline={c?.timeline ?? []} kind="correct" />
            <TimelineKeyMoments label="错误策略关键时段" timeline={w?.timeline ?? []} kind="wrong" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({
  title,
  subtitle,
  accentClass,
  titleColor,
  result,
  badge,
}: {
  title: string;
  subtitle: string;
  accentClass: string;
  titleColor: string;
  result?: CalcResult;
  badge: string;
}) {
  return (
    <div className={cn("relative rounded-2xl border p-5 overflow-hidden bg-gradient-to-br", accentClass)}>
      <div className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/40 text-white border border-white/20">
        {badge}
      </div>
      <h3 className={cn("text-base font-bold", titleColor)}>{title}</h3>
      <p className="text-xs text-ocean-300 mt-0.5">{subtitle}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">累计发电</div>
          <div className="font-mono text-xl font-bold text-white">
            {(result?.totalEnergy ?? 0).toFixed(0)}
            <span className="text-xs ml-1 text-ocean-400">kWh</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">峰值功率</div>
          <div className="font-mono text-xl font-bold text-tide-warning">
            {(result?.peakPower ?? 0).toFixed(0)}
            <span className="text-xs ml-1 text-ocean-400">kW</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">平均效率</div>
          <div className="font-mono text-xl font-bold text-ocean-200">
            {(result?.averageEfficiency ?? 0).toFixed(0)}
            <span className="text-xs ml-1 text-ocean-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  valueClass,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-ocean-900/60 border border-ocean-700/40 p-4">
      <div className="flex items-center gap-2 text-ocean-400 text-[11px] uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <div className={cn("font-mono text-2xl font-bold", valueClass)}>{value}</div>
      <div className="text-[10px] text-ocean-500 mt-1">{hint}</div>
    </div>
  );
}

function TimelineKeyMoments({
  label,
  timeline,
  kind,
}: {
  label: string;
  timeline: CalcResult["timeline"];
  kind: "correct" | "wrong";
}) {
  const events: Array<{ time: string; label: string; phase: string }> = [];
  let lastPhase = "";
  for (const t of timeline) {
    if (t.phase !== lastPhase) {
      events.push({ time: t.time, label: phaseChinese(t.phase), phase: t.phase });
      lastPhase = t.phase;
    }
  }
  const filtered = events.filter((e) => e.phase === "tide" || e.label !== "待机");
  return (
    <div className="rounded-xl bg-ocean-900/60 border border-ocean-700/40 p-4">
      <h4 className={cn("text-sm font-bold mb-3", kind === "correct" ? "text-tide-green" : "text-tide-danger")}>
        {label}
      </h4>
      <div className="max-h-52 overflow-y-auto space-y-2">
        {filtered.slice(0, 12).map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <span className="font-mono text-ocean-400 shrink-0 w-12">{formatTime(e.time)}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              e.phase === "generating" && "bg-tide-green/20 text-tide-green",
              e.phase === "storing" && "bg-ocean-400/20 text-ocean-200",
              e.phase === "discarding" && "bg-tide-danger/20 text-tide-danger",
              e.phase === "idle" && "bg-ocean-700/40 text-ocean-300",
              e.phase === "tide" && "bg-tide-warning/20 text-tide-warning"
            )}>
              {e.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function phaseChinese(p: string): string {
  return (
    { generating: "⚡ 开始发电", storing: "💧 开始蓄水", idle: "⏸ 待机", discarding: "⚠️ 弃水" } as Record<
      string,
      string
    >
  )[p] || p;
}
