import type { SequenceProblem } from "@/types";
import { formatNumber } from "@/utils/sequence";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  problem: SequenceProblem;
}

export default function FormulaDerivation({ problem }: Props) {
  const steps = problem.derivationSteps ?? [];
  const displayValues = problem.correctedValues ?? problem.computedValues;

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-serif font-bold text-xl text-ink-800">
            公式推导与计算验证
          </h3>
          <p className="text-xs text-ink-500 mt-1">
            月底或课前复核：逐项核对递推关系，确认历史答案一致性
          </p>
        </div>
        <div className="text-right">
          <div className="math-formula text-lg font-serif text-ink-700 bg-ivory inline-block px-3 py-1 rounded-md border border-ink-100">
            {problem.recurrenceFormula}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.step}
            className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-ink-50/70 to-transparent border border-ink-100"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-ink-700 text-ivory flex items-center justify-center font-serif font-bold text-sm">
              {step.step}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-800">
                {step.description}
              </div>
              <div className="mt-1.5 math-formula text-ink-700 text-base tracking-wide">
                {step.formula}
              </div>
              {step.result !== undefined && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ivory border border-ink-100">
                  <ArrowRight size={12} className="text-ink-400" />
                  <span className="font-mono font-semibold text-ink-800 text-sm">
                    {formatNumber(step.result)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-ink-700 mb-2">逐项计算结果</div>
        <div className="flex flex-wrap gap-2">
          {displayValues.map((v, i) => {
            const isOutlier = problem.outlierIndices.includes(i);
            const histDiff =
              problem.historicalAnswers[i] !== undefined &&
              Math.abs(v - problem.historicalAnswers[i]) > 1e-6;
            return (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-mono transition ${
                  isOutlier
                    ? "bg-alert-soft border-alert/30 text-alert"
                    : histDiff
                    ? "bg-warn-soft border-warn/30 text-warn"
                    : "bg-ivory border-ink-100 text-ink-700"
                }`}
              >
                <span className="text-ink-400 text-xs">a{i + 1}=</span>
                <span className="font-semibold">{formatNumber(v)}</span>
                {isOutlier ? (
                  <AlertTriangle size={12} />
                ) : !histDiff ? (
                  <CheckCircle size={12} className="text-confirm" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
