import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, MapPin, Clock, AlertTriangle, Lightbulb, TrendingUp, Users, Award, RefreshCw, GitCompare } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getPenaltyBreakdown } from '../engine/ScoreCalculator';
import { getPenaltyCategoryLabel, getPenaltyCategoryColor } from '../utils/penaltyUtils';
import { getLocationName } from '../utils/locationUtils';
import { Penalty, Gate, Exit } from '../types';

const gradeConfig = {
  S: { color: 'text-metro-yellow', bg: 'bg-metro-yellow/20', label: '卓越' },
  A: { color: 'text-metro-green', bg: 'bg-metro-green/20', label: '优秀' },
  B: { color: 'text-metro-blue', bg: 'bg-metro-blue/20', label: '良好' },
  C: { color: 'text-metro-orange', bg: 'bg-metro-orange/20', label: '合格' },
  D: { color: 'text-metro-red', bg: 'bg-metro-red/20', label: '待改进' },
  F: { color: 'text-metro-red', bg: 'bg-metro-red/20', label: '不合格' },
};

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const results = useGameStore((state) => state.results);
  const [selectedTab, setSelectedTab] = useState<'timeline' | 'breakdown' | 'summary'>('timeline');

  const result = useMemo(() => results.find((r) => r.id === id), [results, id]);

  if (!result) {
    return (
      <div className="min-h-screen bg-metro-bg flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-metro-yellow mb-4" size={48} />
          <p className="text-metro-text mb-4">未找到对应的训练报告</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-metro-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const grade = gradeConfig[result.grade];
  const penaltyBreakdown = getPenaltyBreakdown(result.penalties);
  const sortedPenalties = [...result.penalties].sort((a, b) => a.timestamp - b.timestamp);
  const totalPenaltyPoints = result.penalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLocationClick = (locationRef: string) => {
    navigate('/game');
    setTimeout(() => {
      const store = useGameStore.getState();
      store.setSelectedLocation(locationRef);
    }, 100);
  };

  const handleRetry = () => {
    const levelId = result.gameId.split('-').slice(0, 2).join('-');
    navigate('/');
  };

  const handleCompare = () => {
    navigate(`/compare?resultId=${result.id}`);
  };

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">训练结算报告</h1>
                <p className="text-xs text-metro-textMuted">
                  完成时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCompare}
                className="flex items-center gap-2 px-4 py-2 bg-metro-green hover:bg-green-600 text-white rounded-lg transition-all"
              >
                <GitCompare size={18} />
                对比结果
              </button>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded-lg transition-all"
              >
                <RefreshCw size={18} />
                重新训练
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1 metro-panel text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${grade.bg} mb-4`}>
              <span className={`text-5xl font-bold ${grade.color}`}>{result.grade}</span>
            </div>
            <div className={`text-lg font-bold ${grade.color} mb-1`}>{grade.label}</div>
            <div className="text-xs text-metro-textMuted">综合评级</div>
          </div>

          <div className="lg:col-span-3 metro-panel">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="text-metro-yellow" size={20} />
                  <span className="text-sm text-metro-textMuted">总得分</span>
                </div>
                <div className="text-3xl font-bold text-metro-yellow font-mono">{result.totalScore}</div>
                <div className="text-xs text-metro-textMuted">/ {result.maxPossibleScore}</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="text-metro-green" size={20} />
                  <span className="text-sm text-metro-textMuted">疏散效率</span>
                </div>
                <div className="text-3xl font-bold text-metro-green font-mono">
                  {result.simulationSummary.totalPassengers > 0
                    ? Math.round((result.simulationSummary.evacuatedPassengers / result.simulationSummary.totalPassengers) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-metro-textMuted">
                  {result.simulationSummary.evacuatedPassengers} / {result.simulationSummary.totalPassengers} 人
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="text-metro-orange" size={20} />
                  <span className="text-sm text-metro-textMuted">最大拥堵</span>
                </div>
                <div className="text-3xl font-bold text-metro-orange font-mono">
                  {Math.round(result.simulationSummary.maxCongestionLevel * 100)}%
                </div>
                <div className="text-xs text-metro-textMuted">
                  平均疏散 {result.simulationSummary.avgEvacuationTime.toFixed(0)}s
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="text-metro-red" size={20} />
                  <span className="text-sm text-metro-textMuted">累计扣分</span>
                </div>
                <div className="text-3xl font-bold text-metro-red font-mono">-{totalPenaltyPoints}</div>
                <div className="text-xs text-metro-textMuted">{result.penalties.length} 次违规</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4">
              {[
                { key: 'timeline', label: '扣分时间线', icon: Clock },
                { key: 'breakdown', label: '分类统计', icon: TrendingUp },
                { key: 'summary', label: '模拟摘要', icon: Award },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as typeof selectedTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    selectedTab === tab.key
                      ? 'bg-metro-blue text-white'
                      : 'bg-metro-bg text-metro-textMuted hover:bg-metro-bgLight'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {selectedTab === 'timeline' && (
              <div className="metro-panel max-h-[600px] overflow-y-auto">
                {sortedPenalties.length === 0 ? (
                  <div className="text-center py-12 text-metro-textMuted">
                    <Award className="mx-auto mb-3 text-metro-green" size={48} />
                    <p>太棒了！本次训练没有任何违规操作</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedPenalties.map((penalty, index) => (
                      <PenaltyTimelineItem
                        key={penalty.id}
                        penalty={penalty}
                        index={index}
                        formatTime={formatTime}
                        onLocationClick={handleLocationClick}
                        gates={result.gateConfigSnapshot}
                        exits={result.exitConfigSnapshot}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'breakdown' && (
              <div className="metro-panel">
                <div className="space-y-6">
                  {penaltyBreakdown.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getPenaltyCategoryColor(item.category) }}
                          />
                          <span className="font-bold">{getPenaltyCategoryLabel(item.category)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-metro-textMuted text-sm">{item.count} 次</span>
                          <span className="text-metro-red font-bold font-mono">-{item.totalPoints} 分</span>
                        </div>
                      </div>
                      <div className="h-2 bg-metro-bg rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${totalPenaltyPoints > 0 ? (item.totalPoints / totalPenaltyPoints) * 100 : 0}%`,
                            backgroundColor: getPenaltyCategoryColor(item.category),
                          }}
                        />
                      </div>
                      {item.penalties.length > 0 && (
                        <div className="space-y-2 pl-5">
                          {item.penalties.slice(0, 3).map((p) => (
                            <div key={p.id} className="text-sm text-metro-textMuted flex items-start gap-2">
                              <Clock size={12} className="mt-0.5 flex-shrink-0" />
                              <span>
                                [{formatTime(p.timestamp)}] {p.humanReadableReason}
                              </span>
                            </div>
                          ))}
                          {item.penalties.length > 3 && (
                            <div className="text-xs text-metro-textMuted pl-4">
                              ... 还有 {item.penalties.length - 3} 条记录
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'summary' && (
              <div className="metro-panel">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <TrendingUp className="text-metro-blue" size={18} />
                      客流模拟数据
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-metro-bg rounded">
                        <div className="text-xs text-metro-textMuted mb-1">总客流量</div>
                        <div className="text-xl font-bold font-mono">{result.simulationSummary.totalPassengers} 人</div>
                      </div>
                      <div className="p-3 bg-metro-bg rounded">
                        <div className="text-xs text-metro-textMuted mb-1">已疏散</div>
                        <div className="text-xl font-bold font-mono text-metro-green">{result.simulationSummary.evacuatedPassengers} 人</div>
                      </div>
                      <div className="p-3 bg-metro-bg rounded">
                        <div className="text-xs text-metro-textMuted mb-1">平均疏散时间</div>
                        <div className="text-xl font-bold font-mono">{result.simulationSummary.avgEvacuationTime.toFixed(0)} 秒</div>
                      </div>
                      <div className="p-3 bg-metro-bg rounded">
                        <div className="text-xs text-metro-textMuted mb-1">最大拥堵指数</div>
                        <div className="text-xl font-bold font-mono text-metro-orange">{Math.round(result.simulationSummary.maxCongestionLevel * 100)}%</div>
                      </div>
                    </div>
                  </div>

                  {result.simulationSummary.congestionHotspots.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="text-metro-orange" size={18} />
                        拥堵热点区域
                      </h4>
                      <div className="space-y-2">
                        {result.simulationSummary.congestionHotspots.map((hotspot, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-metro-bg rounded">
                            <div className="flex items-center gap-2">
                              <MapPin className="text-metro-orange" size={14} />
                              <span>{getLocationName(hotspot.locationId, result.gateConfigSnapshot, result.exitConfigSnapshot)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm">最高拥堵: <b className="text-metro-orange">{Math.round(hotspot.maxLevel * 100)}%</b></span>
                              <span className="text-sm">持续时间: <b>{hotspot.duration}秒</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <Users className="text-metro-blue" size={18} />
                      闸机利用率
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(result.simulationSummary.gateUtilization).map(([gateId, utilization]) => {
                        const gate = result.gateConfigSnapshot.find((g) => g.id === gateId);
                        const utilPercent = Math.round(utilization * 100);
                        return (
                          <div key={gateId} className="p-2 bg-metro-bg rounded text-center">
                            <div className="text-xs text-metro-textMuted mb-1">{gate?.name || gateId}</div>
                            <div className={`text-lg font-bold font-mono ${
                              utilPercent > 80 ? 'text-metro-red' : utilPercent > 50 ? 'text-metro-yellow' : 'text-metro-green'
                            }`}>
                              {utilPercent}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="metro-panel">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="text-metro-yellow" size={18} />
                改进建议
              </h3>
              <div className="space-y-3">
                {result.penalties.length === 0 ? (
                  <div className="p-3 bg-metro-green/10 border border-metro-green/30 rounded text-metro-green text-sm">
                    本次训练表现优秀，继续保持！
                  </div>
                ) : (
                  [...new Set(result.penalties.map((p) => p.suggestion))].slice(0, 5).map((suggestion, idx) => (
                    <div key={idx} className="p-3 bg-metro-bg rounded border-l-2 border-metro-yellow">
                      <p className="text-sm text-metro-text">{suggestion}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="metro-panel">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Award className="text-metro-blue" size={18} />
                评分标准
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-metro-textMuted">基础分</span>
                  <span className="font-mono">1000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-metro-textMuted">疏散效率 (40%)</span>
                  <span className="font-mono text-metro-green">+400</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-metro-textMuted">拥堵控制 (30%)</span>
                  <span className="font-mono text-metro-green">+300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-metro-textMuted">广播规范 (20%)</span>
                  <span className="font-mono text-metro-green">+200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-metro-textMuted">安全管理 (10%)</span>
                  <span className="font-mono text-metro-green">+100</span>
                </div>
                <div className="border-t border-metro-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-metro-textMuted">实际扣分</span>
                    <span className="font-mono text-metro-red">-{totalPenaltyPoints}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-bold">最终得分</span>
                    <span className="font-mono font-bold text-metro-yellow">{result.totalScore}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="metro-panel">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="text-metro-orange" size={18} />
                位置说明
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-metro-textMuted">
                  点击扣分记录中的 <span className="text-metro-blue">位置链接</span> 可以直接定位到站厅地图中的对应位置，查看具体情况。
                </p>
                <div className="p-2 bg-metro-bg rounded">
                  <div className="text-xs text-metro-textMuted mb-1">图例</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-metro-green" />
                      <span className="text-xs">正常闸机</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-metro-red" />
                      <span className="text-xs">故障闸机</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-metro-yellow" />
                      <span className="text-xs">限流闸机</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-metro-orange" />
                      <span className="text-xs">封控区域</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface PenaltyTimelineItemProps {
  penalty: Penalty;
  index: number;
  formatTime: (seconds: number) => string;
  onLocationClick: (locationRef: string) => void;
  gates: Gate[];
  exits: Exit[];
}

function PenaltyTimelineItem({ penalty, index, formatTime, onLocationClick, gates, exits }: PenaltyTimelineItemProps) {
  const [expanded, setExpanded] = useState(false);
  const categoryColor = getPenaltyCategoryColor(penalty.category);
  const categoryLabel = getPenaltyCategoryLabel(penalty.category);
  const locationName = getLocationName(penalty.locationRef, gates, exits);

  return (
    <div className="relative pl-8">
      {index > 0 && (
        <div className="absolute left-[11px] top-0 w-0.5 h-full bg-metro-border" />
      )}
      <div
        className="absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: categoryColor + '20', border: `2px solid ${categoryColor}` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
      </div>

      <div className="metro-panel cursor-pointer hover:border-metro-blue/50 transition-all" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded text-white font-bold"
                style={{ backgroundColor: categoryColor }}
              >
                {categoryLabel}
              </span>
              <span className="text-xs text-metro-textMuted font-mono">{formatTime(penalty.timestamp)}</span>
              <span className="text-xs text-metro-red font-bold">-{penalty.penaltyPoints}分</span>
            </div>
            <p className="text-sm text-metro-text">{penalty.humanReadableReason}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLocationClick(penalty.locationRef);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-metro-blue hover:bg-metro-blue/10 rounded transition-colors ml-3 flex-shrink-0"
          >
            <MapPin size={12} />
            {locationName}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-metro-border">
            <div className="flex items-start gap-2">
              <Lightbulb className="text-metro-yellow flex-shrink-0 mt-0.5" size={14} />
              <div>
                <div className="text-xs text-metro-yellow font-bold mb-1">改进建议</div>
                <p className="text-sm text-metro-textMuted">{penalty.suggestion}</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-metro-textMuted">
              位置类型: {penalty.locationType === 'gate' ? '闸机' : penalty.locationType === 'exit' ? '出口' : '区域'} | 
              违规原因: {penalty.reason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
