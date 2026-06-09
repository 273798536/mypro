import { useState } from "react";
import { useStore } from "@/store/useStore";
import SequenceChart from "./SequenceChart";
import CompareTable from "./CompareTable";
import GradeNote from "./GradeNote";
import CorrectModal from "./CorrectModal";
import StatusBadge from "@/components/common/StatusBadge";
import { Calculator, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DetailPanel() {
  const { problems, selectedProblemId, selectProblem, updateStatus } = useStore();
  const problem = problems.find((p) => p.id === selectedProblemId) ?? null;
  const [showCorrect, setShowCorrect] = useState(false);
  const navigate = useNavigate();

  if (!problem) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl shadow-card p-12 flex flex-col items-center justify-center text-ink-400">
        <div className="font-serif text-lg">请从左侧选择一道题目</div>
        <div className="text-xs mt-1">点击题目行查看详情</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-ink-100 rounded-xl shadow-card overflow-hidden animate-fade-up">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50/60 to-transparent">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink-500 bg-white px-2 py-0.5 rounded border border-ink-100">
                {problem.id}
              </span>
              <StatusBadge status={problem.status} />
            </div>
            <h3 className="mt-1.5 font-serif font-bold text-lg text-ink-800">
              {problem.title}
            </h3>
            <div className="mt-1 math-formula text-sm text-ink-600 bg-ivory inline-block px-2 py-0.5 rounded border border-ink-100">
              {problem.recurrenceFormula}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() =>
                navigate(`/formula?id=${encodeURIComponent(problem.id)}`)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ink-100 text-ink-700 hover:bg-ink-200 transition"
            >
              <Calculator size={13} />
              公式推导
              <ArrowRight size={12} />
            </button>
            <button
              onClick={() => selectProblem(null)}
              className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 h-[540px]">
          <div className="lg:col-span-6 bg-ivory rounded-lg border border-ink-100 p-4 min-h-0">
            <SequenceChart problem={problem} />
          </div>
          <div className="lg:col-span-3 min-h-0">
            <CompareTable problem={problem} />
          </div>
          <div className="lg:col-span-3 min-h-0">
            <GradeNote
              problem={problem}
              onCorrect={() => setShowCorrect(true)}
              onMarkSuspended={() =>
                updateStatus(problem.id, "suspended", "张编辑", "标记为暂缓处理")
              }
              onMarkRecollect={() =>
                updateStatus(problem.id, "recollect", "张编辑", "数据异常，需重新采集")
              }
              onApprove={() =>
                updateStatus(problem.id, "approved", "张编辑", "复核通过")
              }
            />
          </div>
        </div>
      </div>
      {showCorrect && (
        <CorrectModal problem={problem} onClose={() => setShowCorrect(false)} />
      )}
    </>
  );
}
