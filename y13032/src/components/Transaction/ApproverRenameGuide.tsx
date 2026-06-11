import { UserRound, CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';

interface ApproverRenameGuideProps {
  approverName: string;
  isRenamed: boolean;
}

export default function ApproverRenameGuide({
  approverName,
  isRenamed,
}: ApproverRenameGuideProps) {
  const { renameGuideSteps, toggleRenameStep } = useReconciliationStore();
  const completedCount = renameGuideSteps.filter((s) => s.checked).length;
  const allDone = completedCount === renameGuideSteps.length;

  if (!isRenamed) {
    return (
      <div className="card p-5 bg-emerald/6 border-l-4 border-l-emerald animate-fade-up opacity-0" style={{ animationDelay: '350ms' }}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-dark shrink-0 mt-0.5" strokeWidth={2} />
          <div className="flex-1">
            <div className="font-serif text-sm font-semibold text-navy-700">
              审批人姓名校验通过
            </div>
            <div className="mt-1 text-xs text-navy-600">
              当前审批人「{approverName}」与系统主数据一致，未触发改名流程。
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden border-l-4 border-l-navy-600 animate-fade-up opacity-0" style={{ animationDelay: '350ms' }}>
      <div className="px-5 py-4 bg-gradient-to-r from-navy-50/80 to-transparent border-b border-navy-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-600 flex items-center justify-center shrink-0">
            <UserRound className="w-4.5 h-4.5 text-white" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-serif text-base font-semibold text-navy-700">
                审批人改名提示：张建均 → {approverName}
              </h4>
              <span className="chip bg-navy-100 text-navy-600">
                {completedCount}/{renameGuideSteps.length} 已处理
              </span>
              {allDone && (
                <span className="chip bg-emerald/10 text-emerald-dark">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" strokeWidth={2} />
                  改名流程完成
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-navy-600 leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 text-navy-500 inline mr-1" strokeWidth={1.8} />
              检测到审批人姓名变更可能影响对账结果，请按以下
              <span className="font-medium text-navy-700"> 四步 </span>
              逐一处理。每一步完成后打勾确认——
              <span className="font-medium">人能照着做，做完有记录。</span>
            </div>
          </div>
        </div>
      </div>

      <ol className="divide-y divide-navy-100">
        {renameGuideSteps.map((step) => (
          <li key={step.id}>
            <button
              onClick={() => toggleRenameStep(step.id)}
              className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-navy-50/40 transition-colors group"
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                  step.checked
                    ? 'bg-emerald border-emerald'
                    : 'bg-white border-navy-300 group-hover:border-navy-500'
                }`}
              >
                {step.checked ? (
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <Circle className="w-3 h-3 text-transparent" strokeWidth={2} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-navy-500 tracking-wider">
                    STEP {String(step.id).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-serif text-sm font-semibold ${
                      step.checked ? 'text-navy-500 line-through' : 'text-navy-700'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                <div
                  className={`mt-1 text-xs leading-relaxed ${
                    step.checked ? 'text-navy-400' : 'text-navy-600'
                  }`}
                >
                  {step.description}
                </div>
              </div>

              <ArrowRight
                className={`w-4 h-4 shrink-0 mt-0.5 transition-all ${
                  step.checked
                    ? 'text-navy-300'
                    : 'text-navy-400 group-hover:text-navy-600 group-hover:translate-x-0.5'
                }`}
                strokeWidth={1.8}
              />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
