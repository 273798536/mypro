import React, { useState } from 'react';
import { BoundaryCase, LabelJudgment } from '../types';
import { boundaryCases } from '../mockData';
import TraceChain from './TraceChain';

const severityBadge: Record<string, string> = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-info',
};

const severityText: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const labelText: Record<LabelJudgment, string> = {
  positive: '正样本',
  negative: '负样本',
  neutral: '中性',
  uncertain: '不确定',
};

const categoryIcon: Record<string, string> = {
  dirty_duplicate: '🔁',
  train_val_leak: '🚰',
  missing_unit: '📏',
  supplementary_note: '📝',
  old_table_format: '📋',
};

const BoundaryCases: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>(boundaryCases[0].id);

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          边界案例（评审会重点）
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
            {boundaryCases.length} 个典型案例，每个均真的改变了判断结果
          </span>
        </div>
      </div>

      {boundaryCases.map((bc: BoundaryCase) => {
        const expanded = expandedId === bc.id;
        return (
          <div
            className="boundary-case"
            key={bc.id}
            style={{ cursor: 'pointer', borderColor: expanded ? 'var(--accent-blue)' : 'var(--border-color)' }}
            onClick={() => setExpandedId(expanded ? '' : bc.id)}
          >
            <div className="boundary-case-header">
              <div className="boundary-case-title">
                <span style={{ fontSize: 20 }}>{categoryIcon[bc.category] || '📌'}</span>
                {bc.title}
                <span className={`badge ${severityBadge[bc.severity]}`} style={{ marginLeft: 8 }}>
                  <span className="badge-dot" />
                  {severityText[bc.severity]}
                </span>
                {bc.judgmentChanged && (
                  <span className="badge badge-warning" style={{ marginLeft: 4 }}>
                    <span className="badge-dot" />
                    判断翻转
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {expanded ? '收起 ▲' : '展开 ▼'}
              </span>
            </div>
            <div className="boundary-case-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{bc.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div style={{ background: 'rgba(255,92,122,0.06)', border: '1px solid rgba(255,92,122,0.2)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ff8fa3', marginBottom: 10 }}>
                    根因
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{bc.rootCause}</div>
                </div>
                <div style={{ background: 'rgba(245,196,81,0.06)', border: '1px solid rgba(245,196,81,0.2)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f5c451', marginBottom: 10 }}>
                    实际影响
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{bc.impactSummary}</div>
                </div>
              </div>

              <div className="before-after">
                <div className="before-after-col">
                  <div className="before-after-label before-label">修正前 / 问题状态</div>
                  <div className="before-after-content">
                    {Object.entries(bc.beforeState).map(([k, v], i) => (
                      <div className="code-line" key={i}>
                        <span className="label">{k}:</span>
                        <span className="value-old">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="before-after-col">
                  <div className="before-after-label after-label">修正后 / 目标状态</div>
                  <div className="before-after-content">
                    {Object.entries(bc.afterState).map(([k, v], i) => (
                      <div className="code-line" key={i}>
                        <span className="label">{k}:</span>
                        <span className="value-new">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>判断变化：</span>
                <span className="cell-danger">{labelText[bc.oldJudgment]}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span className="cell-success">{labelText[bc.newJudgment]}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  涉及材料：{bc.materialRef}
                </span>
              </div>

              {expanded && (
                <div style={{ marginTop: 20 }} onClick={(e) => e.stopPropagation()}>
                  <TraceChain steps={bc.traceChain} title="溯源到具体材料" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default BoundaryCases;
