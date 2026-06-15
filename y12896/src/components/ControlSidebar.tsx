import { Layers, Clock, SlidersHorizontal, Globe, RefreshCw } from "lucide-react";
import type { Scenario, StrategyType, TideDataResponse } from "~/shared/types";
import { cn } from "@/lib/utils";

interface Props {
  scenarios: Scenario[];
  scenario: Scenario | null;
  strategy: StrategyType;
  timezone: string;
  tideData: TideDataResponse | null;
  loading: boolean;
  onScenarioChange: (id: string) => Promise<void>;
  onStrategyChange: (s: StrategyType) => Promise<void>;
  onTimezoneChange: (tz: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const TIMEZONE_OPTIONS = [
  { value: "Asia/Shanghai", label: "东八区 北京/上海 (UTC+8)", flag: "🇨🇳" },
  { value: "UTC", label: "UTC 世界时 (UTC+0)", flag: "🌐" },
  { value: "Asia/Tokyo", label: "东九区 东京 (UTC+9)", flag: "🇯🇵" },
  { value: "Asia/Singapore", label: "东八区 新加坡 (UTC+8)", flag: "🇸🇬" },
  { value: "America/New_York", label: "西五区 纽约 (UTC-5)", flag: "🇺🇸" },
  { value: "Europe/Paris", label: "东一区 巴黎 (UTC+1)", flag: "🇫🇷" },
];

export default function ControlSidebar({
  scenarios,
  scenario,
  strategy,
  timezone,
  tideData,
  loading,
  onScenarioChange,
  onStrategyChange,
  onTimezoneChange,
  onRefresh,
}: Props) {
  return (
    <aside className="flex flex-col gap-4 h-full">
      <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg">
        <div className="flex items-center gap-2 text-ocean-200 mb-4">
          <Layers className="w-4 h-4 text-tide-green" />
          <span className="text-sm font-semibold">潮汐场景</span>
        </div>
        <div className="space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              disabled={loading}
              onClick={() => onScenarioChange(s.id)}
              className={cn(
                "w-full text-left rounded-xl border p-3.5 transition group",
                scenario?.id === s.id
                  ? "bg-tide-green/15 border-tide-green/50 shadow-glow"
                  : "bg-ocean-900/40 border-ocean-700/40 hover:bg-ocean-700/40 hover:border-ocean-500/40"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-sm font-bold",
                    scenario?.id === s.id ? "text-tide-green" : "text-ocean-100"
                  )}
                >
                  {s.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono",
                    scenario?.id === s.id
                      ? "bg-tide-green/20 text-tide-green"
                      : "bg-ocean-700/50 text-ocean-300"
                  )}
                >
                  {s.tideType}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-ocean-300/80">
                {s.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg">
        <div className="flex items-center gap-2 text-ocean-200 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-tide-green" />
          <span className="text-sm font-semibold">闸门策略</span>
        </div>
        <div className="space-y-2">
          {([
            {
              k: "correct",
              l: "正确策略",
              s: "落潮开闸发电 · 涨潮关闸蓄水",
              c: "text-tide-green border-tide-green/40 bg-tide-green/10",
            },
            {
              k: "wrong",
              l: "错误策略（对比用）",
              s: "涨潮开闸 · 落潮关闸（常见误解）",
              c: "text-tide-danger border-tide-danger/30 bg-tide-danger/10",
            },
            {
              k: "custom",
              l: "自定义策略",
              s: "手动调整闸门开度",
              c: "text-ocean-200 border-ocean-500/40 bg-ocean-700/30",
            },
          ] as Array<{ k: StrategyType; l: string; s: string; c: string }>).map((item) => (
            <button
              key={item.k}
              disabled={loading}
              onClick={() => onStrategyChange(item.k)}
              className={cn(
                "w-full text-left rounded-xl border p-3 transition",
                strategy === item.k
                  ? item.c
                  : "bg-ocean-900/40 border-ocean-700/40 hover:bg-ocean-700/30"
              )}
            >
              <div className="text-sm font-bold">{item.l}</div>
              <div className="text-[11px] opacity-75 mt-0.5">{item.s}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg">
        <div className="flex items-center gap-2 text-ocean-200 mb-4">
          <Globe className="w-4 h-4 text-tide-green" />
          <span className="text-sm font-semibold">时区设置</span>
          <span className="text-[10px] text-ocean-500 ml-auto">重要！</span>
        </div>
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          className="w-full rounded-xl bg-ocean-900/60 border border-ocean-600/40 text-ocean-100 px-3 py-2.5 text-sm focus:outline-none focus:border-tide-green/50 transition"
        >
          {TIMEZONE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.flag} {t.label}
            </option>
          ))}
        </select>
        {tideData?.timezoneWarning && (
          <div className="mt-3 rounded-lg bg-tide-warning/10 border border-tide-warning/30 p-2.5 text-[11px] text-tide-warning leading-relaxed">
            ⚠️ {tideData.timezoneWarning.replace("⚠️ ", "").split("。")[0]}
          </div>
        )}
        {scenario && (
          <div className="mt-3 text-[11px] text-ocean-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>数据原时区：</span>
            <code className="text-ocean-200 bg-ocean-800 px-1.5 py-0.5 rounded font-mono">
              {scenario.defaultTimezone || "Asia/Shanghai"}
            </code>
          </div>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={loading || !scenario}
        className={cn(
          "rounded-xl p-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition border",
          loading
            ? "bg-ocean-700/50 border-ocean-600/40 text-ocean-400 cursor-wait"
            : "bg-gradient-to-r from-tide-green to-tide-teal text-ocean-900 border-tide-green/40 hover:shadow-glow"
        )}
      >
        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        {loading ? "重新计算中..." : "重新计算发电量"}
      </button>
    </aside>
  );
}
