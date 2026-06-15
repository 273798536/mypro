import type { PageSummary, AllStates } from '../types';

interface Props {
  summary: PageSummary | null;
  appState: AllStates | null;
  onRefresh: () => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: '#f59e0b' },
  reviewing: { label: '审核中', color: '#3b82f6' },
  approved: { label: '已通过', color: '#10b981' },
  rejected: { label: '已驳回', color: '#ef4444' },
};

export default function SummaryPanel({ summary, appState, onRefresh }: Props) {
  if (!summary) {
    return <div className="summary-panel">加载摘要...</div>;
  }

  return (
    <div className="summary-panel">
      <h3>📊 页面摘要</h3>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-number">{summary.total_count}</div>
          <div className="stat-label">总记录数</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#f59e0b' }}>
            {summary.issue_count}
          </div>
          <div className="stat-label">待处理问题</div>
        </div>
      </div>

      <div className="status-breakdown">
        <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#64748b' }}>
          状态分布
        </h4>
        {Object.entries(summary.status_count).map(([key, count]) => (
          <div key={key} className="status-row">
            <span>
              <span
                className="status-dot"
                style={{ backgroundColor: statusLabels[key]?.color }}
              ></span>
              {statusLabels[key]?.label || key}
            </span>
            <span style={{ fontWeight: 600 }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#64748b' }}>
          数据完整度
        </h4>
        <div className="status-row" style={{ marginBottom: '6px' }}>
          <span>含最终结论</span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>
            {summary.with_conclusion} / {summary.total_count}
          </span>
        </div>
        <div className="status-row" style={{ marginBottom: '6px' }}>
          <span>关联备注信息</span>
          <span style={{ fontWeight: 600, color: '#3b82f6' }}>
            {summary.with_linked_notes} / {summary.total_count}
          </span>
        </div>
        <div className="status-row">
          <span>别名重复问题</span>
          <span style={{ fontWeight: 600, color: summary.duplicate_count > 0 ? '#ef4444' : '#10b981' }}>
            {summary.duplicate_count} 组
          </span>
        </div>
      </div>

      {appState?.processing_status?.value && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#64748b' }}>
            🔄 处理状态
          </h4>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
            <div>当前阶段：{appState.processing_status.value.current_phase}</div>
            <div>上次操作人：{appState.processing_status.value.last_operator}</div>
            <div>待复核：{appState.processing_status.value.pending_review_count} 条</div>
          </div>
        </div>
      )}

      {summary.last_updated && (
        <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8' }}>
          摘要更新于: {new Date(summary.last_updated).toLocaleString('zh-CN')}
        </div>
      )}

      <button
        className="btn btn-outline btn-sm"
        style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
        onClick={onRefresh}
      >
        ↻ 刷新摘要
      </button>
    </div>
  );
}
