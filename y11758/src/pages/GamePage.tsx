import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CardGrid } from '@/components/game/CardGrid';
import { ClueBoard } from '@/components/game/ClueBoard';
import { OperationBar } from '@/components/game/OperationBar';
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { LEVELS } from '@/config/levels';

export const GamePage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const {
    cards,
    selectedCardIds,
    riskLabels,
    phase,
    levelId: currentLevelId,
    startGame,
    selectCard,
    deselectCard,
    toggleRiskLabel,
    submitAudit,
  } = useGameStore();

  useTimer();
  const { detectedAnomalies } = useAnomalyDetection();

  const levelConfig = LEVELS.find(l => l.id === levelId);

  useEffect(() => {
    if (levelId && (!currentLevelId || currentLevelId !== levelId)) {
      startGame(levelId);
    }
  }, [levelId, currentLevelId, startGame]);

  useEffect(() => {
    if (phase === 'submitted') {
      navigate(`/result/${useGameStore.getState().gameId}`);
    }
  }, [phase, navigate]);

  const handleCardClick = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      deselectCard(cardId);
    } else {
      selectCard(cardId);
    }
  };

  const invoiceCards = useMemo(
    () => cards.filter(c => c.type === 'invoice'),
    [cards]
  );
  const customerCards = useMemo(
    () => cards.filter(c => c.type === 'customer'),
    [cards]
  );
  const paymentCards = useMemo(
    () => cards.filter(c => c.type === 'payment'),
    [cards]
  );

  const selectedCards = useMemo(
    () => cards.filter(c => c.isSelected),
    [cards]
  );

  if (!levelConfig) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">关卡不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{levelConfig.name}</h1>
                <p className="text-slate-400 text-sm">{levelConfig.description}</p>
              </div>
            </div>
            <div className="text-slate-400 text-sm">
              难度:
              <span
                className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  levelConfig.difficulty === 'easy'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : levelConfig.difficulty === 'medium'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {levelConfig.difficulty === 'easy' ? '简单' : levelConfig.difficulty === 'medium' ? '中等' : '困难'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            <CardGrid
              title="发票"
              cards={invoiceCards}
              onCardClick={handleCardClick}
              type="invoice"
            />
            <CardGrid
              title="客户"
              cards={customerCards}
              onCardClick={handleCardClick}
              type="customer"
            />
            <CardGrid
              title="付款记录"
              cards={paymentCards}
              onCardClick={handleCardClick}
              type="payment"
            />
          </div>

          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <ClueBoard
                selectedCards={selectedCards}
                onRemoveCard={deselectCard}
                detectedAnomalies={detectedAnomalies}
              />
            </div>
          </div>
        </div>
      </div>

      <OperationBar
        timeLeft={useGameStore.getState().timeLeft}
        totalTime={levelConfig.timeLimit}
        riskLabels={riskLabels}
        onToggleLabel={toggleRiskLabel}
        onSubmit={submitAudit}
        selectedCount={selectedCardIds.length}
      />
    </div>
  );
};
