import { useState } from 'react';
import { StickyNote, Check, ListChecks, AlertOctagon, ArrowRight } from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import type { CalculationRule } from '@/types';
import {
  getStatusLabel,
  getStatusColorClass,
} from '@/utils/reconciliation';

interface RemarkEditorProps {
  transactionId: string;
  rules: CalculationRule[];
  existingRemark?: string;
}

export default function RemarkEditor({
  transactionId,
  rules,
  existingRemark,
}: RemarkEditorProps) {
  const { addRemark, addHistory, histories } = useReconciliationStore();
  const [content, setContent] = useState(existingRemark ?? '');
  const [changeReason, setChangeReason] = useState('');
  const [affected, setAffected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [lastResult, setLastResult] = useState<{
    oldStatus: string;
    newStatus: string;
  } | null>(null);

  const toggleAffected = (ruleId: string) => {
    setAffected((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  const conflictRules = rules.filter((r) => r.isConflict);

  const handleSave = () => {
    if (!content.trim()) return;
    const result = addRemark(transactionId, content.trim(), affected);
    setLastResult({
      oldStatus: getStatusLabel(result.oldStatus),
      newStatus: getStatusLabel(result.newStatus),
    });
    const reasonText =
      changeReason.trim() ||
      `复核员根据补充信息调整判断：状态由「${getStatusLabel(result.oldStatus)}」改为「${getStatusLabel(result.newStatus)}」。`;
    const detailReason = result.oldStatus !== result.newStatus
      ? `${reasonText}（${result.oldConclusion} → ${result.newConclusion}）`
      : reasonText;
    addHistory(
      transactionId,
      result.oldConclusion,
      content.trim(),
      detailReason,
      [
        '原始银行流水（见上方卡片）',
        `受影响规则：${affected.length > 0 ? affected.join(', ') : '未指定具体规则，仅补充说明'}`,
        `状态变更：${getStatusLabel(result.oldStatus)} → ${getStatusLabel(result.newStatus)}`,
      ]
    );
    setChangeReason('');
    setAffected([]);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setLastResult(null);
    }, 3500);
  };

  return (
    <div className="card p-6 animate-fade-up opacity-0" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-dark" strokeWidth={2} />
          <h3 className="section-title">临时补录备注（周一早会）</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-500">
          <AlertOctagon className="w-3.5 h-3.5" strokeWidth={1.8} />
          保存后系统会记录：旧结论 / 新备注 / 改判原因，并按受影响规则重算状态
        </div>
      </div>
      <div className="divider-pattern mb-5" />

      {saved && lastResult && (
        <div className="mb-5 p-3 rounded-sm border border-emerald/30 bg-emerald/8 flex items-center gap-3 animate-fade-up">
          <Check className="w-5 h-5 text-emerald-dark shrink-0" strokeWidth={2.2} />
          <div className="flex-1 text-sm text-navy-700 flex items-center gap-2 flex-wrap">
            <span>已保存。对账状态：</span>
            <span className={`chip ${getStatusColorClass(lastResult.oldStatus as any)} line-through`}>
              {lastResult.oldStatus}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-navy-500" strokeWidth={2} />
            <span className={`chip ${getStatusColorClass(lastResult.newStatus as any)}`}>
              {lastResult.newStatus}
            </span>
            <span className="text-xs text-navy-500 ml-auto">
              详情页/仪表盘/导出已同步刷新
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div>
            <label className="label-text">
              补充备注内容 <span className="text-amber-dark">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="例：周一早会补充：此款对应南北两个项目，原口径全部归供应链预付款，现需拆分……"
            />
          </div>
          <div>
            <label className="label-text">
              改判原因（说明这条备注改变了哪些判断；如为空系统会自动填写）
            </label>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="例：补充信息显示：北方项目 98 万属供应链预付款，南方项目 60 万属运营费用项下原料采购，原判断未拆分。"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-text flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" strokeWidth={1.8} />
              受影响的判断（勾选的规则会改为"未命中"并从状态中移除）
            </label>
            <div className="space-y-2 border border-navy-100 rounded-sm p-3 bg-cream/40 max-h-[220px] overflow-auto">
              {conflictRules.length === 0 ? (
                <div className="text-xs text-navy-400 py-2 text-center">
                  该流水暂未发现冲突规则（不勾选也会保存备注并重算）
                </div>
              ) : (
                conflictRules.map((rule) => (
                  <label
                    key={rule.id}
                    className="flex items-start gap-2 p-2 rounded-sm hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={affected.includes(rule.id)}
                      onChange={() => toggleAffected(rule.id)}
                      className="mt-0.5 accent-navy-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-navy-700">
                        {rule.caliberDisplayName} · {rule.ruleName}
                      </div>
                      <div className="text-[11px] text-navy-500 mt-0.5 leading-snug">
                        {rule.ruleDetail}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!content.trim() || saved}
            className="w-full btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 animate-spin-check" strokeWidth={2.2} />
                已保存到历史
              </>
            ) : (
              <>
                <StickyNote className="w-4 h-4" strokeWidth={1.8} />
                保存备注并重算对账
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
