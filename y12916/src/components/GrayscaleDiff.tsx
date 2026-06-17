import React from 'react';
import { grayscaleComparison, modelVersions, trainingSamples } from '../mockData';
import { LabelJudgment } from '../types';

const labelText: Record<LabelJudgment, string> = {
  positive: '正样本',
  negative: '负样本',
  neutral: '中性',
  uncertain: '不确定',
};

const GrayscaleDiff: React.FC = () => {
  const baseV = modelVersions.find((v) => v.id === grayscaleComparison.baseVersionId)!;
  const targetV = modelVersions.find((v) => v.id === grayscaleComparison.targetVersionId)!;

  const diff = grayscaleComparison.overallDiff;

  const renderDiff = (val: number) => {
    const pct = (val * 100).toFixed(1);
    const cls = val > 0 ? 'diff-added' : val < 0 ? 'diff-removed' : '';
    const arrow = val > 0 ? '+' : '';
    return <span className={cls}>{arrow}{pct}%</span>;
  };

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon" />
          灰度对比 · {baseV.versionName} → {targetV.versionName}
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(62,207,142,0.15)' }} />
            提升
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(255,92,122,0.15)' }} />
            下降
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(245,196,81,0.15)' }} />
            判断翻转
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="diff-section" style={{ padding: 20 }}>
          <div className="diff-panel">
            <div className="diff-panel-header">
              <div className="diff-panel-title">
                <span className="badge badge-success">
                  <span className="badge-dot" />
                  基准版本 {baseV.versionName}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{baseV.createdAt}</span>
            </div>
            <div className="diff-panel-body">
              <div className="diff-row">
                <div className="diff-row-label">Accuracy</div>
                <div className="diff-row-value">{(baseV.overallAccuracy * 100).toFixed(1)}%</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">Precision</div>
                <div className="diff-row-value">{(baseV.overallPrecision * 100).toFixed(1)}%</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">Recall</div>
                <div className="diff-row-value">{(baseV.overallRecall * 100).toFixed(1)}%</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">F1</div>
                <div className="diff-row-value">{(baseV.overallF1 * 100).toFixed(1)}%</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">训练样本</div>
                <div className="diff-row-value">{baseV.trainSampleCount}</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">验证样本</div>
                <div className="diff-row-value">{baseV.valSampleCount}</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">风险样本</div>
                <div className="diff-row-value">
                  {baseV.flaggedSamples.length > 0 ? (
                    <span className="cell-highlight">{baseV.flaggedSamples.length} 条</span>
                  ) : (
                    '0'
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="diff-panel">
            <div className="diff-panel-header">
              <div className="diff-panel-title">
                <span className="badge badge-danger">
                  <span className="badge-dot" />
                  对比版本 {targetV.versionName}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{targetV.createdAt}</span>
            </div>
            <div className="diff-panel-body">
              <div className="diff-row">
                <div className="diff-row-label">Accuracy</div>
                <div className="diff-row-value">
                  {(targetV.overallAccuracy * 100).toFixed(1)}% {renderDiff(diff.accuracyDiff)}
                </div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">Precision</div>
                <div className="diff-row-value">
                  {(targetV.overallPrecision * 100).toFixed(1)}% {renderDiff(diff.precisionDiff)}
                </div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">Recall</div>
                <div className="diff-row-value">
                  {(targetV.overallRecall * 100).toFixed(1)}% {renderDiff(diff.recallDiff)}
                </div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">F1</div>
                <div className="diff-row-value">
                  {(targetV.overallF1 * 100).toFixed(1)}% {renderDiff(diff.f1Diff)}
                </div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">训练样本</div>
                <div className="diff-row-value">{targetV.trainSampleCount}</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">验证样本</div>
                <div className="diff-row-value">{targetV.valSampleCount}</div>
              </div>
              <div className="diff-row">
                <div className="diff-row-label">风险样本</div>
                <div className="diff-row-value">
                  {targetV.flaggedSamples.length > 0 ? (
                    <span className="cell-danger">{targetV.flaggedSamples.length} 条</span>
                  ) : (
                    '0'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#f5c451' }}>⚡</span>
            判断发生翻转的样本
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
              共 {grayscaleComparison.judgmentChangedSamples.length} 条
            </span>
          </div>
          <div className="table-container" style={{ borderRadius: 'var(--radius-md)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>样本编号</th>
                  <th>基准标签</th>
                  <th>新标签</th>
                  <th>变化</th>
                  <th>触发字段</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {grayscaleComparison.judgmentChangedSamples.map((jc) => {
                  const sample = trainingSamples.find((s) => s.id === jc.sampleId);
                  return (
                    <tr key={jc.sampleId}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sample?.sampleNo}
                      </td>
                      <td>
                        <span className="cell-danger">{labelText[jc.baseLabel]}</span>
                      </td>
                      <td>
                        <span className="cell-success">{labelText[jc.targetLabel]}</span>
                      </td>
                      <td>
                        <span className="diff-changed">
                          {labelText[jc.baseLabel]} → {labelText[jc.targetLabel]}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{jc.rootChangeField}</code>
                      </td>
                      <td style={{ fontSize: 12 }}>{jc.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>分组指标变化</div>
          <div className="grid-3">
            {grayscaleComparison.groupDiffs.map((gd) => {
              const group = baseV.groupMetrics.find((g) => g.groupKey === gd.groupKey);
              return (
                <div className="metric-card" key={gd.groupKey}>
                  <div className="metric-label">{group?.groupName || gd.groupKey}</div>
                  <div className="metric-value" style={{ fontSize: 22 }}>
                    {gd.targetAccuracy !== undefined ? (gd.targetAccuracy * 100).toFixed(1) : '-'}%
                  </div>
                  <div className="metric-trend">
                    <span className={gd.accuracyDiff > 0 ? 'trend-up' : 'trend-down'}>
                      {gd.accuracyDiff > 0 ? '↑' : '↓'}
                    </span>
                    <span className={gd.accuracyDiff > 0 ? 'diff-added' : gd.accuracyDiff < 0 ? 'diff-removed' : ''}>
                      {gd.accuracyDiff > 0 ? '+' : ''}
                      {(gd.accuracyDiff * 100).toFixed(1)}%
                    </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      vs 基准 {(gd.baseAccuracy !== undefined ? gd.baseAccuracy * 100 : 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GrayscaleDiff;
