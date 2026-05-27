import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { formatPercent, formatCurrency } from '../utils/calculator';
import { exportToJSON, exportToImage, exportToText } from '../utils/exporter';
import {
  Trophy,
  Download,
  Home,
  RotateCcw,
  FileJson,
  FileImage,
  FileText,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Target,
  Wallet,
  Newspaper,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const currentGame = useGameStore(state => state.currentGame);
  const restartGame = useGameStore(state => state.restartGame);
  const initGame = useGameStore(state => state.initGame);

  const [isExporting, setIsExporting] = useState(false);
  const [replayRound, setReplayRound] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    if (!currentGame || currentGame.gameId !== gameId) {
      navigate('/');
    }
  }, [currentGame, gameId, navigate]);

  if (!currentGame || !currentGame.score) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const { score } = currentGame;

  const radarData = [
    { subject: '风险调整收益', A: score.riskAdjustedReturn, fullMark: 100 },
    { subject: '分散化程度', A: score.diversificationScore, fullMark: 100 },
    { subject: '手续费效率', A: score.feeEfficiency, fullMark: 100 },
    { subject: '事件响应', A: score.eventResponseScore, fullMark: 100 },
  ];

  const handleExportJSON = () => {
    setIsExporting(true);
    exportToJSON(currentGame);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      await exportToImage('report-content', `fund-manager-report-${currentGame.gameId}`);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleExportText = () => {
    setIsExporting(true);
    exportToText(currentGame);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handlePlayAgain = () => {
    restartGame();
    navigate('/game');
  };

  const handleNewGame = () => {
    navigate('/');
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'from-amber-400 to-yellow-300';
      case 'A': return 'from-green-400 to-emerald-300';
      case 'B': return 'from-blue-400 to-cyan-300';
      case 'C': return 'from-orange-400 to-amber-300';
      default: return 'from-red-400 to-rose-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleNewGame}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              <FileImage className="w-4 h-4" />
              图片
            </button>
            <button
              onClick={handleExportText}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              文本
            </button>
          </div>
        </div>

        <div id="report-content">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">游戏结算报告</h1>
            <p className="text-slate-400">游戏ID: {currentGame.gameId}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center">
                <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getGradeColor(score.grade)} flex items-center justify-center shadow-2xl mb-4`}>
                  <span className="text-5xl font-bold text-slate-900">{score.grade}</span>
                </div>
                <p className="text-slate-400 text-sm">综合评级</p>
              </div>

              <div className="flex-1">
                <div className="text-center mb-6">
                  <p className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    {score.totalScore}
                  </p>
                  <p className="text-slate-400">综合得分 / 100</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-slate-700/50 rounded-xl">
                    <p className={`text-2xl font-bold font-mono ${score.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(score.totalReturn)}
                    </p>
                    <p className="text-xs text-slate-400">总收益率</p>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded-xl">
                    <p className="text-2xl font-bold text-cyan-400 font-mono">
                      {score.riskAdjustedReturn.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-400">风险调整收益</p>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded-xl">
                    <p className="text-2xl font-bold text-orange-400 font-mono">
                      -{formatPercent(score.maxDrawdown)}
                    </p>
                    <p className="text-xs text-slate-400">最大回撤</p>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-400 font-mono">
                      {currentGame.round}
                    </p>
                    <p className="text-xs text-slate-400">完成回合</p>
                  </div>
                </div>
              </div>

              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="得分"
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold">失败原因分析</h3>
              </div>
              {score.failureReasons.length > 0 ? (
                <div className="space-y-3">
                  {score.failureReasons.map((reason, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                    >
                      <span className="text-red-400 font-bold">❌</span>
                      <p className="text-sm text-slate-300">{reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-slate-400">表现优秀，无重大失误！</p>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold">投资建议</h3>
              </div>
              <div className="space-y-3">
                {score.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  >
                    <span className="text-yellow-400 font-bold">💡</span>
                    <p className="text-sm text-slate-300">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">资产统计</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">初始资金</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(currentGame.initialAssets)}</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">最终资金</p>
                <p className="text-xl font-bold font-mono">{formatCurrency(currentGame.totalAssets)}</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">累计盈亏</p>
                <p className={`text-xl font-bold font-mono ${currentGame.totalAssets - currentGame.initialAssets >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(currentGame.totalAssets - currentGame.initialAssets)}
                </p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">累计手续费</p>
                <p className="text-xl font-bold text-orange-400 font-mono">{formatCurrency(currentGame.totalFees)}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold">交易历史回放</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplayRound(Math.max(0, replayRound - 1))}
                  disabled={replayRound === 0}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400 w-20 text-center">
                  回合 {replayRound + 1} / {currentGame.tradeHistory.length || 1}
                </span>
                <button
                  onClick={() => setReplayRound(Math.min(currentGame.tradeHistory.length - 1, replayRound + 1))}
                  disabled={replayRound >= currentGame.tradeHistory.length - 1}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {currentGame.tradeHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-3 px-2">回合</th>
                      <th className="text-left py-3 px-2">行业</th>
                      <th className="text-left py-3 px-2">操作</th>
                      <th className="text-right py-3 px-2">权重变动</th>
                      <th className="text-right py-3 px-2">成交价</th>
                      <th className="text-right py-3 px-2">手续费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentGame.tradeHistory.slice(0, replayRound + 1).map((trade, index) => {
                      const industry = currentGame.industries.find(i => i.id === trade.industryId);
                      return (
                        <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-2 font-mono">R{trade.round}</td>
                          <td className="py-3 px-2">
                            <span className="mr-2">{industry?.icon}</span>
                            {industry?.name}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.action === 'buy' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.action === 'buy' ? '买入' : '卖出'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono">
                            {trade.action === 'buy' ? '+' : ''}{formatPercent(trade.weightChange)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono">{trade.price.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-mono text-orange-400">
                            {formatCurrency(trade.fee)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                本次游戏无交易记录
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold">事件回顾</h3>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {currentGame.eventHistory.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border-l-4 ${
                    event.type === 'positive'
                      ? 'bg-green-500/10 border-green-500'
                      : event.type === 'negative'
                      ? 'bg-red-500/10 border-red-500'
                      : 'bg-blue-500/10 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm mb-1">{event.title}</p>
                      <p className="text-xs text-slate-400">{event.content}</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                      第{event.round}回合
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12">
          <button
            onClick={handlePlayAgain}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
          <button
            onClick={handleNewGame}
            className="flex items-center gap-2 px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors"
          >
            <Home className="w-5 h-5" />
            选择难度
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
