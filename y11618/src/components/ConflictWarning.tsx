import type { InvoiceAnalysis } from '../types';

interface Props {
  analysis: InvoiceAnalysis;
}

const conflictDescriptions: Record<string, string> = {
  contract_switch: '该发票涉及合同版本切换，可能影响账期计算',
  partial_receipt: '该发票关联部分入库单，金额与入库不完全对应',
  retroactive_change: '该发票在开票后被追溯改判，需注意时间范围',
  rule_mismatch: '该发票适用规则与付款记录存在差异',
  payment_delay: '实际付款时间晚于应付款日',
  version_overlap: '同一合同下存在多个激活的规则版本',
};

export function ConflictWarning({ analysis }: Props) {
  if (!analysis.conflictType) return null;

  return (
    <div className={`conflict-banner conflict-${analysis.conflictType}`}>
      <div className="conflict-header">
        <span className="conflict-icon">⚠</span>
        <strong>冲突检测: {analysis.conflictType.replace('_', ' ')}</strong>
      </div>
      <p className="conflict-desc">
        {conflictDescriptions[analysis.conflictType] ?? '存在潜在的规则或数据冲突'}
      </p>
      {analysis.conflictDetail && (
        <div className="conflict-detail">
          <code>{analysis.conflictDetail}</code>
        </div>
      )}
      {analysis.warnings.length > 0 && (
        <div className="conflict-warnings">
          {analysis.warnings.map((w, i) => (
            <div key={i} className={`conflict-w-item level-${w.level}`}>
              <span className="w-level">[{w.level.toUpperCase()}]</span>
              <span className="w-msg">{w.message}</span>
              <span className="w-src">
                来源: {w.sourceRef.source}#{w.sourceRef.lineNumber}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
