import { useReviewStore } from '@/stores/useReviewStore';
import { reviewExplanations } from '@/data/explanations';
import type { ReviewStep } from '@/types';
import {
  Check,
  PlayCircle,
  FilePlus2,
  UserCheck,
  RotateCcw,
  Info,
  AlertCircle,
  Loader,
} from 'lucide-react';

const steps: { key: ReviewStep; label: string; desc: string; icon: typeof PlayCircle; actionLabel: string }[] = [
  { key: 'repeat', label: '重复运行', desc: '跑两次仿真，确认结论稳定', icon: PlayCircle, actionLabel: '执行重复运行' },
  { key: 'supplement', label: '数据补录', desc: '手动填补数据缺口，标记不可信段', icon: FilePlus2, actionLabel: '提交补录数据' },
  { key: 'confirm', label: '人工确认', desc: '工程师签字，对结论负责', icon: UserCheck, actionLabel: '确认签字' },
];

export function ReviewPanel() {
  const records = useReviewStore((s) => s.records);
  const completeRepeat = useReviewStore((s) => s.completeRepeat);
  const supplementInput = useReviewStore((s) => s.supplementInput);
  const setSupplementInput = useReviewStore((s) => s.setSupplementInput);
  const submitSupplement = useReviewStore((s) => s.submitSupplement);
  const confirmSignature = useReviewStore((s) => s.confirmSignature);
  const setConfirmSignature = useReviewStore((s) => s.setConfirmSignature);
  const completeConfirm = useReviewStore((s) => s.completeConfirm);
  const setOperatorName = useReviewStore((s) => s.setOperatorName);
  const operatorName = useReviewStore((s) => s.operatorName);
  const resetAll = useReviewStore((s) => s.resetAll);
  const isStepComplete = useReviewStore((s) => s.isStepComplete);
  const currentStep = useReviewStore.getState().currentStep;
  const allComplete = steps.every((s) => isStepComplete(s.key));

  return (
    <div className="space-y-4 p-4">
      {/* 头部说明 */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-emerald-300">给运维看之前，这三件事少一个都不行：</span>
            重复运行确认稳定、数据补录填上缺口、人工确认签字背书。
            日常使用打折就是从跳过某一步开始的。
          </div>
        </div>
      </div>

      {/* 总体进度 */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">复核进度</span>
          <button
            onClick={resetAll}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
          >
            <RotateCcw size={11} />
            重置流程
          </button>
        </div>
        <div className="flex items-center gap-2">
          {steps.map((step, idx) => {
            const done = records[step.key].completed;
            const isCurrent = currentStep === step.key && !done;
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {done ? <Check size={14} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 rounded ${
                      done ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {allComplete && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <Check size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">全部复核完成，可以交付运维组</span>
          </div>
        )}
      </div>

      {/* 操作员 */}
      <div>
        <label className="mb-1 block text-[11px] text-slate-400">复核操作员</label>
        <input
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          placeholder="您的姓名或工号..."
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-500/60"
        />
      </div>

      {/* 步骤详情 */}
      {steps.map((step) => {
        const record = records[step.key];
        const StepIcon = step.icon;
        const done = record.completed;
        const canDo = step.key === 'repeat' || isStepComplete(steps[steps.findIndex(s => s.key === step.key) - 1]?.key as ReviewStep);

        return (
          <div
            key={step.key}
            className={`rounded-lg border p-3 transition-all ${
              done
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : canDo
                  ? 'border-slate-700/60 bg-slate-800/40'
                  : 'border-slate-800 bg-slate-900/30 opacity-60'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <StepIcon size={14} className={done ? 'text-emerald-400' : canDo ? 'text-cyan-400' : 'text-slate-600'} />
              <span className={`text-xs font-bold ${done ? 'text-emerald-300' : 'text-slate-200'}`}>
                {step.label}
              </span>
              {done && <span className="ml-auto text-[10px] text-emerald-400">✓ 已完成</span>}
            </div>

            <div className="mb-2 rounded-md border border-slate-700/40 bg-slate-900/40 p-2 text-[10.5px] text-slate-400 leading-relaxed">
              💡 <span className="text-slate-300">{reviewExplanations[step.key]}</span>
            </div>

            {done ? (
              <div className="space-y-1 rounded-md bg-slate-900/60 p-2 text-[11px]">
                {record.operator && (
                  <div><span className="text-slate-500">操作员：</span><span className="text-slate-200">{record.operator}</span></div>
                )}
                {record.timestamp && (
                  <div><span className="text-slate-500">时间：</span><span className="text-slate-200">{new Date(record.timestamp).toLocaleString('zh-CN')}</span></div>
                )}
                {record.note && (
                  <div><span className="text-slate-500">备注：</span><span className="text-slate-300">{record.note}</span></div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {step.key === 'supplement' && (
                  <textarea
                    value={supplementInput}
                    onChange={(e) => setSupplementInput(e.target.value)}
                    disabled={!canDo}
                    placeholder="例如：15:32-15:40 阀门B传感器离线，补录人工读数62%，来源：现场巡检记录..."
                    rows={2}
                    className="w-full resize-none rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-500/60 disabled:opacity-50"
                  />
                )}
                {step.key === 'confirm' && (
                  <input
                    type="text"
                    value={confirmSignature}
                    onChange={(e) => setConfirmSignature(e.target.value)}
                    disabled={!canDo}
                    placeholder="请输入您的姓名作为签字确认"
                    className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-500/60 disabled:opacity-50"
                  />
                )}
                <button
                  onClick={() => {
                    if (step.key === 'repeat') completeRepeat();
                    else if (step.key === 'supplement') submitSupplement();
                    else if (step.key === 'confirm') completeConfirm();
                  }}
                  disabled={!canDo || (step.key === 'supplement' && !supplementInput.trim()) || (step.key === 'confirm' && !confirmSignature.trim())}
                  className="w-full rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {step.actionLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
