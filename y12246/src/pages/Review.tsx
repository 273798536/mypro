import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, RefreshCw, BarChart3, Wallet, 
  GitBranch, FileText, CheckCircle, XCircle, Clock,
  Play, Pause, SkipBack, SkipForward
} from 'lucide-react';
import { useGameStore, useCurrentLevel, levels } from '../store/gameStore';
import { generateReviewData, downloadReport, ReviewData } from '../utils/reviewGenerator';
import { getStatusColor, getStatusText } from '../utils/rulesEngine';

const Review: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const cashFlows = useGameStore(state => state.cashFlows);
  const traces = useGameStore(state => state.traces);
  const selectedAnswers = useGameStore(state => state.selectedAnswers);
  const score = useGameStore(state => state.score);
  const startLevel = useGameStore(state => state.startLevel);
  const replayMode = useGameStore(state => state.replayMode);
  const replayStep = useGameStore(state => state.replayStep);
  const startReplay = useGameStore(state => state.startReplay);
  const replayNextStep = useGameStore(state => state.replayNextStep);
  const replayPrevStep = useGameStore(state => state.replayPrevStep);

  const level = useCurrentLevel();

  const reviewData = useMemo((): ReviewData | null => {
    if (!level || cashFlows.length === 0) return null;
    return generateReviewData(level, cashFlows, traces, selectedAnswers, score);
  }, [level, cashFlows, traces, selectedAnswers, score]);

  useEffect(() => {
    if (!level && levelId) {
      const levelData = levels.find(l => l.id === levelId);
      if (levelData) {
        startLevel(levelId);
      }
    }
  }, [level, levelId, startLevel]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReplay = () => {
    startReplay();
  };

  const handleDownloadReport = () => {
    if (reviewData) {
      downloadReport(reviewData);
    }
  };

  const handlePlayAgain = () => {
    if (levelId) {
      startLevel(levelId);
      navigate(`/game/${levelId}`);
    }
  };

  if (!level || !reviewData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">暂无复盘数据</p>
          <button
            onClick={handleGoHome}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { settlement, eventBranches } = reviewData;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">返回</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-800">复盘分析</h1>
                <p className="text-xs text-gray-500">{level.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayAgain}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                再玩一次
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出报告
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">最终得分</h2>
              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-bold text-amber-400">{score}</span>
                <span className="text-slate-400">/ 100 分</span>
                {score >= level.targetScore ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    ✓ 已通过
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                    目标：{level.targetScore}分
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm mb-1">正确率</p>
              <p className="text-2xl font-bold">
                {eventBranches.filter(e => e.isCorrect).length} / {eventBranches.length}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">现金流结算</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 mb-1">预期总金额</p>
                <p className="text-2xl font-bold text-green-700">¥{settlement.totalExpected.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">实际总金额</p>
                <p className="text-2xl font-bold text-blue-700">¥{settlement.totalActual.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {cashFlows.map((cf) => (
                <div key={cf.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-800">
                        第{cf.period}期 - {cf.type === 'coupon' ? '付息' : cf.type === 'put' ? '回售' : '本金兑付'}
                      </span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${getStatusColor(cf.status)}`}>
                        {getStatusText(cf.status)}
                      </span>
                    </div>
                    <span className="font-bold text-gray-800">¥{cf.expectedAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    原日期：{cf.originalDate}
                    {cf.date !== cf.originalDate && (
                      <span className="text-amber-600 ml-2">→ {cf.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div>已确认：{settlement.confirmedCount}笔</div>
              <div>已顺延：{settlement.delayedCount}笔</div>
              <div>违约：{settlement.defaultCount}笔</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">事件分支分析</h3>
            </div>

            <div className="space-y-4">
              {eventBranches.map((branch, index) => (
                <div 
                  key={branch.eventId}
                  className={`p-4 rounded-lg border-l-4 ${
                    branch.isCorrect 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      branch.isCorrect ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {branch.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{branch.eventTitle}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {branch.eventDate}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-500">你的选择：</span>
                          <span className={branch.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {branch.userChoice}
                          </span>
                        </p>
                        {!branch.isCorrect && (
                          <p>
                            <span className="text-gray-500">正确选择：</span>
                            <span className="text-green-600">{branch.correctChoice}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">对应关系详情</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-600">现金流格</th>
                  <th className="text-left p-3 font-medium text-gray-600">类型</th>
                  <th className="text-left p-3 font-medium text-gray-600">来源（债券卡）</th>
                  <th className="text-left p-3 font-medium text-gray-600">关联公告事件</th>
                  <th className="text-left p-3 font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((cf) => {
                  const relatedEvents = eventBranches.filter(eb =>
                    eb.eventTitle.includes('付息') ||
                    (cf.type === 'put' && eb.eventTitle.includes('回售')) ||
                    eb.eventTitle.includes('兑付')
                  );
                  return (
                    <tr key={cf.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium">{cf.id}</td>
                      <td className="p-3">
                        {cf.type === 'coupon' ? '付息' : cf.type === 'put' ? '回售' : '本金兑付'}
                      </td>
                      <td className="p-3 text-gray-600">
                        {cf.type === 'coupon' ? '付息日约定' : cf.type === 'put' ? '回售权条款' : '到期日约定'}
                      </td>
                      <td className="p-3">
                        {relatedEvents.length > 0 ? (
                          <div className="space-y-1">
                            {relatedEvents.map(eb => (
                              <div key={eb.eventId} className={`text-xs ${
                                eb.isCorrect ? 'text-green-600' : 'text-red-600'
                              }`}>
                                • {eb.eventTitle}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">无</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(cf.status)}`}>
                          {getStatusText(cf.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">学习要点总结</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {level.learningPoints.map((point, index) => (
              <div key={index} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-amber-800">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Review;
