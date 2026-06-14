import React from 'react';
import { TensionRecord, JumpCause } from '../types';

interface JumpAnalysisPanelProps {
  jumpPoints: TensionRecord[];
}

const CAUSE_LABELS: Record<JumpCause, string> = {
  [JumpCause.THRESHOLD]: '阈值波动',
  [JumpCause.UNIT_MISMATCH]: '单位不一致',
  [JumpCause.MATERIAL_NAME_MISMATCH]: '材料名称不一致',
  [JumpCause.UNKNOWN]: '未知原因',
};

const CAUSE_COLORS: Record<JumpCause, string> = {
  [JumpCause.THRESHOLD]: '#1890ff',
  [JumpCause.UNIT_MISMATCH]: '#fa8c16',
  [JumpCause.MATERIAL_NAME_MISMATCH]: '#eb2f96',
  [JumpCause.UNKNOWN]: '#bfbfbf',
};

export const JumpAnalysisPanel: React.FC<JumpAnalysisPanelProps> = ({ jumpPoints }) => {
  const causeCounts = jumpPoints.reduce((acc, p) => {
    const cause = p.jumpCause || JumpCause.UNKNOWN;
    acc[cause] = (acc[cause] || 0) + 1;
    return acc;
  }, {} as Record<JumpCause, number>);

  return (
    <div className="jump-analysis">
      <h3>跳变分析</h3>
      
      {jumpPoints.length === 0 ? (
        <div className="empty-state">未检测到跳变点</div>
      ) : (
        <>
          <div className="jump-cause-summary">
            <h4>跳变原因分布</h4>
            <div className="cause-list">
              {Object.entries(CAUSE_LABELS).map(([key, label]) => (
                <div key={key} className="cause-item">
                  <span 
                    className="cause-dot" 
                    style={{ backgroundColor: CAUSE_COLORS[key as JumpCause] }}
                  />
                  <span className="cause-label">{label}</span>
                  <span className="cause-count">{causeCounts[key as JumpCause] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="jump-details">
            <h4>跳变点明细</h4>
            <div className="jump-list">
              {jumpPoints.map((point, index) => (
                <div key={point.id} className="jump-item">
                  <div className="jump-header">
                    <span className="jump-index">#{index + 1}</span>
                    <span className="jump-time">
                      {new Date(point.timestamp).toLocaleString()}
                    </span>
                    <span 
                      className="jump-cause-badge"
                      style={{ 
                        backgroundColor: CAUSE_COLORS[point.jumpCause || JumpCause.UNKNOWN] + '20',
                        color: CAUSE_COLORS[point.jumpCause || JumpCause.UNKNOWN],
                      }}
                    >
                      {CAUSE_LABELS[point.jumpCause || JumpCause.UNKNOWN]}
                    </span>
                  </div>
                  <div className="jump-body">
                    <p><strong>材料：</strong>{point.materialName} ({point.materialId})</p>
                    <p><strong>滑轮组：</strong>{point.pulleyGroupId}</p>
                    <p><strong>张力：</strong>{point.tension.toFixed(2)} {point.tensionUnit}</p>
                    <p><strong>详情：</strong>{point.jumpDetail}</p>
                  </div>
                  <div className="jump-troubleshooting">
                    <strong>排查建议：</strong>
                    {point.jumpCause === JumpCause.UNIT_MISMATCH && (
                      <span>检查传感器日志单位配置，确认是否存在单位换算错误</span>
                    )}
                    {point.jumpCause === JumpCause.MATERIAL_NAME_MISMATCH && (
                      <span>检查材料编号是否存在重名或编号不一致，确认是否为同一材料</span>
                    )}
                    {point.jumpCause === JumpCause.THRESHOLD && (
                      <span>检查该时间段内设备运行状态，确认是否为材料内部缺陷或传感器瞬时波动</span>
                    )}
                    {point.jumpCause === JumpCause.UNKNOWN && (
                      <span>建议人工复核该数据点，结合上下文进行综合判断</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
