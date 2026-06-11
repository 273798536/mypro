import { useState, useEffect } from 'react';
import { api, LABELS } from '../api';
import type { ReconciliationRecord, ReconciliationStatus, AppropriatenessCaliber } from '../types';

interface Props {
  refreshKey: number;
  onSelect: (id: string) => void;
  onExport: (filters: { status?: ReconciliationStatus; caliber?: AppropriatenessCaliber; conflictOnly?: boolean }) => void;
}

export default function ReconciliationWorkbench({ refreshKey, onSelect, onExport }: Props) {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [status, setStatus] = useState<ReconciliationStatus | ''>('');
  const [caliber, setCaliber] = useState<AppropriatenessCaliber | ''>('');
  const [conflictOnly, setConflictOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (status) params.status = status;
    if (caliber) params.caliber = caliber;
    if (conflictOnly) params.conflictOnly = true;
    api.listRecords(params).then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, [refreshKey, status, caliber, conflictOnly]);

  const totalAmount = records.reduce((s, r) => s + r.amount, 0);

  const rowClass = (r: ReconciliationRecord) => {
    if (r.isDualCaliberConflict && r.status !== 'split_passed') return 'row-conflict';
    if (r.isSplitRepayment || r.status === 'split_passed') return 'row-split';
    if (r.boundarySampleTag) return 'row-boundary';
    return '';
  };

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">对账记录列表（筛选条件与导出、异常队列保持一致）</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => onExport({ status: status || undefined, caliber: caliber || undefined, conflictOnly })}>
              导出 CSV
            </button>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label>状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="">全部</option>
              {Object.entries(LABELS.statuses).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>口径</label>
            <select value={caliber} onChange={(e) => setCaliber(e.target.value as any)}>
              <option value="">全部口径</option>
              {Object.entries(LABELS.calibers).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={conflictOnly}
                onChange={(e) => setConflictOnly(e.target.checked)}
                style={{ marginRight: 4 }}
              />
              仅看双口径冲突
            </label>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#595959' }}>
            共 <b style={{ color: '#1890ff' }}>{records.length}</b> 条，
            合计金额 <b style={{ color: '#cf1322', fontFamily: 'monospace' }}>¥{totalAmount.toLocaleString()}</b>
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>业务编号</th>
                <th>业务日期</th>
                <th>客户</th>
                <th>产品</th>
                <th style={{ textAlign: 'right' }}>金额(元)</th>
                <th>主口径</th>
                <th>次口径</th>
                <th>状态</th>
                <th>结论</th>
                <th>风险标记</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="empty-state">加载中...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={10} className="empty-state">暂无记录</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={rowClass(r)} onClick={() => onSelect(r.id)}>
                  <td><span className="link-text">{r.businessNo}</span></td>
                  <td>{r.businessDate}</td>
                  <td>{r.clientName}</td>
                  <td>{r.productName}</td>
                  <td className="amount-cell">{r.amount.toLocaleString()}</td>
                  <td>{LABELS.calibers[r.primaryCaliber]}</td>
                  <td>{r.secondaryCaliber ? LABELS.calibers[r.secondaryCaliber] : '-'}</td>
                  <td>
                    <span
                      className="status-tag"
                      style={{
                        background: LABELS.statusColor[r.status] + '15',
                        color: LABELS.statusColor[r.status],
                        borderColor: LABELS.statusColor[r.status] + '50',
                      }}
                    >
                      {LABELS.statuses[r.status]}
                    </span>
                  </td>
                  <td>
                    {r.currentConclusion
                      ? (r.status === 'split_passed'
                          ? <span className="status-tag" style={{ background: '#f9f0ff', color: '#722ed1', borderColor: '#d3adf7' }}>回款拆分放行</span>
                          : LABELS.conclusions[r.currentConclusion])
                      : '-'}
                  </td>
                  <td>
                    {r.isDualCaliberConflict && (
                      <span
                        className="status-tag"
                        style={{ background: '#fff0f6', color: '#eb2f96', borderColor: '#ffadd2', marginRight: 4 }}
                      >
                        双口径冲突
                      </span>
                    )}
                    {r.isSplitRepayment && (
                      <span
                        className="status-tag"
                        style={{ background: '#f9f0ff', color: '#722ed1', borderColor: '#d3adf7', marginRight: 4 }}
                      >
                        回款拆分
                      </span>
                    )}
                    {r.boundarySampleTag && (
                      <span
                        className="status-tag"
                        style={{ background: '#fffbe6', color: '#d48806', borderColor: '#ffe58f' }}
                      >
                        边界样本
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
