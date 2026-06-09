import React, { useState } from 'react';
import type { CorrosionTestRecord, ConclusionStatus } from '../types';
import { STATUS_LABELS, RATING_DESCRIPTIONS } from '../types';
import { useApp } from '../context/AppContext';
import { findDuplicateBatches } from '../utils/analysis';

export function DuplicateTracker() {
  const { state, resolveDuplicate } = useApp();
  const duplicates = findDuplicateBatches(state.records);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [keepId, setKeepId] = useState<string>('');
  const [finalConclusion, setFinalConclusion] = useState<ConclusionStatus>('confirmed');
  const [remark, setRemark] = useState('');

  if (duplicates.length === 0) {
    return (
      <div className="card">
        <div className="card-title">
          批号重复追踪
          <span className="card-subtitle">检测并处理同批号的多条记录</span>
        </div>
        <div className="empty-state">
          <p>✅ 当前数据中未发现重复批号</p>
          <p className="text-sm">所有记录的批号都是唯一的</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        批号重复追踪
        <span className="card-subtitle">
          发现 <strong style={{ color: '#a855f7' }}>{duplicates.length}</strong> 个重复批号
        </span>
      </div>

      <div className="alert alert-warning">
        <div>
          <strong>请仔细核对以下重复批号</strong>
          <p className="text-sm mt-1">
            同一批号出现多条记录时，需要安全员确认是补录数据（合并）还是录入错误（删除）。
            合并后将保留一条记录，取最长试验时长和最严格评级。
          </p>
        </div>
      </div>

      {duplicates.map(dup => {
        const batchRecords = state.records.filter(r => r.batchNo === dup.batchNo);
        const isExpanded = selectedBatch === dup.batchNo;

        return (
          <div key={dup.batchNo} className="duplicate-panel">
            <div className="flex justify-between items-center">
              <h4 onClick={() => setSelectedBatch(isExpanded ? null : dup.batchNo)}
                  style={{ cursor: 'pointer' }}>
                📋 批号「<code>{dup.batchNo}</code>」有 {dup.recordIds.length} 条记录
                {dup.hasConflictingConclusions && (
                  <span className="status-tag fail" style={{ marginLeft: 10 }}>结论冲突</span>
                )}
                <span style={{ fontSize: 12, color: '#7c3aed', marginLeft: 8 }}>
                  {isExpanded ? '收起 ▲' : '展开 ▼'}
                </span>
              </h4>
              <div className="text-sm text-muted">
                {dup.firstRecordDate} ~ {dup.latestRecordDate}
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4">
                <p className="text-sm mb-2"><strong>影响的结论条目：</strong></p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {batchRecords.map(r => (
                    <div key={r.id} className="duplicate-list" style={{ flex: '1 1 280px' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <strong>{r.sampleName}</strong>
                          <div className="text-sm text-muted mt-1">
                            评级：{r.rating}级（{RATING_DESCRIPTIONS[r.rating]}）
                          </div>
                          <div className="text-sm text-muted">
                            {r.testDate} · {r.durationHours}h · {r.operator}
                          </div>
                        </div>
                        <span className={`status-tag ${r.conclusion}`}>
                          {STATUS_LABELS[r.conclusion]}
                        </span>
                      </div>
                      {r.remark && (
                        <div className="text-sm mt-2" style={{ color: '#6d28d9' }}>
                          💬 {r.remark}
                        </div>
                      )}
                      {r.reviewedBy && (
                        <div className="text-sm text-success mt-1">
                          ✓ 已由 {r.reviewedBy} 复核
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="card" style={{ background: '#faf5ff', padding: 16 }}>
                  <h5 style={{ color: '#6d28d9', marginBottom: 12 }}>🔧 合并处理（选择保留的记录）</h5>
                  <div className="form-group">
                    <label>保留记录</label>
                    <select
                      value={keepId}
                      onChange={e => setKeepId(e.target.value)}
                    >
                      <option value="">-- 请选择要保留的主记录 --</option>
                      {batchRecords.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.sampleName} — {r.testDate} — {STATUS_LABELS[r.conclusion]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-grid mt-4">
                    <div className="form-group">
                      <label>最终结论</label>
                      <select value={finalConclusion} onChange={e => setFinalConclusion(e.target.value as ConclusionStatus)}>
                        <option value="confirmed">已确认</option>
                        <option value="pass">通过</option>
                        <option value="fail">不通过</option>
                        <option value="pending">待确认</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group mt-4">
                    <label>合并备注</label>
                    <textarea
                      value={remark}
                      onChange={e => setRemark(e.target.value)}
                      placeholder="说明合并原因，例如：为同一批样品的不同时间检测结果，合并后取最严格评级"
                    />
                  </div>

                  <button
                    className="btn btn-warning mt-4"
                    onClick={() => {
                      if (!keepId) {
                        alert('请先选择要保留的记录');
                        return;
                      }
                      if (confirm(`确认合并？合并后同批号的其他 ${batchRecords.length - 1} 条记录将被删除，且无法撤销。`)) {
                        resolveDuplicate(keepId, dup.batchNo, finalConclusion, remark || undefined);
                        setSelectedBatch(null);
                        setKeepId('');
                        setRemark('');
                      }
                    }}
                  >
                    确认合并（删除其他 {batchRecords.length - 1} 条重复记录）
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
