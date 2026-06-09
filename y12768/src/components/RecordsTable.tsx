import React, { useState } from 'react';
import type { CorrosionTestRecord } from '../types';
import { STATUS_LABELS, SOURCE_LABELS, RATING_DESCRIPTIONS } from '../types';
import { useApp } from '../context/AppContext';
import { RecordForm } from './RecordForm';
import { ReviewModal } from './ReviewModal';

const RATING_COLORS: Record<number, string> = {
  0: '#22c55e', 1: '#22c55e', 2: '#4ade80', 3: '#86efac', 4: '#a3e635',
  5: '#eab308', 6: '#f59e0b', 7: '#fb923c', 8: '#f97316', 9: '#ef4444', 10: '#991b1b'
};

interface Props {
  records: CorrosionTestRecord[];
}

export function RecordsTable({ records }: Props) {
  const { deleteRecord } = useApp();
  const [editingRecord, setEditingRecord] = useState<CorrosionTestRecord | null>(null);
  const [reviewingRecord, setReviewingRecord] = useState<CorrosionTestRecord | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = records.filter(r => {
    if (filter !== 'all' && r.conclusion !== filter) return false;
    if (search && !r.sampleName.includes(search) && !r.batchNo.includes(search)) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  );

  return (
    <div className="card">
      <div className="card-title">
        腐蚀评级记录
        <span className="card-subtitle">共 {filtered.length} 条记录</span>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="btn btn-secondary"
          style={{ padding: '7px 12px' }}
        >
          <option value="all">全部状态</option>
          <option value="pending">待确认</option>
          <option value="pass">通过</option>
          <option value="fail">不通过</option>
          <option value="confirmed">已确认</option>
        </select>
        <input
          type="text"
          placeholder="搜索样品名称或批号..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', flex: 1, maxWidth: 300 }}
        />
        <button className="btn btn-primary" onClick={() => setEditingRecord({} as CorrosionTestRecord)}>
          + 新增记录
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>暂无匹配的记录</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>样品名称</th>
                <th>批号</th>
                <th>试验日期</th>
                <th>时长(h)</th>
                <th>评级</th>
                <th>结论</th>
                <th>来源</th>
                <th>操作员</th>
                <th>复核</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(record => (
                <tr key={record.id} style={record.isDuplicateWarning ? { background: '#faf5ff' } : undefined}>
                  <td>
                    {record.sampleName}
                    {record.isDuplicateWarning && (
                      <span title="批号重复，待复核" style={{ marginLeft: 6, color: '#a855f7' }}>⚠</span>
                    )}
                    {record.remark && (
                      <div className="text-sm text-muted" title={record.remark}>
                        {record.remark.length > 30 ? record.remark.slice(0, 30) + '...' : record.remark}
                      </div>
                    )}
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                      {record.batchNo}
                    </code>
                  </td>
                  <td>{record.testDate}</td>
                  <td>{record.durationHours}</td>
                  <td>
                    <span
                      className="rating-badge"
                      style={{ background: RATING_COLORS[record.rating] }}
                      title={RATING_DESCRIPTIONS[record.rating]}
                    >
                      {record.rating}
                    </span>
                  </td>
                  <td>
                    <span className={`status-tag ${record.conclusion}`}>
                      {STATUS_LABELS[record.conclusion]}
                    </span>
                  </td>
                  <td>
                    <span className={`source-tag ${record.source}`}>
                      {SOURCE_LABELS[record.source]}
                    </span>
                  </td>
                  <td>{record.operator}</td>
                  <td className="text-sm">
                    {record.reviewedBy ? (
                      <span className="text-success">✓ {record.reviewedBy}</span>
                    ) : (
                      <span className="text-muted">未复核</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingRecord(record)}>
                        编辑
                      </button>
                      {!record.reviewedBy && (
                        <button className="btn btn-sm btn-warning" onClick={() => setReviewingRecord(record)}>
                          复核
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm(`确认删除记录「${record.sampleName}」？`)) {
                            deleteRecord(record.id);
                          }
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingRecord !== null && (
        <RecordForm
          record={editingRecord.id ? editingRecord : null}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {reviewingRecord && (
        <ReviewModal
          record={reviewingRecord}
          onClose={() => setReviewingRecord(null)}
        />
      )}
    </div>
  );
}
