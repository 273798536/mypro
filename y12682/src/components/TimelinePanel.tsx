import React, { useState } from 'react';
import { useTimelineStore, useRecordStore } from '../store';

const TimelinePanel: React.FC = () => {
  const { syncRecords, reviewSync } = useTimelineStore();
  const { addRecord } = useRecordStore();
  const [selectedSync, setSelectedSync] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewOpinion, setReviewOpinion] = useState('');
  const [reviewConclusion, setReviewConclusion] = useState('approved');

  const handleReview = (syncId: string) => {
    if (!reviewOpinion.trim()) return;

    reviewSync(syncId, {
      reviewer: '当前用户',
      time: Date.now(),
      opinion: reviewOpinion,
      conclusion: reviewConclusion,
    });

    addRecord({
      operator: '当前用户',
      operation: '复核时间轴同步',
      parameters: { 
        syncId, 
        opinion: reviewOpinion, 
        conclusion: reviewConclusion,
        reviewer: '当前用户',
        reviewTime: Date.now(),
      },
      result: 'success',
    });

    setReviewOpinion('');
    setShowReviewForm(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待复核',
      success: '已通过',
      failed: '未通过',
    };
    return labels[status] || status;
  };

  const sortedRecords = [...syncRecords].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ background: 'var(--color-background)', padding: '12px 16px' }}>
        📅 时间轴同步记录 ({syncRecords.length})
      </div>

      <div style={{ 
        padding: '12px', 
        background: '#FEF3C7', 
        borderBottom: '1px solid var(--color-border)',
        fontSize: '12px',
      }}>
        ⚠️ 时间轴不同步时会被记录，历史可追踪：谁改的、什么时候改的、为什么改
      </div>

      <div className="timeline-sync-section" style={{ flex: 1, overflow: 'auto' }}>
        {sortedRecords.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
          }}>
            暂无时间轴同步记录
          </div>
        ) : (
          sortedRecords.map(record => (
            <div key={record.id} className="sync-item">
              <div className="sync-header">
                <span className="sync-initiator">
                  👤 {record.initiator}
                </span>
                <span className={`sync-status ${record.status}`}>
                  {getStatusLabel(record.status)}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                ⏰ {new Date(record.timestamp).toLocaleString('zh-CN')}
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                  同步前：
                </div>
                <pre style={{ 
                  fontSize: '11px', 
                  background: 'var(--color-background)', 
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '80px',
                  fontFamily: 'Monaco, Menlo, monospace',
                }}>
                  {JSON.stringify(record.beforeState, null, 2)}
                </pre>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                  同步后：
                </div>
                <pre style={{ 
                  fontSize: '11px', 
                  background: 'var(--color-background)', 
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '80px',
                  fontFamily: 'Monaco, Menlo, monospace',
                }}>
                  {JSON.stringify(record.afterState, null, 2)}
                </pre>
              </div>

              {record.review && (
                <div className="sync-review">
                  <div className="review-header">
                    📋 复核信息 - {record.review.reviewer} | {new Date(record.review.time).toLocaleString('zh-CN')}
                  </div>
                  <div className="review-opinion">{record.review.opinion}</div>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '600',
                    color: record.review.conclusion === 'approved' ? 'var(--color-success)' : 'var(--color-error)',
                    marginTop: '4px',
                  }}>
                    结论：{record.review.conclusion === 'approved' ? '✓ 批准' : '✗ 拒绝'}
                  </div>
                </div>
              )}

              {selectedSync === record.id && showReviewForm && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                      复核意见：
                    </label>
                    <textarea
                      value={reviewOpinion}
                      onChange={(e) => setReviewOpinion(e.target.value)}
                      placeholder="说明复核意见..."
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                      复核结论：
                    </label>
                    <select
                      value={reviewConclusion}
                      onChange={(e) => setReviewConclusion(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <option value="approved">批准 - 同步有效</option>
                      <option value="rejected">拒绝 - 需要回滚</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleReview(record.id)}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                    >
                      ✓ 提交复核
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewOpinion('');
                      }}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {record.status === 'pending' && (
                <div style={{ marginTop: '12px' }}>
                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      setSelectedSync(record.id);
                      setShowReviewForm(true);
                    }}
                    style={{ width: '100%', padding: '6px 12px', fontSize: '12px' }}
                  >
                    🔍 复核
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ 
        borderTop: '1px solid var(--color-border)', 
        padding: '12px',
        background: 'var(--color-background)',
        fontSize: '11px',
        color: 'var(--color-text-secondary)',
      }}>
        📊 统计：待复核 {syncRecords.filter(r => r.status === 'pending').length} | 
        已通过 {syncRecords.filter(r => r.status === 'success').length} | 
        未通过 {syncRecords.filter(r => r.status === 'failed').length}
      </div>
    </div>
  );
};

export default TimelinePanel;
