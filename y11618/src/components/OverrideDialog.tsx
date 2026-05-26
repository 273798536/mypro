import { useState } from 'react';
import type { InvoiceAnalysis } from '../types';

interface Props {
  analysis: InvoiceAnalysis | null;
  onSubmit: (data: {
    targetId: string;
    reason: string;
    newDays?: number;
    operator: string;
    scope: 'single' | 'batch' | 'supplier_all';
  }) => void;
  onClose: () => void;
}

export function OverrideDialog({ analysis, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [newDays, setNewDays] = useState('');
  const [operator, setOperator] = useState('当前用户');

  if (!analysis) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('请填写改判理由');
      return;
    }
    const days = newDays.trim() ? parseInt(newDays, 10) : undefined;
    onSubmit({
      targetId: analysis.invoiceId,
      reason: reason.trim(),
      newDays: days,
      operator: operator.trim(),
      scope: 'single',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>人工改判: {analysis.invoiceCode}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="override-info">
            <p><strong>供应商:</strong> {analysis.supplierName}</p>
            <p><strong>当前版本:</strong> {analysis.appliedRuleVersionLabel}</p>
            <p><strong>当前账期:</strong> {analysis.effectiveDays}天</p>
            <p><strong>应付款日:</strong> {analysis.dueDate}</p>
          </div>

          <div className="form-group">
            <label>新账期(天) <span className="optional">可选</span></label>
            <input
              type="number"
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
              placeholder="留空则使用规则版本"
              min={0}
            />
          </div>

          <div className="form-group">
            <label>改判理由 <span className="required">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明改判原因，将作为追溯依据"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>操作人</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            确认改判
          </button>
        </div>
      </div>
    </div>
  );
}
