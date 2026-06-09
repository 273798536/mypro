import { useStore } from "@/store/useStore";
import StatusBadge from "@/components/common/StatusBadge";
import GradeBadge from "@/components/common/GradeBadge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { truncate } from "@/utils/format";

export default function ProblemTable() {
  const { getFilteredProblems, selectedProblemId, selectProblem } = useStore();
  const list = getFilteredProblems();

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-zebra text-sm">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-100">
              <th className="text-left px-4 py-3 font-medium text-ink-600 w-28">
                题目编号
              </th>
              <th className="text-left px-4 py-3 font-medium text-ink-600">
                题目/递推公式
              </th>
              <th className="text-left px-4 py-3 font-medium text-ink-600 w-40">
                历史答案（前5项）
              </th>
              <th className="text-left px-4 py-3 font-medium text-ink-600 w-28">
                状态
              </th>
              <th className="text-left px-4 py-3 font-medium text-ink-600 w-28">
                数据分级
              </th>
              <th className="text-left px-4 py-3 font-medium text-ink-600 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-ink-400"
                >
                  暂无匹配数据
                </td>
              </tr>
            )}
            {list.map((p) => {
              const selected = p.id === selectedProblemId;
              return (
                <tr
                  key={p.id}
                  onClick={() => selectProblem(p.id)}
                  className={`cursor-pointer border-b border-ink-50 transition-colors ${
                    selected ? "bg-ink-50/70" : ""
                  } ${p.isExtrapolationOutlier ? "bg-alert-soft/40" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-ink-700">
                        {p.id}
                      </span>
                      {p.isExtrapolationOutlier && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-alert/10 text-alert animate-pulse-dot">
                          <AlertTriangle size={10} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{p.title}</div>
                    <div className="mt-0.5 text-xs text-ink-500 math-formula">
                      {truncate(p.recurrenceFormula, 50)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-ink-600">
                      {p.historicalAnswers.slice(0, 5).join(", ")}
                      {p.historicalAnswers.length > 5 ? ", …" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <GradeBadge grade={p.dataGrade} />
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    <ChevronRight size={16} />
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
