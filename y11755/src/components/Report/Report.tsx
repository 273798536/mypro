import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { getScoreLevelColor, getScoreLevelText } from '../../game/scoring';
import { X, Download, AlertTriangle, CheckCircle, HelpCircle, Clock, User, Droplets } from 'lucide-react';

const Report: React.FC = () => {
  const { showReport, toggleReport, report, scoreBreakdown, currentScene, exportReport } = useGameStore();

  if (!showReport || !report) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl max-h-[90vh] industrial-panel overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-industrial-border">
          <div>
            <h2 className="text-xl font-bold text-industrial-text">抢修报告</h2>
            <p className="text-sm text-industrial-muted">{currentScene.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportReport}
              className="industrial-btn-primary flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              导出JSON
            </button>
            <button
              onClick={toggleReport}
              className="industrial-btn-secondary p-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-industrial-bg/50 rounded-lg p-4 text-center">
              <div className="text-sm text-industrial-muted mb-1">用时</div>
              <div className="data-value text-industrial-text">{formatTime(report.duration)}</div>
            </div>
            <div className="bg-industrial-bg/50 rounded-lg p-4 text-center">
              <div className="text-sm text-industrial-muted mb-1">操作步数</div>
              <div className="data-value text-industrial-text">{report.operationTrail.length}</div>
            </div>
            <div className="bg-industrial-bg/50 rounded-lg p-4 text-center">
              <div className="text-sm text-industrial-muted mb-1">综合得分</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: getScoreLevelColor(report.totalScore.level) }}
              >
                {report.totalScore.total}
              </div>
            </div>
            <div className="bg-industrial-bg/50 rounded-lg p-4 text-center">
              <div className="text-sm text-industrial-muted mb-1">评级</div>
              <div
                className="text-3xl font-bold"
                style={{ color: getScoreLevelColor(report.totalScore.level) }}
              >
                {report.totalScore.level}
                <span className="text-sm block mt-1">
                  {getScoreLevelText(report.totalScore.level)}
                </span>
              </div>
            </div>
          </div>

          {scoreBreakdown && (
            <div className="industrial-panel p-4 mb-6">
              <h3 className="text-sm font-medium text-industrial-text mb-3">得分明细</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-industrial-muted">止漏得分</span>
                    <span className={scoreBreakdown.score.leakControl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {scoreBreakdown.score.leakControl > 0 ? '+' : ''}{scoreBreakdown.score.leakControl}
                    </span>
                  </div>
                  <div className="text-xs text-industrial-muted">
                    受控: {scoreBreakdown.details.leakControl.controlled} | 未控: {scoreBreakdown.details.leakControl.uncontrolled}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-industrial-muted">用户影响</span>
                    <span className={scoreBreakdown.score.userImpact >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {scoreBreakdown.score.userImpact > 0 ? '+' : ''}{scoreBreakdown.score.userImpact}
                    </span>
                  </div>
                  <div className="text-xs text-industrial-muted">
                    影响: {scoreBreakdown.details.userImpact.affectedPopulation}人
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-industrial-muted">操作效率</span>
                    <span className={scoreBreakdown.score.operationEfficiency >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {scoreBreakdown.score.operationEfficiency > 0 ? '+' : ''}{scoreBreakdown.score.operationEfficiency}
                    </span>
                  </div>
                  <div className="text-xs text-industrial-muted">
                    步数: {scoreBreakdown.details.operationEfficiency.steps} | 时间奖励: +{scoreBreakdown.details.operationEfficiency.timeBonus}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-industrial-muted">合规性</span>
                    <span className={scoreBreakdown.score.compliance >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {scoreBreakdown.score.compliance > 0 ? '+' : ''}{scoreBreakdown.score.compliance}
                    </span>
                  </div>
                  <div className="text-xs text-industrial-muted">
                    主阀: {scoreBreakdown.details.compliance.mainValveOperations}次 | 低压: {scoreBreakdown.details.compliance.lowPressureIncidents}次
                  </div>
                </div>
              </div>
            </div>
          )}

          {report.failureAnalysis.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                <AlertTriangle size={18} />
                问题分析与改进建议
              </div>
              <ul className="list-disc list-inside text-sm text-industrial-text space-y-1">
                {report.failureAnalysis.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="industrial-panel p-4">
              <div className="flex items-center gap-2 text-red-400 font-medium mb-3">
                <AlertTriangle size={16} />
                未处理 ({report.unhandled.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.unhandled.length === 0 ? (
                  <p className="text-sm text-industrial-muted text-center py-4">无未处理项</p>
                ) : (
                  report.unhandled.map((item) => (
                    <div key={item.id} className="bg-red-900/20 rounded p-2 text-sm">
                      <div className="text-industrial-text">{item.description}</div>
                      <div className="text-xs text-industrial-muted mt-1">
                        来源: {item.source} | {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="industrial-panel p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-3">
                <CheckCircle size={16} />
                已修正 ({report.corrected.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.corrected.length === 0 ? (
                  <p className="text-sm text-industrial-muted text-center py-4">无已修正项</p>
                ) : (
                  report.corrected.map((item) => (
                    <div key={item.id} className="bg-green-900/20 rounded p-2 text-sm">
                      <div className="text-industrial-text">{item.description}</div>
                      <div className="text-xs text-industrial-muted mt-1">
                        来源: {item.source} | {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="industrial-panel p-4">
              <div className="flex items-center gap-2 text-yellow-400 font-medium mb-3">
                <HelpCircle size={16} />
                待确认 ({report.needConfirmation.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {report.needConfirmation.length === 0 ? (
                  <p className="text-sm text-industrial-muted text-center py-4">无待确认项</p>
                ) : (
                  report.needConfirmation.map((item) => (
                    <div key={item.id} className="bg-yellow-900/20 rounded p-2 text-sm">
                      <div className="text-industrial-text">{item.description}</div>
                      <div className="text-xs text-industrial-muted mt-1">
                        来源: {item.source} | {formatTimestamp(item.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 industrial-panel p-4">
            <h3 className="text-sm font-medium text-industrial-text mb-3">操作痕迹记录</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-industrial-muted border-b border-industrial-border">
                    <th className="text-left py-2 px-3">序号</th>
                    <th className="text-left py-2 px-3">时间</th>
                    <th className="text-left py-2 px-3">操作</th>
                    <th className="text-left py-2 px-3">类型</th>
                    <th className="text-left py-2 px-3">高危</th>
                    <th className="text-left py-2 px-3">已确认</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operationTrail.map((op, index) => {
                    const valve = currentScene.nodes.find((n) => n.id === op.valveId);
                    return (
                      <tr key={op.id} className="border-b border-industrial-border/50">
                        <td className="py-2 px-3 text-industrial-muted">{index + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {formatTimestamp(op.timestamp)}
                        </td>
                        <td className="py-2 px-3">
                          <span className={op.newState ? 'text-green-400' : 'text-red-400'}>
                            {op.newState ? '开启' : '关闭'}
                          </span>
                          <span className="text-industrial-text ml-1">
                            {valve?.name ?? op.valveId}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {op.warningType ? (
                            <span className="text-yellow-400 text-xs">
                              {op.warningType === 'main_valve' ? '主阀' :
                               op.warningType === 'low_pressure' ? '低压' : '重复'}
                            </span>
                          ) : (
                            <span className="text-industrial-muted text-xs">正常</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {op.isHighRisk ? (
                            <span className="text-red-400">是</span>
                          ) : (
                            <span className="text-industrial-muted">否</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {op.confirmed ? (
                            <span className="text-green-400">是</span>
                          ) : (
                            <span className="text-yellow-400">否</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
