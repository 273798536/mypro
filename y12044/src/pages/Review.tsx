import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertCircle, TrendingUp, TrendingDown, Droplets, Snowflake, Leaf, Zap } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { RoundData, AnomalyEvent } from '../types/game';
import { anomalyTypeLabels, anomalyExplanations, nodeTypeLabels } from '../data/initialState';
import BaseMap from '../components/game/BaseMap';

const Review: React.FC = () => {
  const navigate = useNavigate();
  const { roundHistory, anomalies } = useGameStore();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);

  const selectedRoundData = selectedRound !== null 
    ? roundHistory.find(r => r.roundNumber === selectedRound) 
    : null;

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'pipe_disconnect': return '🔌';
      case 'recycle_overload': return '⚡';
      case 'greenhouse_drought': return '💧';
      default: return '⚠️';
    }
  };

  const getAnomalyColor = (severity: string) => {
    return severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  };

  return (
    <div className="min-h-screen bg-space-900">
      <header className="bg-space-800/80 backdrop-blur-sm border-b border-tech-400/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="font-orbitron text-xl font-bold text-tech-400">
              历史复盘
            </h1>
            <p className="text-xs text-gray-400">回顾每回合的操作、状态和异常</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {roundHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Clock size={48} className="mb-4 opacity-50" />
            <p className="text-lg">暂无历史记录</p>
            <p className="text-sm">完成至少一回合游戏后可查看复盘</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-2 bg-tech-500 text-white rounded-lg hover:bg-tech-400 transition-colors"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3">
              <div className="bg-space-800 rounded-xl p-4 glow-border sticky top-20">
                <h3 className="font-orbitron text-lg font-bold text-tech-400 mb-4 flex items-center gap-2">
                  <Clock size={18} />
                  回合时间轴
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
                  {roundHistory.map((round) => (
                    <button
                      key={round.roundNumber}
                      onClick={() => {
                        setSelectedRound(round.roundNumber);
                        setSelectedAnomaly(null);
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedRound === round.roundNumber
                          ? 'bg-tech-500/20 border border-tech-500/50'
                          : 'bg-space-700 hover:bg-space-600 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">回合 {round.roundNumber}</span>
                        <span className={`text-sm font-bold ${round.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {round.score >= 0 ? '+' : ''}{round.score}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {round.anomalies.length > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle size={12} />
                            {round.anomalies.length}
                          </span>
                        )}
                        {round.conflicts.length > 0 && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Zap size={12} />
                            {round.conflicts.length}
                          </span>
                        )}
                        <span>{round.actions.length} 操作</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-6 space-y-4">
              {selectedRoundData ? (
                <>
                  <div className="bg-space-800 rounded-xl p-4 glow-border">
                    <h3 className="font-orbitron text-lg font-bold text-tech-400 mb-4">
                      回合 {selectedRoundData.roundNumber} - 管网状态
                    </h3>
                    <div style={{ height: '350px' }}>
                      <BaseMap
                        reviewNodes={selectedRoundData.networkState.nodes}
                        reviewPipes={selectedRoundData.networkState.pipes}
                      />
                    </div>
                  </div>

                  <div className="bg-space-800 rounded-xl p-4 glow-border">
                    <h3 className="font-orbitron text-lg font-bold text-tech-400 mb-4">
                      资源状态
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 bg-space-700 rounded-lg text-center">
                        <Droplets className="mx-auto text-blue-400 mb-2" size={24} />
                        <div className="font-bold text-lg">{selectedRoundData.resources.water}</div>
                        <div className="text-xs text-gray-400">储水量 (L)</div>
                      </div>
                      <div className="p-3 bg-space-700 rounded-lg text-center">
                        <Snowflake className="mx-auto text-cyan-400 mb-2" size={24} />
                        <div className="font-bold text-lg">{selectedRoundData.resources.ice}</div>
                        <div className="text-xs text-gray-400">冰储量 (kg)</div>
                      </div>
                      <div className="p-3 bg-space-700 rounded-lg text-center">
                        <Leaf className="mx-auto text-green-400 mb-2" size={24} />
                        <div className="font-bold text-lg">{selectedRoundData.resources.greenhouseHumidity}%</div>
                        <div className="text-xs text-gray-400">温室湿度</div>
                      </div>
                      <div className="p-3 bg-space-700 rounded-lg text-center">
                        {selectedRoundData.score >= 0 ? (
                          <TrendingUp className="mx-auto text-green-400 mb-2" size={24} />
                        ) : (
                          <TrendingDown className="mx-auto text-red-400 mb-2" size={24} />
                        )}
                        <div className={`font-bold text-lg ${selectedRoundData.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedRoundData.score >= 0 ? '+' : ''}{selectedRoundData.score}
                        </div>
                        <div className="text-xs text-gray-400">回合得分</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-space-800 rounded-xl p-4 glow-border">
                    <h3 className="font-orbitron text-lg font-bold text-tech-400 mb-4">
                      操作记录
                    </h3>
                    {selectedRoundData.actions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedRoundData.actions.map((action, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-space-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {action.operator === 'ice_team' ? '❄️' : '♻️'}
                              </span>
                              <div>
                                <div className="font-medium">{action.action}</div>
                                <div className="text-xs text-gray-400">
                                  {action.operator === 'ice_team' ? '冰矿队' : '回收队'}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-green-400">
                              {action.effect.health && `+${action.effect.health} HP`}
                              {action.effect.capacity && `+${action.effect.capacity} 容量`}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">本回合无操作记录</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-space-800 rounded-xl p-8 glow-border text-center text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>选择左侧时间轴中的回合查看详情</p>
                </div>
              )}
            </div>

            <div className="col-span-3">
              <div className="bg-space-800 rounded-xl p-4 glow-border sticky top-20">
                <h3 className="font-orbitron text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertCircle size={18} />
                  异常事件追溯
                </h3>
                {anomalies.length > 0 ? (
                  <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
                    {anomalies.map((anomaly, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAnomaly(anomaly);
                          setSelectedRound(anomaly.round);
                        }}
                        className={`w-full p-3 rounded-lg text-left border transition-all ${
                          selectedAnomaly?.id === anomaly.id
                            ? getAnomalyColor(anomaly.severity) + ' ring-2 ring-current'
                            : 'bg-space-700 border-transparent hover:bg-space-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getAnomalyIcon(anomaly.type)}</span>
                          <span className={`font-medium text-sm ${
                            anomaly.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {anomalyTypeLabels[anomaly.type]}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-1">
                          回合 {anomaly.round}
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2">{anomaly.message}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 text-sm">暂无异常记录</p>
                )}

                {selectedAnomaly && (
                  <div className="mt-4 p-4 bg-space-700 rounded-lg border border-tech-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{getAnomalyIcon(selectedAnomaly.type)}</span>
                      <div>
                        <div className={`font-bold ${
                          selectedAnomaly.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {anomalyTypeLabels[selectedAnomaly.type]}
                        </div>
                        <div className="text-xs text-gray-400">
                          {selectedAnomaly.severity === 'critical' ? '严重异常' : '警告'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">发生回合：</span>
                        <span className="text-white">第 {selectedAnomaly.round} 回合</span>
                      </div>
                      <div>
                        <span className="text-gray-400">具体问题：</span>
                        <p className="text-white mt-1">{anomalyExplanations[selectedAnomaly.type]?.simple}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">可能原因：</span>
                        <p className="text-white mt-1">{anomalyExplanations[selectedAnomaly.type]?.cause}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">改进建议：</span>
                        <p className="text-green-400 mt-1">{anomalyExplanations[selectedAnomaly.type]?.fix}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Review;
