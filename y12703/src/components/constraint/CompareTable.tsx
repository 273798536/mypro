import type { SequenceProblem } from "@/types";
import { formatNumber } from "@/utils/sequence";
import { AlertTriangle, Check } from "lucide-react";

interface Props {
  problem: SequenceProblem;
}

export default function CompareTable({ problem }: Props) {
  const { computedValues, historicalAnswers, correctedValues, outlierIndices } = problem;
  const maxLen = Math.max(
    computedValues.length,
    historicalAnswers.length,
    correctedValues?.length ?? 0
  );

  return (
    <div className="h-full flex flex-col">
      <h4 className="font-serif font-semibold text-ink-800 mb-2">
        数据对照表
      </h4>
      <div className="flex-1 overflow-auto rounded-lg border border-ink-100">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-ink-600 w-10">项</th>
              <th className="px-2 py-1.5 text-right font-medium text-ink-600">计算值</th>
              <th className="px-2 py-1.5 text-right font-medium text-ink-600">历史答案</th>
              {correctedValues && (
                <th className="px-2 py-1.5 text-right font-medium text-ink-800">修正值</th>
              )}
              <th className="px-2 py-1.5 text-center font-medium text-ink-600 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxLen }).map((_, i) => {
              const comp = computedValues[i];
              const hist = historicalAnswers[i];
              const corr = correctedValues?.[i];
              const diff =
                comp !== undefined && hist !== undefined
                  ? Math.abs(comp - hist) > 1e-6
                  : false;
              const isOutlier = outlierIndices.includes(i);
              return (
                <tr
                  key={i}
                  className={`border-t border-ink-50 ${
                    isOutlier ? "bg-alert-soft/50" : diff ? "bg-warn-soft/30" : ""
                  }`}
                >
                  <td className="px-2 py-1 font-mono text-ink-500">a{i + 1}</td>
                  <td className={`px-2 py-1 text-right font-mono ${isOutlier ? "text-alert font-semibold" : "text-ink-700"}`}>
                    {formatNumber(comp)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-confirm">
                    {formatNumber(hist)}
                  </td>
                  {correctedValues && (
                    <td className="px-2 py-1 text-right font-mono text-ink-800 font-semibold">
                      {corr !== undefined ? formatNumber(corr) : "—"}
                    </td>
                  )}
                  <td className="px-2 py-1 text-center">
                    {isOutlier ? (
                      <AlertTriangle size={12} className="text-alert inline" />
                    ) : diff ? (
                      <span className="text-warn text-[10px]">≠</span>
                    ) : comp !== undefined ? (
                      <Check size={12} className="text-confirm inline" />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
