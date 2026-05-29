import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { ConversationCard } from '@/components/ConversationCard';
import { DecisionButtons } from '@/components/DecisionButtons';
import { ResourcePanel } from '@/components/ResourcePanel';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ProgressBar } from '@/components/ProgressBar';
import { gameEngine } from '@/game/gameEngine';
import type { Decision } from '@/types';
import { Home, BookOpen } from 'lucide-react';

export default function GamePage() {
  const navigate = useNavigate();
  const {
    status,
    currentCardIndex,
    cards,
    score,
    totalScore,
    resources,
    currentHint,
    lastFeedback,
    showFeedback,
    makeDecision,
    nextCard,
    hideFeedback,
    resetGame,
    getCurrentCard,
    getProgress,
  } = useGameStore();

  const currentCard = getCurrentCard();
  const isLastCard = currentCardIndex >= cards.length - 1;

  useEffect(() => {
    if (status !== 'playing') {
      navigate('/');
    }
  }, [status, navigate]);

  const handleDecision = useCallback((decision: Decision) => {
    if (showFeedback) return;
    makeDecision(decision);
  }, [makeDecision, showFeedback]);

  const handleNext = useCallback(() => {
    if (isLastCard) {
      navigate('/result');
    } else {
      nextCard();
    }
  }, [isLastCard, nextCard, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFeedback) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleNext();
        }
        return;
      } else {
        if (e.key === '1') handleDecision('ai');
        if (e.key === '2') handleDecision('human');
        if (e.key === '3') handleDecision('observe');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDecision, handleNext, showFeedback]);

  const escalationCost = gameEngine.getEscalationCost();
  const { allowed: canEscalate, reason: escalateReason } = gameEngine.canEscalate();

  const difficulty = useGameStore.getState().difficulty;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e508_1px,transparent_1px),linear-gradient(to_bottom,#4f46e508_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                resetGame();
                navigate('/');
              }}
              className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-gray-400 hover:text-white hover:bg-slate-700/60 transition-all"
            >
              <Home className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">AI 客服分流挑战</h1>
              <p className="text-sm text-gray-400">
                难度: {difficulty === 'easy' ? '新手' : difficulty === 'medium' ? '进阶' : '挑战'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/rules')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-gray-300 hover:text-white hover:bg-slate-700/60 transition-all text-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>规则</span>
          </button>
        </header>

        <div className="mb-6">
          <ProgressBar
            current={currentCardIndex}
            total={cards.length}
            score={score}
            totalScore={totalScore}
          />
        </div>

        {currentCard && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ConversationCard
                card={currentCard}
                index={currentCardIndex}
                total={cards.length}
                hint={currentHint}
              />

              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4">做出你的决策</h3>
                <DecisionButtons
                  onDecision={handleDecision}
                  disabled={showFeedback}
                  escalationCost={escalationCost}
                  canEscalate={canEscalate}
                  escalateReason={escalateReason}
                />
                <p className="text-center text-xs text-gray-500 mt-4">
                  💡 键盘快捷键：1 = AI处理，2 = 转人工，3 = 继续观察
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <ResourcePanel resources={resources} />
              
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
                <h3 className="text-white font-semibold mb-3">操作提示</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span>愤怒情绪、投诉、退款必须转人工</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <span>机器人重复回复或无回复需转人工</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span>资源紧张时非紧急问题先观察</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                    <span>注意脏数据提示，别被空值误导</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {showFeedback && lastFeedback && (
          <FeedbackModal
            isCorrect={lastFeedback.isCorrect}
            scoreChange={lastFeedback.scoreChange}
            details={lastFeedback.details}
            errorType={lastFeedback.errorType}
            onNext={handleNext}
            isLastCard={isLastCard}
          />
        )}
      </div>
    </div>
  );
}
