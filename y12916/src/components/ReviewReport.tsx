import React from 'react';
import { reviewReport } from '../mockData';

const ReviewReportComp: React.FC = () => {
  const r = reviewReport;

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          模型评审会报告 · {r.reportId}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-info">
            <span className="badge-dot" />
            生成：{r.generatedAt}
          </span>
          <span className="badge">
            <span className="badge-dot" />
            {r.generatedBy}
          </span>
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              核心数据
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="metric-card" style={{ margin: 0 }}>
                <div className="metric-label">脏样本数</div>
                <div className="metric-value" style={{ fontSize: 24, color: '#ff8fa3' }}>
                  {r.totalDirtySamples}
                </div>
              </div>
              <div className="metric-card" style={{ margin: 0 }}>
                <div className="metric-label">泄漏样本</div>
                <div className="metric-value" style={{ fontSize: 24, color: '#f5c451' }}>
                  {r.totalLeakSamples}
                </div>
              </div>
              <div className="metric-card" style={{ margin: 0 }}>
                <div className="metric-label">重复样本组</div>
                <div className="metric-value" style={{ fontSize: 24, color: 'var(--accent-yellow)' }}>
                  {r.totalDuplicateGroups}
                </div>
              </div>
              <div className="metric-card" style={{ margin: 0 }}>
                <div className="metric-label">判断翻转</div>
                <div className="metric-value" style={{ fontSize: 24, color: 'var(--accent-orange)' }}>
                  {r.judgmentFlipCount}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              报告摘要
            </div>
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                fontSize: 13,
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
                marginBottom: 20,
              }}
            >
              {r.summary}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              涉及版本
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {r.versionsCompared.map((v) => (
                <span
                  key={v}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {v}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              评审建议
            </div>
            <div
              style={{
                background: 'rgba(62,207,142,0.04)',
                border: '1px solid rgba(62,207,142,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}
            >
              {r.recommendations.map((rec, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < r.recommendations.length - 1 ? 10 : 0 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(62,207,142,0.15)',
                      color: 'var(--accent-green-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingTop: 2 }}>
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewReportComp;
