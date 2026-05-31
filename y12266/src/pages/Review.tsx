import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, Home, Download, BarChart3, Clock, Target, Zap, ChevronLeft, ChevronRight, FastForward, Info } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useReplay } from '../hooks/useReplay';
import { ERROR_TYPE_NAMES, SCALE_NAMES } from '../data/musicTheory';
import { formatDuration, formatTimestamp, getErrorTypeColor, downloadScoreReport, generateAnalysisText } from '../utils/export';
import type { ErrorType, JudgmentResult, ScoreReport } from '../types';

export default function Review() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const replayData = useGameStore(state => state.replayData);
  const savedGames = useGameStore(state => state.savedGames);
  const clearGame = useGameStore(state => state.clearGame);
  const playReplay = useGameStore(state => state.playReplay);
  const pauseReplay = useGameStore(state => state.pauseReplay);
  const seekReplay = useGameStore(state => state.seekReplay);
  const setReplaySpeed = useGameStore(state => state.setReplaySpeed);
  const replaySpeed = useGameStore(state => state.replaySpeed);
  const isReplaying = useGameStore(state => state.isReplaying);
  const currentReplayFrame = useGameStore(state => state.currentReplayFrame);
  const exportScore = useGameStore(state => state.exportScore);
  const startReview = useGameStore(state => state.startReview);
  const loadSavedGames = useGameStore(state => state.loadSavedGames);
  
  const [selectedJudgment, setSelectedJudgment] = useState<JudgmentResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'errors'>('overview');

  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  useEffect(() => {
    if (gameId && (!replayData || replayData.length === 0)) {
      startReview(gameId);
    }
  }, [gameId, replayData?.length, startReview]);

  const { totalFrames } = useReplay();

  const currentGame = useMemo(() => {
    if (!replayData || replayData.length === 0) return null;
    const lastFrame = replayData[replayData.length - 1];
    return lastFrame.gameState;
  }, [replayData]);

  const scoreReport = useMemo((): ScoreReport | null => {
    if (!currentGame?.endTime || !currentGame.judgments) return null;

    const errorBreakdown: Record<ErrorType, number> = {
      accidental_miss: 0,
      enharmonic_confusion: 0,
      chord_misattribution: 0,
      tower_late: 0
    };

    currentGame.judgments.forEach(j => {
      j.errorTypes.forEach(e => {
        errorBreakdown[e]++;
      });
    });

    const correctCount = currentGame.judgments.filter(j => j.isCorrect).length;
    const totalJudgments = currentGame.judgments.length;

    return {
      gameId: currentGame.gameId,
      levelId: currentGame.levelId,
      levelName: currentGame.level?.name || '',
      startTime: currentGame.startTime,
      endTime: currentGame.endTime,
      duration: currentGame.endTime - currentGame.startTime,
      totalScore: currentGame.score,
      maxCombo: currentGame.maxCombo,
      accuracy: totalJudgments > 0 ? correctCount / totalJudgments : 0,
      totalJudgments,
      correctCount,
      errorBreakdown,
      judgments: currentGame.judgments
    };
  }, [currentGame]);

  const errorAnalysis = useMemo(() => {
    if (!scoreReport) return null;
    
    const entries = Object.entries(scoreReport.errorBreakdown)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    
    const total = entries.reduce((sum, [_, count]) => sum + count, 0);
    
    return entries.map(([type, count]) => ({
      type: type as ErrorType,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }, [scoreReport]);

  const timelineData = useMemo(() => {
    if (!scoreReport) return [];
    
    return scoreReport.judgments.map((j, index) => ({
      index,
      timestamp: j.timestamp,
      isCorrect: j.isCorrect,
      errorTypes: j.errorTypes,
      correctAnswer: j.correctAnswer,
      userAnswer: j.userAnswer,
      timing: j.timingSequence
    }));
  }, [scoreReport]);

  const handleExport = () => {
    if (scoreReport) {
      downloadScoreReport(scoreReport);
    }
  };

  const handleExportText = () => {
    if (!scoreReport) return;
    const text = generateAnalysisText(scoreReport);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `音阶魔法塔_分析_${scoreReport.levelName}_${new Date(scoreReport.endTime).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentGame || !scoreReport) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-300 mb-4">没有可复盘的游戏数据</p>
          <button className="btn-primary" onClick={() => {
            clearGame();
            navigate('/');
          }}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-body">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              className="btn-secondary flex items-center gap-2"
              onClick={() => {
                clearGame();
                navigate('/');
              }}
            >
              <Home className="w-4 h-4" />
              首页
            </button>
            <h1 className="text-3xl font-bold font-display text-magic-gold">
              📊 游戏复盘
            </h1>
            <span className="text-primary-300">{scoreReport.levelName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="btn-secondary flex items-center gap-2"
              onClick={handleExportText}
            >
              <BarChart3 className="w-4 h-4" />
              导出分析
            </button>
            <button 
              className="btn-primary flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
              导出成绩JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-br from-magic-gold/10 to-magic-gold/5 border-magic-gold/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-magic-gold/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-magic-gold" />
              </div>
              <div>
                <div className="text-3xl font-bold text-magic-gold">{scoreReport.totalScore}</div>
                <div className="text-sm text-primary-400">总分</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-gradient-to-br from-magic-cyan/10 to-magic-cyan/5 border-magic-cyan/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-magic-cyan/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-magic-cyan" />
              </div>
              <div>
                <div className="text-3xl font-bold text-magic-cyan">{(scoreReport.accuracy * 100).toFixed(1)}%</div>
                <div className="text-sm text-primary-400">正确率</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-gradient-to-br from-magic-orange/10 to-magic-orange/5 border-magic-orange/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-magic-orange/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-magic-orange" />
              </div>
              <div>
                <div className="text-3xl font-bold text-magic-orange">{scoreReport.maxCombo}</div>
                <div className="text-sm text-primary-400">最高连击</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card bg-gradient-to-br from-primary-500/10 to-primary-500/5 border-primary-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary-300" />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-200">{formatDuration(scoreReport.duration)}</div>
                <div className="text-sm text-primary-400">游戏时长</div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['overview', 'timeline', 'errors'] as const).map(tab => (
            <button
              key={tab}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-800/50 text-primary-300 hover:bg-primary-700/50'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '总览'}
              {tab === 'timeline' && '判定时序'}
              {tab === 'errors' && '错误分析'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-bold text-primary-100 mb-4">基本信息</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-400">游戏ID</span>
                  <span className="text-primary-200 font-mono">{scoreReport.gameId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-400">开始时间</span>
                  <span className="text-primary-200">{formatTimestamp(scoreReport.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-400">结束时间</span>
                  <span className="text-primary-200">{formatTimestamp(scoreReport.endTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-400">总判定次数</span>
                  <span className="text-primary-200">{scoreReport.totalJudgments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-400">正确次数</span>
                  <span className="text-magic-green">{scoreReport.correctCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-400">错误次数</span>
                  <span className="text-magic-red">{scoreReport.totalJudgments - scoreReport.correctCount}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-primary-100 mb-4">错误类型分布</h3>
              {errorAnalysis && errorAnalysis.length > 0 ? (
                <div className="space-y-4">
                  {errorAnalysis.map((error, index) => (
                    <motion.div
                      key={error.type}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-primary-200 flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getErrorTypeColor(error.type) }}
                          />
                          {ERROR_TYPE_NAMES[error.type]}
                        </span>
                        <span className="text-primary-300">
                          {error.count}次 ({error.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${error.percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: getErrorTypeColor(error.type) }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-magic-green">
                  🎉 无错误记录，表现完美！
                </div>
              )}
            </div>

            <div className="card col-span-2">
              <h3 className="text-lg font-bold text-primary-100 mb-4">回放控制</h3>
              
              {replayData && replayData.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      className="btn-secondary p-2"
                      onClick={() => seekReplay(Math.max(0, currentReplayFrame - 30))}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="btn-primary p-4 rounded-full"
                      onClick={() => isReplaying ? pauseReplay() : playReplay()}
                    >
                      {isReplaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <button
                      className="btn-secondary p-2"
                      onClick={() => seekReplay(Math.min(totalFrames - 1, currentReplayFrame + 30))}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-primary-400 text-sm w-12 text-right">
                      {currentReplayFrame}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={totalFrames - 1}
                      value={currentReplayFrame}
                      onChange={(e) => seekReplay(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-primary-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-primary-400 text-sm w-12">
                      {totalFrames - 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-primary-400 text-sm">播放速度:</span>
                    {[0.5, 1, 1.5, 2].map(speed => (
                      <button
                        key={speed}
                        className={`px-3 py-1 rounded text-sm ${
                          replaySpeed === speed
                            ? 'bg-primary-600 text-white'
                            : 'bg-primary-800 text-primary-300 hover:bg-primary-700'
                        }`}
                        onClick={() => setReplaySpeed(speed)}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-primary-400">
                  没有可用的回放数据
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="card">
            <h3 className="text-lg font-bold text-primary-100 mb-4">判定时序分析</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
              {timelineData.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${
                    item.isCorrect
                      ? 'bg-magic-green/10 border-magic-green/30'
                      : 'bg-magic-red/10 border-magic-red/30'
                  } cursor-pointer hover:bg-opacity-20 transition-colors`}
                  onClick={() => setSelectedJudgment(scoreReport.judgments[index])}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        item.isCorrect ? 'bg-magic-green/20 text-magic-green' : 'bg-magic-red/20 text-magic-red'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className={`font-bold ${item.isCorrect ? 'text-magic-green' : 'text-magic-red'}`}>
                          {item.isCorrect ? '✓ 判定正确' : '✗ 判定错误'}
                        </div>
                        <div className="text-sm text-primary-300">
                          正确答案: <span className="text-magic-green">{item.correctAnswer}</span>
                          {!item.isCorrect && (
                            <span> | 你的答案: <span className="text-magic-red">{item.userAnswer}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-primary-500">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>

                  {item.errorTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.errorTypes.map((error, i) => (
                        <span 
                          key={i}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ 
                            backgroundColor: `${getErrorTypeColor(error)}20`,
                            color: getErrorTypeColor(error)
                          }}
                        >
                          {ERROR_TYPE_NAMES[error]}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary-500" />
                    <div className="flex items-center gap-1 text-xs text-primary-400">
                      <span className="text-magic-cyan">音阶卡</span>
                      <span className="text-primary-600">→</span>
                      <span className="text-magic-orange">和弦怪</span>
                      <span className="text-primary-600">→</span>
                      <span className="text-magic-gold">调式塔</span>
                      {item.timing.length > 0 && (
                        <span className="ml-2">
                          (时差: {item.timing[item.timing.length - 1].timestamp - item.timing[0].timestamp}ms)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-1">
                    {item.timing.map((t, i) => {
                      const timeDiff = i > 0 ? t.timestamp - item.timing[i - 1].timestamp : 0;
                      return (
                        <div 
                          key={t.id}
                          className={`flex-1 p-2 rounded text-center text-xs ${
                            t.source === 'card' ? 'bg-magic-cyan/20 text-magic-cyan' :
                            t.source === 'monster' ? 'bg-magic-orange/20 text-magic-orange' :
                            'bg-magic-gold/20 text-magic-gold'
                          }`}
                        >
                          <div className="font-bold">
                            {t.source === 'card' ? '🎴' : t.source === 'monster' ? '👾' : '🏰'}
                          </div>
                          {timeDiff > 0 && (
                            <div className="text-[10px] opacity-70">+{timeDiff}ms</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="grid grid-cols-2 gap-6">
            {(['accidental_miss', 'enharmonic_confusion', 'chord_misattribution', 'tower_late'] as ErrorType[]).map(errorType => {
              const relatedJudgments = scoreReport.judgments.filter(j => 
                j.errorTypes.includes(errorType)
              );
              
              return (
                <div 
                  key={errorType}
                  className="card"
                >
                  <h3 
                    className="text-lg font-bold mb-4 flex items-center gap-2"
                    style={{ color: getErrorTypeColor(errorType) }}
                  >
                    <span 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getErrorTypeColor(errorType) }}
                    />
                    {ERROR_TYPE_NAMES[errorType]}
                    <span className="ml-auto text-sm font-normal text-primary-400">
                      {relatedJudgments.length} 次
                    </span>
                  </h3>
                  
                  {relatedJudgments.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
                      {relatedJudgments.map((j, i) => (
                        <div
                          key={j.id}
                          className="p-3 bg-primary-800/50 rounded-lg cursor-pointer hover:bg-primary-700/50 transition-colors"
                          onClick={() => setSelectedJudgment(j)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-primary-200">
                              正确: <span className="text-magic-green">{j.correctAnswer}</span>
                            </span>
                            <span className="text-sm text-primary-200">
                              答案: <span className="text-magic-red">{j.userAnswer}</span>
                            </span>
                          </div>
                          <div className="text-xs text-primary-400 line-clamp-2">
                            {j.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-primary-500">
                      无此类型错误
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedJudgment && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJudgment(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-primary-100 mb-4">判定详情</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-magic-green/10 rounded-lg">
                  <div className="text-xs text-primary-400 mb-1">正确答案</div>
                  <div className="text-2xl font-bold text-magic-green">{selectedJudgment.correctAnswer}</div>
                </div>
                <div className={`p-3 rounded-lg ${selectedJudgment.isCorrect ? 'bg-magic-green/10' : 'bg-magic-red/10'}`}>
                  <div className="text-xs text-primary-400 mb-1">你的答案</div>
                  <div className={`text-2xl font-bold ${selectedJudgment.isCorrect ? 'text-magic-green' : 'text-magic-red'}`}>
                    {selectedJudgment.userAnswer}
                  </div>
                </div>
              </div>

              {selectedJudgment.errorTypes.length > 0 && (
                <div>
                  <div className="text-sm text-primary-300 mb-2">错误类型:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJudgment.errorTypes.map((error, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: `${getErrorTypeColor(error)}20`,
                          color: getErrorTypeColor(error)
                        }}
                      >
                        {ERROR_TYPE_NAMES[error]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJudgment.conflictDetected && (
                <div className="p-3 bg-magic-orange/10 rounded-lg border border-magic-orange/30">
                  <div className="text-sm font-bold text-magic-orange mb-1">⚠️ 检测到冲突</div>
                  {selectedJudgment.conflictDetails.map((detail, i) => (
                    <div key={i} className="text-sm text-primary-200">{detail}</div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-sm text-primary-300 mb-2">判定时序:</div>
                <div className="flex gap-2">
                  {selectedJudgment.timingSequence.map((t, i) => {
                    const timeDiff = i > 0 ? t.timestamp - selectedJudgment.timingSequence[i - 1].timestamp : 0;
                    return (
                      <div 
                        key={t.id}
                        className={`flex-1 p-3 rounded-lg text-center ${
                          t.source === 'card' ? 'bg-magic-cyan/20 text-magic-cyan' :
                          t.source === 'monster' ? 'bg-magic-orange/20 text-magic-orange' :
                          'bg-magic-gold/20 text-magic-gold'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {t.source === 'card' ? '🎴' : t.source === 'monster' ? '👾' : '🏰'}
                        </div>
                        <div className="font-bold text-sm">
                          {t.source === 'card' ? '音阶卡' : 
                           t.source === 'monster' ? '和弦怪' : '调式塔'}
                        </div>
                        <div className="text-xs opacity-70">
                          {t.source === 'card' && `${selectedJudgment.cardData.tonic} ${SCALE_NAMES[selectedJudgment.cardData.scaleType]}`}
                          {t.source === 'monster' && selectedJudgment.monsterData.chordNotes.join('-')}
                          {t.source === 'tower' && selectedJudgment.towerData?.modeName}
                        </div>
                        {timeDiff > 0 && (
                          <div className="text-[10px] mt-1 opacity-70">+{timeDiff}ms</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-primary-800/50 rounded-lg">
                <div className="text-sm text-primary-300 mb-2">详细说明:</div>
                <div className="text-primary-100">{selectedJudgment.explanation}</div>
              </div>

              <button
                className="btn-primary w-full"
                onClick={() => setSelectedJudgment(null)}
              >
                关闭
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
