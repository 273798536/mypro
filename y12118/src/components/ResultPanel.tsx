import { useAppStore } from "@/utils/store";
import {
  AlertTriangle,
  Clock,
  Copy,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import type { AllocationResult, Anomaly } from "@/utils/types";

export default function ResultPanel() {
  const { output, selectedChannelId, selectChannel } = useAppStore();

  if (!output) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
        请输入数据并执行分配
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <p className="text-xs text-zinc-400 leading-relaxed font-mono">
          {output.globalSummary}
        </p>
        <div className="grid grid-cols-4 gap-3 mt-3">
          <StatCard
            label="总预算"
            value={`¥${output.totalBudget.toLocaleString()}`}
          />
          <StatCard
            label="已分配"
            value={`¥${(output.totalBudget - output.remainingBudget).toLocaleString()}`}
          />
          <StatCard
            label="剩余"
            value={`¥${output.remainingBudget.toLocaleString()}`}
            highlight={output.remainingBudget > 0 ? "amber" : undefined}
          />
          <StatCard
            label="预期转化"
            value={output.totalExpectedConversions.toFixed(2)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {output.results.map((result) => (
          <ResultCard
            key={result.channelId}
            result={result}
            isSelected={selectedChannelId === result.channelId}
            onSelect={() =>
              selectChannel(
                selectedChannelId === result.channelId
                  ? null
                  : result.channelId
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "amber";
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
      <div className="text-[10px] text-zinc-500 mb-0.5">{label}</div>
      <div
        className={`text-sm font-mono font-semibold ${
          highlight === "amber" ? "text-amber-500" : "text-zinc-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  isSelected,
  onSelect,
}: {
  result: AllocationResult;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasAnomalies = result.anomalies.length > 0;
  const anomalyTypes = result.anomalies.map((a) => a.type);

  return (
    <div
      className={`bg-zinc-900/80 border rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "border-amber-500/60 bg-amber-500/5"
          : hasAnomalies
            ? "border-rose-500/30 hover:border-rose-500/50"
            : "border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">
              {result.channelName}
            </span>
            {anomalyTypes.map((type) => (
              <AnomalyBadge key={type} type={type} />
            ))}
          </div>
          <ChevronRight
            className={`w-4 h-4 text-zinc-600 transition-transform ${
              isSelected ? "rotate-90" : ""
            }`}
          />
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-zinc-500">分配</span>
            <div className="font-mono text-zinc-200">
              ¥{result.allocatedBudget.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-zinc-500">上限</span>
            <div
              className={`font-mono ${
                result.capReached ? "text-rose-500" : "text-zinc-200"
              }`}
            >
              ¥{result.dailyCap.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-zinc-500">边际收益</span>
            <div className="font-mono text-zinc-200">
              {result.marginalReturn.toFixed(6)}
            </div>
          </div>
          <div>
            <span className="text-zinc-500">预期转化</span>
            <div className="font-mono text-emerald-400">
              {result.expectedConversions.toFixed(3)}
            </div>
          </div>
        </div>

        {result.delayDiscount < 1 && (
          <div className="mt-1.5 text-[10px] text-amber-500/80 font-mono">
            延迟折扣 ×{result.delayDiscount.toFixed(4)}
          </div>
        )}
        {result.duplicatePenalty < 1 && (
          <div className="mt-1.5 text-[10px] text-rose-400/80 font-mono">
            重复惩罚 ×{result.duplicatePenalty.toFixed(4)}
          </div>
        )}

        {result.capReached && (
          <div className="mt-1.5 text-[10px] text-rose-500 font-medium flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            预算耗尽——日消耗上限已触及，边际收益被拦住
          </div>
        )}
      </div>

      {isSelected && (
        <div className="border-t border-zinc-800 p-3 space-y-3">
          {result.anomalies.map((anomaly, i) => (
            <AnomalyExplanation key={i} anomaly={anomaly} />
          ))}

          <div>
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              约束优化链路
            </h4>
            <div className="space-y-1">
              {result.optimizationSteps.map((step, i) => (
                <div
                  key={i}
                  className={`text-[11px] font-mono leading-relaxed pl-2 border-l-2 ${
                    step.constraintType === "cap"
                      ? "border-rose-500/60 text-rose-400"
                      : step.constraintType === "delay"
                        ? "border-amber-500/60 text-amber-400"
                        : step.constraintType === "duplicate"
                          ? "border-rose-400/60 text-rose-300"
                          : step.constraintType === "all_capped"
                            ? "border-rose-500/80 text-rose-400"
                            : "border-zinc-700 text-zinc-400"
                  }`}
                >
                  {step.explanation}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              边际收益曲线
            </h4>
            <MarginalReturnChart curve={result.marginalReturnCurve} />
          </div>

          <div>
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              预算回放
            </h4>
            <div className="space-y-0.5">
              {result.budgetReplay.map((entry, i) => (
                <div
                  key={i}
                  className="text-[10px] font-mono text-zinc-500 flex gap-3"
                >
                  <span className="text-zinc-600 w-12">第{entry.round}轮</span>
                  <span className="text-emerald-500 w-16">
                    +¥{entry.delta.toFixed(0)}
                  </span>
                  <span>剩余 ¥{entry.remainingBudget.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnomalyBadge({ type }: { type: Anomaly["type"] }) {
  switch (type) {
    case "budget_exhausted":
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
          <AlertTriangle className="w-3 h-3" />
          预算耗尽
        </span>
      );
    case "conversion_delay":
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
          <Clock className="w-3 h-3" />
          转化延迟
        </span>
      );
    case "material_duplicate":
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
          <Copy className="w-3 h-3" />
          素材重复
        </span>
      );
  }
}

function AnomalyExplanation({ anomaly }: { anomaly: Anomaly }) {
  return (
    <div
      className={`rounded-lg p-2.5 text-xs leading-relaxed ${
        anomaly.severity === "critical"
          ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {anomaly.severity === "critical" ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className="font-medium">
          {anomaly.type === "budget_exhausted" && "预算耗尽"}
          {anomaly.type === "conversion_delay" && "转化延迟"}
          {anomaly.type === "material_duplicate" && "素材重复"}
        </span>
      </div>
      <p className="font-mono text-[11px] opacity-90">{anomaly.explanation}</p>
    </div>
  );
}

function MarginalReturnChart({
  curve,
}: {
  curve: { budget: number; marginalReturn: number }[];
}) {
  if (curve.length < 2) return <div className="text-xs text-zinc-600">数据不足</div>;

  const maxBudget = Math.max(...curve.map((p) => p.budget));
  const maxMR = Math.max(...curve.map((p) => p.marginalReturn));
  const w = 280;
  const h = 80;
  const padX = 30;
  const padY = 10;

  const points = curve.map((p) => ({
    x: padX + ((p.budget / (maxBudget || 1)) * (w - padX)),
    y: padY + (1 - p.marginalReturn / (maxMR || 1)) * (h - padY * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-20"
      preserveAspectRatio="none"
    >
      <path d={areaD} fill="url(#mrGrad)" opacity={0.3} />
      <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <defs>
        <linearGradient id="mrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        y1={h - padY}
        x2={w}
        y2={h - padY}
        stroke="#3f3f46"
        strokeWidth={0.5}
      />
      <text x={padX} y={h - 1} fill="#71717a" fontSize={7}>
        ¥0
      </text>
      <text x={w - 30} y={h - 1} fill="#71717a" fontSize={7}>
        ¥{maxBudget.toLocaleString()}
      </text>
      <text x={2} y={padY + 4} fill="#71717a" fontSize={7}>
        {maxMR.toFixed(4)}
      </text>
    </svg>
  );
}
