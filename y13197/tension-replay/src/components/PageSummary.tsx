import React from 'react';
import { AnalysisResult, ProcessingStatus } from '../types';

interface PageSummaryProps {
  result: AnalysisResult;
}

export const PageSummary: React.FC<PageSummaryProps> = ({ result }) => {
  const { stats, jumpPoints, abnormalRecords, materialGroups, pulleyGroups } = result;

  const getOverallStatus = () => {
    if (stats.extremeCount > 0) return { level: 'danger', text: '存在极端值，需重点关注' };
    if (stats.noiseCount > stats.totalCount * 0.1) return { level: 'warning', text: '噪声占比较高，建议检查传感器' };
    if (stats.jumpCount > 0) return { level: 'warning', text: '检测到跳变点，需排查原因' };
    if (stats.normalCount === stats.totalCount) return { level: 'success', text: '全部数据正常' };
    return { level: 'info', text: '数据基本正常，少量异常需关注' };
  };

  const overall = getOverallStatus();

  return (
    <div className="page-summary">
      <div className={`summary-header summary-${overall.level}`}>
        <div className="summary-title">
          <span className="summary-icon">
            {overall.level === 'success' ? '✓' : overall.level === 'danger' ? '!' : '⚠'}
          </span>
          <h2>回放结果摘要</h2>
        </div>
        <div className="summary-status">{overall.text}</div>
      </div>

      <div className="summary-content">
        <div className="summary-section">
          <h4>数据概览</h4>
          <p>
            本次回放共 <strong>{stats.totalCount}</strong> 条记录，
            其中正常 <strong>{stats.normalCount}</strong> 条，
            异常 <strong>{abnormalRecords.length}</strong> 条，
            跳变点 <strong>{stats.jumpCount}</strong> 个。
          </p>
          <p>
            张力范围：<strong>{stats.minTension.toFixed(2)}</strong> ~ <strong>{stats.maxTension.toFixed(2)}</strong> kN，
            平均值 <strong>{stats.avgTension}</strong> kN，
            标准差 <strong>{stats.tensionStdDev}</strong>。
          </p>
        </div>

        <div className="summary-section">
          <h4>材料分布</h4>
          <ul className="material-list">
            {materialGroups.map(m => (
              <li key={m.materialId}>
                <span className="material-name">{m.materialName}</span>
                <span className="material-id">({m.materialId})</span>
                <span className="material-count">{m.count} 条</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="summary-section">
          <h4>异常说明</h4>
          {abnormalRecords.length === 0 ? (
            <p className="text-success">无异常记录</p>
          ) : (
            <ul className="abnormal-list">
              <li>
                <span className={`status-tag status-${ProcessingStatus.NOISE}`}>疑似噪声</span>
                <span>{stats.noiseCount} 条 - 偏离均值 3σ 以上，可能为传感器瞬时干扰</span>
              </li>
              <li>
                <span className={`status-tag status-${ProcessingStatus.EXTREME}`}>极端值</span>
                <span>{stats.extremeCount} 条 - 偏离均值 5σ 以上，需重点排查</span>
              </li>
              <li>
                <span className={`status-tag status-${ProcessingStatus.SUSPICIOUS}`}>待确认</span>
                <span>{stats.suspiciousCount} 条 - 超出正常范围，需人工确认</span>
              </li>
              {stats.manualOverrideCount > 0 && (
                <li>
                  <span className={`status-tag status-${ProcessingStatus.MANUAL_OVERRIDE}`}>人工修改</span>
                  <span>{stats.manualOverrideCount} 条 - 已人工调整状态</span>
                </li>
              )}
            </ul>
          )}
        </div>

        {jumpPoints.length > 0 && (
          <div className="summary-section">
            <h4>跳变提示</h4>
            <p className="text-warning">
              检测到 <strong>{jumpPoints.length}</strong> 处跳变。
              请查看跳变分析面板，确认是阈值波动、单位不一致还是材料名称不一致导致。
            </p>
          </div>
        )}

        <div className="summary-section troubleshooting">
          <h4>⚠ 坏材料排查指引</h4>
          <ol>
            <li>先看<strong>页面摘要</strong>，确认异常数量和整体状态</li>
            <li>到<strong>跳变分析</strong>面板，查看跳变原因分布</li>
            <li>在<strong>明细数据</strong>中筛选"极端值"和"待确认"状态</li>
            <li>点击记录的"详情"查看原始数据和处理状态来源</li>
            <li>如发现是单位或材料名不一致，在<strong>筛选条件</strong>中按材料/滑轮组分组排查</li>
            <li>人工修改后，修改历史会自动保留在下方面板，下一班同事可查看</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
