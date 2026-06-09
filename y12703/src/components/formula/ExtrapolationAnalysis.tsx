import type { SequenceProblem } from "@/types";
import { detectOutliers } from "@/utils/sequence";
import { AlertTriangle, Shield, Info } from "lucide-react";
import { formatNumber } from "@/utils/sequence";

interface Props {
  problem: SequenceProblem;
}

export default function ExtrapolationAnalysis({ problem }: Props) {
  const baselineCount = Math.min(5, Math.floor(problem.computedValues.length / 2));
  const { mean, std, indices } = detectOutliers(
    problem.computedValues,
    baselineCount,
    3
  );
  const upperBound = mean + 3 * std;
  const lowerBound = mean - 3 * std;

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-card p-6">
      <h3 className="font-serif font-bold text-xl text-ink-800 mb-1">
        外推越界判定分析
      </h3>
      <p className="text-xs text-ink-500 mb-5">
        基于前 {baselineCount} 项基准值，采用 3σ 准则判定后续项是否越界
      </p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg p-4 bg-ink-50 border border-ink-100">
          <div className="text-[11px] text-ink-500 font-medium">基准均值 μ</div>
          <div className="mt-1 font-serif font-bold text-xl text-ink-800">
            {formatNumber(mean)}
          </div>
        </div>
        <div className="rounded-lg p-4 bg-ink-50 border border-ink-100">
          <div className="text-[11px] text-ink-500 font-medium">标准差 σ</div>
          <div className="mt-1 font-serif font-bold text-xl text-ink-800">
            {formatNumber(std)}
          </div>
        </div>
        <div className="rounded-lg p-4 bg-ink-50 border border-ink-100">
          <div className="text-[11px] text-ink-500 font-medium">判定阈值 ±3σ</div>
          <div className="mt-1 font-serif font-bold text-sm text-ink-800 leading-tight">
            [{formatNumber(lowerBound)}, {formatNumber(upperBound)}]
          </div>
        </div>
      </div>

      {indices.length > 0 ? (
        <div className="rounded-lg p-4 bg-alert-soft border border-alert/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-alert mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-alert mb-1">
                检测到 {indices.length} 个越界项
              </div>
              <div className="text-ink-700 leading-relaxed">
                {indices.map((i) => (
                  <span key={i} className="inline-flex items-center gap-1 mr-3 mb-1">
                    <span className="font-mono font-semibold">a{i + 1}</span>
                    <span>=</span>
                    <span className="font-mono text-alert font-semibold">
                      {formatNumber(problem.computedValues[i])}
                    </span>
                    <span className="text-xs text-ink-500">
                      (超出阈值 {formatNumber(Math.abs(problem.computedValues[i] - mean) / std)}σ)
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-500">
                建议：与历史答案 {problem.historicalAnswers.filter((_, i) => indices.includes(i)).map((v, j) => `a${indices[j] + 1}=${formatNumber(v)}`).join("、")} 对比，疑似录入错误或算法溢出
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-4 bg-confirm-soft border border-confirm/20">
          <div className="flex items-start gap-2.5">
            <Shield size={18} className="text-confirm mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-confirm mb-1">外推结果正常</div>
              <div className="text-ink-700">
                所有项均在 3σ 可信区间内，与历史答案一致。
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-lg p-3 bg-ink-50 border border-ink-100 text-xs text-ink-600">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-ink-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium text-ink-700">判定逻辑：</span>
            取前 N 项作为基准计算均值 μ 和标准差 σ，若后续项 |aᵢ − μ| {">"} 3σ，
            则标记为外推越界。这在统计学上对应 99.7% 置信区间外的低概率事件。
          </div>
        </div>
      </div>
    </div>
  );
}
