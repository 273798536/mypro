import React from 'react';
import { StatsSummary, ProcessingStatus } from '../types';

interface StatsPanelProps {
  stats: StatsSummary;
}

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NORMAL]: '#52c41a',
  [ProcessingStatus.NOISE]: '#faad14',
  [ProcessingStatus.EXTREME]: '#ff4d4f',
  [ProcessingStatus.SUSPICIOUS]: '#fa8c16',
  [ProcessingStatus.MANUAL_OVERRIDE]: '#722ed1',
  [ProcessingStatus.PENDING]: '#bfbfbf',
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  return (
    <div className="stats-panel">
      <h3>统计摘要</h3>
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-value">{stats.totalCount}</div>
          <div className="stat-label">总记录数</div>
        </div>
        <div className="stat-card normal">
          <div className="stat-value">{stats.normalCount}</div>
          <div className="stat-label">正常</div>
          <div className="stat-bar">
            <div 
              className="stat-bar-fill" 
              style={{ 
                width: stats.totalCount ? `${(stats.normalCount / stats.totalCount) * 100}%` : '0%',
                backgroundColor: STATUS_COLORS[ProcessingStatus.NORMAL],
              }} 
            />
          </div>
        </div>
        <div className="stat-card noise">
          <div className="stat-value">{stats.noiseCount}</div>
          <div className="stat-label">疑似噪声</div>
          <div className="stat-bar">
            <div 
              className="stat-bar-fill" 
              style={{ 
                width: stats.totalCount ? `${(stats.noiseCount / stats.totalCount) * 100}%` : '0%',
                backgroundColor: STATUS_COLORS[ProcessingStatus.NOISE],
              }} 
            />
          </div>
        </div>
        <div className="stat-card extreme">
          <div className="stat-value">{stats.extremeCount}</div>
          <div className="stat-label">极端值</div>
          <div className="stat-bar">
            <div 
              className="stat-bar-fill" 
              style={{ 
                width: stats.totalCount ? `${(stats.extremeCount / stats.totalCount) * 100}%` : '0%',
                backgroundColor: STATUS_COLORS[ProcessingStatus.EXTREME],
              }} 
            />
          </div>
        </div>
        <div className="stat-card suspicious">
          <div className="stat-value">{stats.suspiciousCount}</div>
          <div className="stat-label">待确认</div>
          <div className="stat-bar">
            <div 
              className="stat-bar-fill" 
              style={{ 
                width: stats.totalCount ? `${(stats.suspiciousCount / stats.totalCount) * 100}%` : '0%',
                backgroundColor: STATUS_COLORS[ProcessingStatus.SUSPICIOUS],
              }} 
            />
          </div>
        </div>
        <div className="stat-card jump">
          <div className="stat-value">{stats.jumpCount}</div>
          <div className="stat-label">跳变点</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgTension}</div>
          <div className="stat-label">平均张力 (kN)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.maxTension.toFixed(2)}</div>
          <div className="stat-label">最大张力</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.minTension.toFixed(2)}</div>
          <div className="stat-label">最小张力</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.tensionStdDev}</div>
          <div className="stat-label">标准差</div>
        </div>
        <div className="stat-card manual">
          <div className="stat-value">{stats.manualOverrideCount}</div>
          <div className="stat-label">人工修改</div>
        </div>
      </div>
    </div>
  );
};
