import { useState, useEffect } from 'react';
import { api, LABELS } from '../api';
import type { ExceptionQueueItem, ReconciliationRecord } from '../types';

interface Props {
  refreshKey: number;
  onSelect: (id: string) => void;
}

export default function ExceptionQueueView({ refreshKey, onSelect }: Props) {
  const [items, setItems] = useState<Array<{ exception: ExceptionQueueItem; record: ReconciliationRecord }>>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.listExceptionQueue().then((r) => {
      setItems(r);
      setLoading(false);
    });
  }, [refreshKey]);

  const filtered = severityFilter ? items.filter((i) => i.exception.severity === severityFilter) : items;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          异常队列（筛选口径保留在异常记录中，与工作台筛选一致）
        </div>
        <div className="filter-group">
          <label>严重程度</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">全部</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>严重程度</th>
              <th>业务编号</th>
              <th>业务日期</th>
              <th>客户</th>
              <th>产品</th>
              <th style={{ textAlign: 'right' }}>金额</th>
              <th>异常原因</th>
              <th>关联口径</th>
              <th>记录状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="empty-state">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="empty-state">异常队列已清空 🎉</td></tr>
            ) : filtered.map(({ exception, record }) => (
              <tr key={exception.id} onClick={() => onSelect(record.id)} style={{ cursor: 'pointer' }}>
                <td>
                  <span
                    className="status-tag"
                    style={{
                      background: LABELS.severityColor[exception.severity] + '20',
                      color: LABELS.severityColor[exception.severity],
                      borderColor: LABELS.severityColor[exception.severity] + '60',
                    }}
                  >
                    {exception.severity === 'high' ? '🔴 高' : exception.severity === 'medium' ? '🟡 中' : '🟢 低'}
                  </span>
                </td>
                <td><span className="link-text">{record.businessNo}</span></td>
                <td>{record.businessDate}</td>
                <td>{record.clientName}</td>
                <td>{record.productName}</td>
                <td className="amount-cell">¥{record.amount.toLocaleString()}</td>
                <td style={{ color: '#d46b08' }}>{exception.reason}</td>
                <td>
                  {exception.caliberFilter.map((c, i) => (
                    <span key={i} className="materials-tag" style={{ background: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb' }}>
                      {LABELS.calibers[c]}
                    </span>
                  ))}
                </td>
                <td>
                  <span
                    className="status-tag"
                    style={{
                      background: LABELS.statusColor[record.status] + '15',
                      color: LABELS.statusColor[record.status],
                      borderColor: LABELS.statusColor[record.status] + '50',
                    }}
                  >
                    {LABELS.statuses[record.status]}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onSelect(record.id); }}>
                    复核
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
