import type { InvoiceAnalysis, RuleVersion } from '../types';
import { ConflictWarning } from './ConflictWarning';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../engine/paymentStatus';

interface Props {
  analysis: InvoiceAnalysis | null;
  ruleVersions: RuleVersion[];
  onClose: () => void;
}

export function InvoiceDetail({ analysis, ruleVersions, onClose }: Props) {
  if (!analysis) return null;

  const versionsForSupplier = ruleVersions.filter(
    (v) => v.supplierId === analysis.supplierId,
  );

  return (
    <div className="invoice-detail" onClick={(e) => e.stopPropagation()}>
      <div className="detail-header">
        <h3>发票详情: {analysis.invoiceCode}</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <ConflictWarning analysis={analysis} />

      <div className="detail-section">
        <h4>基本信息</h4>
        <div className="info-grid">
          <div><span>供应商:</span> <strong>{analysis.supplierName}</strong></div>
          <div><span>合同:</span> {analysis.contractCode}</div>
          <div><span>开票日期:</span> {analysis.invoiceDate}</div>
          <div><span>金额:</span> ¥{analysis.amount.toLocaleString()}</div>
          <div><span>入库状态:</span> {analysis.receiptStatus}</div>
          <div>
            <span>付款状态:</span>{' '}
            <span
              className="status-dot"
              style={{ background: PAYMENT_STATUS_COLORS[analysis.paymentStatus] }}
            />
            {PAYMENT_STATUS_LABELS[analysis.paymentStatus]}
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>账期规则</h4>
        <div className="info-grid">
          <div>
            <span>适用版本:</span>{' '}
            <strong>{analysis.appliedRuleVersionLabel}</strong>
          </div>
          <div>
            <span>基准账期:</span>{' '}
            {analysis.effectiveDays !== analysis.baseDays && (
              <span className="strike">{analysis.baseDays}天</span>
            )}{' '}
            {analysis.effectiveDays}天
          </div>
          <div><span>应付款日:</span> {analysis.dueDate}</div>
          {analysis.overrideApplied && (
            <div>
              <span>改判理由:</span> <em>{analysis.overrideReason}</em>
            </div>
          )}
        </div>
      </div>

      {versionsForSupplier.length > 1 && (
        <div className="detail-section">
          <h4>规则版本时间线</h4>
          <div className="timeline">
            {versionsForSupplier
              .sort(
                (a, b) =>
                  new Date(a.effectiveDate).getTime() -
                  new Date(b.effectiveDate).getTime(),
              )
              .map((v) => (
                <div
                  key={v.id}
                  className={`timeline-item ${v.id === analysis.appliedRuleVersionId ? 'active' : ''} ${!v.isActive ? 'inactive' : ''}`}
                >
                  <div className="timeline-date">{v.effectiveDate}</div>
                  <div className="timeline-label">{v.versionLabel}</div>
                  <div className="timeline-days">{v.baseDays}天</div>
                  {v.id === analysis.appliedRuleVersionId && (
                    <span className="timeline-active">✓ 适用</span>
                  )}
                  {!v.isActive && <span className="timeline-inactive">已停用</span>}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h4>来源信息</h4>
        <div className="source-block">
          <span className="src-tag">
            {analysis.sourceRef.source}#{analysis.sourceRef.lineNumber}
          </span>
          <span className="src-label">{analysis.sourceRef.label}</span>
        </div>
      </div>
    </div>
  );
}
