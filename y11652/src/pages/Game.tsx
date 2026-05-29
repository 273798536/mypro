import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, ArrowRight, Home, CheckCircle, XCircle, AlertCircle, FileText, FileSpreadsheet, Shield } from 'lucide-react';
import type { MaterialType, SecurityLevel, RetentionPeriod, PlayerAction } from '@/types';
import { MATERIAL_TYPE_LABELS, SECURITY_LEVEL_LABELS, RETENTION_PERIOD_LABELS } from '@/types';
import { useGameStore } from '@/store/useGameStore';
import { CardComponent } from '@/components/Card';
import { Timer } from '@/components/Timer';
import { ScoreBoard } from '@/components/ScoreBoard';
import { RuleHint } from '@/components/RuleHint';
import { generateReport } from '@/utils/reportGenerator';
import { saveReport, saveHistory, createHistoryRecord } from '@/utils/storage';

const MATERIAL_TYPES: MaterialType[] = ['contract', 'invoice', 'confidential'];
const SECURITY_LEVELS: SecurityLevel[] = ['public', 'internal', 'secret', 'confidential', 'top_secret'];
const RETENTION_PERIODS: RetentionPeriod[] = ['permanent', '30years', '10years'];

const typeColors: Record<MaterialType, string> = {
  contract: 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
  invoice: 'border-green-500 bg-green-500 text-white hover:bg-green-600',
  confidential: 'border-red-500 bg-red-500 text-white hover:bg-red-600',
};

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, currentCard, submitAction, nextCard, finishGame, pauseGame, resumeGame, tickTimer, resetGame } = useGameStore();
  const [selectedType, setSelectedType] = useState<MaterialType | null>(null);
  const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<SecurityLevel | null>(null);
  const [selectedRetentionPeriod, setSelectedRetentionPeriod] = useState<RetentionPeriod | null>(null);
  const [isBorrowRegistered, setIsBorrowRegistered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    scoreChange: number;
    errors: string[];
    correctAnswer: any;
  } | null>(null);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  useEffect(() => {
    if (gameState.status === 'idle' || gameState.status === 'finished') {
      navigate('/');
    }
  }, [gameState.status, navigate]);

  useEffect(() => {
    if (gameState.status === 'finished' && gameState.currentReportId) {
      const report = generateReport(gameState, gameState.currentReportId);
      saveReport(report);
      const historyRecord = createHistoryRecord(report);
      saveHistory(historyRecord);
      navigate(`/report/${gameState.currentReportId}`);
    }
  }, [gameState.status, gameState.currentReportId, gameState, navigate]);

  useEffect(() => {
    setSelectedType(null);
    setSelectedSecurityLevel(null);
    setSelectedRetentionPeriod(null);
    setIsBorrowRegistered(false);
    setShowResult(false);
    setLastResult(null);
  }, [gameState.currentCardIndex]);

  const handleSubmit = () => {
    if (!currentCard || !selectedType || !selectedSecurityLevel || !selectedRetentionPeriod) {
      return;
    }

    const action: Omit<PlayerAction, 'timestamp' | 'errors' | 'scoreChange'> = {
      cardId: currentCard.id,
      selectedType,
      selectedSecurityLevel,
      selectedRetentionPeriod,
      isBorrowRegistered,
    };

    const result = submitAction(action);
    setLastResult({
      isCorrect: result.errors.length === 0,
      scoreChange: result.scoreChange,
      errors: result.errors,
      correctAnswer: result.correctAnswer,
    });
    setShowResult(true);
  };

  const handleNext = () => {
    const hasMore = nextCard();
    if (!hasMore) {
      finishGame();
    }
  };

  const handlePause = () => {
    pauseGame();
    setShowPauseMenu(true);
  };

  const handleResume = () => {
    resumeGame();
    setShowPauseMenu(false);
  };

  const handleQuit = () => {
    finishGame();
    resetGame();
    navigate('/');
  };

  const isSubmitDisabled = !selectedType || !selectedSecurityLevel || !selectedRetentionPeriod || showResult;

  if (!currentCard) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">加载中...</div>;
  }

  const correctCount = gameState.actions.filter((a) => a.errors.length === 0).length;
  const errorCount = gameState.actions.filter((a) => a.errors.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="sticky top-0 z-40 border-b border-slate-700 bg-slate-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePause}
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-600"
            >
              <Pause size={18} />
              暂停
            </button>
            <div className="text-sm text-slate-400">
              第 <span className="font-bold text-white">{gameState.currentCardIndex + 1}</span> / {gameState.cards.length} 张
            </div>
          </div>
          
          <Timer
            remainingTime={gameState.remainingTime}
            isRunning={gameState.status === 'playing'}
            onTick={tickTimer}
          />

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 font-bold text-white">
              {gameState.score} 分
            </div>
            {gameState.combo > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-bold text-white">
                🔥 {gameState.combo} 连击
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <ScoreBoard
          score={gameState.score}
          combo={gameState.combo}
          maxCombo={gameState.maxCombo}
          correctCount={correctCount}
          errorCount={errorCount}
          totalCards={gameState.cards.length}
          className="mb-6"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <CardComponent card={currentCard} />
            <RuleHint card={currentCard} />
          </div>

          <div className="space-y-6">
            {showResult && lastResult ? (
              <div className={`rounded-xl border-2 p-6 ${lastResult.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="mb-4 flex items-center gap-3">
                  {lastResult.isCorrect ? (
                    <CheckCircle className="text-green-500" size={32} />
                  ) : (
                    <XCircle className="text-red-500" size={32} />
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${lastResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {lastResult.isCorrect ? '回答正确！' : '回答错误'}
                    </h3>
                    <div className={`text-lg font-semibold ${lastResult.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {lastResult.scoreChange >= 0 ? '+' : ''}{lastResult.scoreChange} 分
                    </div>
                  </div>
                </div>

                {!lastResult.isCorrect && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-2 font-medium text-red-700">
                      <AlertCircle size={18} />
                      错误类型：
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lastResult.errors.map((error) => (
                        <span key={error} className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                          {error === 'classification' && '分类错误'}
                          {error === 'security_level' && '保密级别错误'}
                          {error === 'retention_period' && '保管期限错误'}
                          {error === 'borrow_not_registered' && '借阅未登记'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-white p-4 text-sm">
                  <div className="mb-2 font-medium text-gray-700">正确答案：</div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600">
                    <div>分类：{MATERIAL_TYPE_LABELS[lastResult.correctAnswer.materialType as MaterialType]}</div>
                    <div>保密级别：{SECURITY_LEVEL_LABELS[lastResult.correctAnswer.securityLevel as SecurityLevel]}</div>
                    <div>保管期限：{RETENTION_PERIOD_LABELS[lastResult.correctAnswer.retentionPeriod as RetentionPeriod]}</div>
                    <div>借阅登记：{lastResult.correctAnswer.isBorrowRegistered ? '需要登记' : '不需要'}</div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
                >
                  {gameState.currentCardIndex + 1 < gameState.cards.length ? (
                    <>
                      下一张
                      <ArrowRight size={20} />
                    </>
                  ) : (
                    '查看报告'
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">选择材料分类</h3>
                  <div className="grid gap-3">
                    {MATERIAL_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                          selectedType === type
                            ? typeColors[type]
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        {type === 'contract' && <FileText size={20} />}
                        {type === 'invoice' && <FileSpreadsheet size={20} />}
                        {type === 'confidential' && <Shield size={20} />}
                        <span className="font-medium">{MATERIAL_TYPE_LABELS[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">设置保密级别</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {SECURITY_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedSecurityLevel(level)}
                        className={`rounded-lg border-2 px-2 py-3 text-center text-sm font-medium transition-all ${
                          selectedSecurityLevel === level
                            ? 'border-purple-500 bg-purple-500 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        {SECURITY_LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">设置保管期限</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {RETENTION_PERIODS.map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedRetentionPeriod(period)}
                        className={`rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                          selectedRetentionPeriod === period
                            ? 'border-amber-500 bg-amber-500 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        {RETENTION_PERIOD_LABELS[period]}
                      </button>
                    ))}
                  </div>
                </div>

                {currentCard.hasBorrowRequest && (
                  <div className="rounded-xl border-2 border-orange-500/50 bg-orange-500/10 p-6">
                    <div className="mb-3 flex items-center gap-2 text-orange-300">
                      <AlertCircle size={20} />
                      <span className="font-medium">该材料有借阅记录，请确认是否已登记</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsBorrowRegistered(true)}
                        className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                          isBorrowRegistered
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        已登记
                      </button>
                      <button
                        onClick={() => setIsBorrowRegistered(false)}
                        className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                          !isBorrowRegistered
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        未登记
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                  className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  提交归档
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showPauseMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl">
            <h2 className="mb-6 text-center text-2xl font-bold text-white">游戏暂停</h2>
            <div className="space-y-3">
              <button
                onClick={handleResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
              >
                <Play size={20} />
                继续游戏
              </button>
              <button
                onClick={handleQuit}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-700 px-6 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-600"
              >
                <Home size={20} />
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
