import React, { useState } from 'react';
import type { CorrosionTestRecord, ConclusionStatus } from '../types';
import { STATUS_LABELS, RATING_DESCRIPTIONS } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  record: CorrosionTestRecord;
  onClose: () => void;
}

export function ReviewModal({ record, onClose }: Props) {
  const { reviewRecord, state } = useApp();
  const [conclusion, setConclusion] = useState<ConclusionStatus>('pending');
  const [remark, setRemark] = useState(record.remark || '');
  const [reviewer, setReviewer] = useState('');

  const sameBatchRecords = state.records.filter(r => r.batchNo === record.batchNo);
  const hasDuplicate = sameBatchRecords.length > 1;

  const handleSubmit = () => {
    if (!reviewer.trim()) {
      alert('请输入复核人姓名');
      return;
    }
    reviewRecord(record.id, reviewer.trim(), conclusion, remark || undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>安全员复核 — {record.sampleName}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {hasDuplicate && (
            <div className="alert alert-warning mb-4">
              <div>
                <strong>⚠ 批号重复提示</strong>
                <p className="text-sm mt-1">
                  该批号「{record.batchNo}」共有 {sameBatchRecords.length} 条记录，
                  请确认是否为同一件事。建议先到「批号追踪」页面处理合并。
                </p>
                <ul className="mt-2">
                  {sameBatchRecords.map(r => (
                    <li key={r.id}>
                      {r.sampleName} — {r.testDate} — {STATUS_LABELS[r.conclusion]}
                      {r.id === record.id ? '（当前记录）' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="card" style={{ background: '#f8fafc', padding: 16, marginBottom: 16 }}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><strong>样品名称：</strong>{record.sampleName}</div>
              <div><strong>批号：</strong><code>{record.batchNo}</code></div>
              <div><strong>试验日期：</strong>{record.testDate}</div>
              <div><strong>时长：</strong>{record.durationHours} 小时</div>
              <div>
                <strong>评级：</strong>{record.rating}级 — {RATING_DESCRIPTIONS[record.rating]}
              </div>
              <div>
                <strong>当前结论：</strong>
                <span className={`status-tag ${record.conclusion}`} style={{ marginLeft: 4 }}>
                  {STATUS_LABELS[record.conclusion]}
                </span>
              </div>
              <div><strong>操作员：</strong>{record.operator}</div>
              <div><strong>数据来源：</strong>{record.source}</div>
            </div>
            {record.remark && (
              <div className="mt-4"><strong>原备注：</strong>{record.remark}</div>
            )}
            {record.reagentLedgerIds.length > 0 && (
              <div className="mt-4">
                <strong>关联试剂台账（{record.reagentLedgerIds.length}份）：</strong>
                <ul style={{ marginLeft: 20, marginTop: 4 }}>
                  {record.reagentLedgerIds.map(id => {
                    const ledger = state.reagentLedgers.find(l => l.id === id);
                    const reagent = ledger ? state.reagents.find(r => r.id === ledger.reagentId) : null;
                    return <li key={id}>{reagent?.name || '未知试剂'} — {ledger?.testDate || '无日期'}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>复核人<span className="required">*</span></label>
            <input
              type="text"
              value={reviewer}
              onChange={e => setReviewer(e.target.value)}
              placeholder="请输入安全员姓名"
            />
          </div>

          <div className="form-group mt-4">
            <label>复核结论<span className="required">*</span></label>
            <div className="btn-row">
              {(['pass', 'fail', 'confirmed', 'pending'] as ConclusionStatus[]).map(s => (
                <label key={s} className={`checkbox-item ${conclusion === s ? 'active' : ''}`}
                  style={{ cursor: 'pointer', background: conclusion === s ? '#dbeafe' : '#f8fafc',
                    border: conclusion === s ? '2px solid #3b82f6' : '1px solid #e2e8f0' }}>
                  <input
                    type="radio"
                    name="conclusion"
                    checked={conclusion === s}
                    onChange={() => setConclusion(s)}
                  />
                  {STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group mt-4">
            <label>复核备注</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="说明复核意见，特别注意重复批号的处理结论"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>确认复核</button>
        </div>
      </div>
    </div>
  );
}
