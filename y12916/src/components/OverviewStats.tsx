import React from 'react';
import { reviewReport, modelVersions } from '../mockData';

const OverviewStats: React.FC = () => {
  const latestVersion = modelVersions[modelVersions.length - 1];
  const rollbackVersion = modelVersions.find((v) => v.status === 'rollback');

  const stats = [
    {
      label: '总样本数',
      value: latestVersion.trainSampleCount + latestVersion.valSampleCount + latestVersion.testSampleCount,
      sub: `训练 ${latestVersion.trainSampleCount} / 验证 ${latestVersion.valSampleCount} / 测试 ${latestVersion.testSampleCount}`,
      trend: 'flat',
      trendText: '当前版本',
    },
    {
      label: '脏样本数',
      value: reviewReport.totalDirtySamples,
      sub: '含重复、漏填、误标注',
      trend: 'down',
      trendText: `v1.3 已剔除 ${reviewReport.totalLeakSamples} 条泄漏`,
    },
    {
      label: '判断翻转',
      value: reviewReport.judgmentFlipCount,
      sub: '版本变更导致标签变化',
      trend: 'up',
      trendText: '均已修正',
    },
    {
      label: '当前 Accuracy',
      value: `${(latestVersion.overallAccuracy * 100).toFixed(1)}%`,
      sub: `v${latestVersion.versionName.split('.')[0]}.${latestVersion.versionName.split('.')[1]}`,
      trend: rollbackVersion ? 'up' : 'flat',
      trendText: rollbackVersion
        ? `比回滚版 +${((latestVersion.overallAccuracy - rollbackVersion.overallAccuracy) * 100).toFixed(1)}%`
        : '持平',
    },
  ];

  const trendIcon = (t: string) => {
    if (t === 'up') return '↑';
    if (t === 'down') return '↓';
    return '→';
  };

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          评审概览
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: '#3ecf8e' }} />
            正常
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: '#f5c451' }} />
            警告
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: '#ff5c7a' }} />
            需关注
          </div>
        </div>
      </div>
      <div className="grid-4">
        {stats.map((s, i) => (
          <div className="metric-card" key={i}>
            <div className="metric-label">{s.label}</div>
            <div className="metric-value">{s.value}</div>
            <div className="metric-label" style={{ marginTop: 4, fontWeight: 400 }}>
              {s.sub}
            </div>
            <div className="metric-trend">
              <span className={`trend-${s.trend}`}>{trendIcon(s.trend)}</span>
              {s.trendText}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width:
                    typeof s.value === 'number'
                      ? `${Math.min(100, (s.value / 100) * 100)}%`
                      : s.value.includes('%')
                      ? s.value
                      : '60%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OverviewStats;
