import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, AlertTriangle, Download, Home, RotateCcw, FileText, History, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useGameStore } from '../store/gameStore';
import { GameHistory, RiskEvent, OperationLog, RiskType } from '../types';
import { ScoringEngine } from '../engine/ScoringEngine';
import { RiskEngine } from '../engine/RiskEngine';
import { formatTimestamp, formatTime } from '../utils/storage';

export const ResultPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<GameHistory | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'risks' | 'operations'>('summary');

  const getHistoryById = useGameStore(state => state.getHistoryById);
  const getChemicalById = useGameStore(state => state.getChemicalById);

  useEffect(() => {
    if (gameId) {
      const data = getHistoryById(gameId);
      setHistory(data);
    }
  }, [gameId, getHistoryById]);

  const handleExport = async () => {
    if (!reportRef.current || !history) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#111827',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `危化品仓储报告-${history.levelName}-${new Date(history.endTime).toLocaleDateString('zh-CN')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!history) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const { grade, color } = ScoringEngine.getGrade(history.finalScore, history.maxScore);
  const scorePercentage = Math.round((history.finalScore / history.maxScore) * 100);

  const riskTypeCounts = history.risks.reduce((acc, risk) => {
    acc[risk.type] = (acc[risk.type] || 0) + 1;
    return acc;
  }, {} as Record<RiskType, number>);

  const riskEngine = new RiskEngine([], { id: '', name: '', rows: 0, cols: 0, slots: [], baseTemperature: 0, baseHumidity: 0 });

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" />
            考核结果报告
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              <Download size={18} />
              {isExporting ? '导出中...' : '导出报告'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Home size={18} />
              返回首页
            </button>
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
            <div className="text-center mb-6">
              <div className="text-lg text-gray-400 mb-2">{history.levelName}</div>
              <div 
                className="text-8xl font-black mb-4"
                style={{ color, textShadow: `0 0 40px ${color}40` }}
              >
                {grade}
              </div>
              <div className="text-3xl font-bold mb-2">
                {history.finalScore} <span className="text-lg text-gray-500">/ {history.maxScore}</span>
              </div>
              <div className="text-gray-400">得分率: {scorePercentage}%</div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <Clock size={24} className="mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold">{formatTime(history.duration)}</div>
                <div className="text-xs text-gray-400">用时</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <History size={24} className="mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold">{history.operations.length}</div>
                <div className="text-xs text-gray-400">操作次数</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                {history.riskCount === 0 ? (
                  <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                ) : (
                  <XCircle size={24} className="mx-auto mb-2 text-red-400" />
                )}
                <div className="text-2xl font-bold">{history.riskCount}</div>
                <div className="text-xs text-gray-400">风险总数</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <AlertTriangle size={24} className="mx-auto mb-2 text-orange-400" />
                <div className="text-2xl font-bold">{history.criticalRiskCount}</div>
                <div className="text-xs text-gray-400">严重风险</div>
              </div>
            </div>

            <div className="text-center mt-6 text-sm text-gray-500">
              考核时间：{formatTimestamp(history.startTime)} ~ {formatTimestamp(history.endTime)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="flex border-b border-gray-700">
              {[
                { key: 'summary', label: '成绩汇总', icon: TrendingUp },
                { key: 'risks', label: '风险详情', icon: AlertTriangle },
                { key: 'operations', label: '操作痕迹', icon: History }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-blue-400" />
                    风险分类统计
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(riskTypeCounts).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">{riskEngine.getRiskTypeName(type as RiskType)}</span>
                        <span className={`font-bold ${count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {count} 次
                        </span>
                      </div>
                    ))}
                    {Object.keys(riskTypeCounts).length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        <CheckCircle size={48} className="mx-auto mb-2 text-green-400 opacity-50" />
                        <p>太棒了！本次操作没有产生任何风险</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'risks' && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.risks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle size={48} className="mx-auto mb-2 text-green-400 opacity-50" />
                      <p>无风险记录</p>
                    </div>
                  ) : (
                    history.risks.map((risk: RiskEvent) => (
                      <div
                        key={risk.id}
                        className={`p-4 rounded-lg border ${
                          risk.severity === 'critical'
                            ? 'bg-red-900/20 border-red-500'
                            : risk.severity === 'danger'
                              ? 'bg-orange-900/20 border-orange-500'
                              : 'bg-yellow-900/20 border-yellow-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded text-white`}
                                style={{ backgroundColor: ScoringEngine.getSeverityColor(risk.severity) }}>
                                {ScoringEngine.getSeverityLabel(risk.severity)}
                              </span>
                              <span className="font-medium">
                                {riskEngine.getRiskTypeName(risk.type)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300">{risk.description}</p>
                          </div>
                          <span className="text-red-400 font-bold">-{risk.penalty}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {formatTimestamp(risk.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'operations' && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.operations.map((op: OperationLog, index: number) => (
                    <div key={op.id} className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                              {history.operations.length - index}
                            </span>
                            <span className="font-medium">{op.chemicalName}</span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {op.type === 'place' && `摆放至 ${op.toSlotPosition}`}
                            {op.type === 'remove' && `从 ${op.toSlotPosition} 移除`}
                            {op.type === 'swap' && `从 ${op.fromSlotId} 交换到 ${op.toSlotPosition}`}
                          </div>
                          {op.risks.length > 0 && (
                            <div className="text-xs text-red-400 mt-1">
                              产生 {op.risks.length} 项风险
                            </div>
                          )}
                        </div>
                        <div className={`font-bold ${op.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {op.scoreChange >= 0 ? '+' : ''}{op.scoreChange}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {formatTimestamp(op.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-gray-600">
            化学品仓库配伍赛 · 安全培训考核报告
          </div>
        </div>
      </div>
    </div>
  );
};
