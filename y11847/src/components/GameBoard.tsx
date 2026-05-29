import React, { useState } from 'react';
import { GameState, GameStep, Card } from '../types/game';
import { GameCard } from './GameCard';
import { CityStatusPanel } from './CityStatusPanel';
import { AlertPanel } from './AlertPanel';
import { CalcTraceDisplay } from './CalcTraceDisplay';
import { StepHistory } from './StepHistory';

interface GameBoardProps {
  state: GameState;
  onPlayCard: (card: Card) => void;
  onEndRound: () => void;
  onConfirmAlert: (alertId: string) => void;
  onEndGame: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onPlayCard,
  onEndRound,
  onConfirmAlert,
  onEndGame
}) => {
  const [selectedStep, setSelectedStep] = useState<GameStep | null>(
    state.steps[state.steps.length - 1] || null
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🌧️ 城市雨洪调度牌</h1>
            <p className="text-gray-400 text-sm">海绵城市科普卡牌游戏</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-400">回合</div>
              <div className="text-xl font-mono font-bold text-white">
                {state.currentRound} / {state.totalRounds}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">分数</div>
              <div className={`text-xl font-mono font-bold ${
                state.score >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {state.score}
              </div>
            </div>
            <button
              onClick={onEndGame}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              结束游戏
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <CityStatusPanel cityState={state.cityState} />
            <AlertPanel alerts={state.activeAlerts} onConfirm={onConfirmAlert} />
          </div>

          <div className="col-span-6 space-y-6">
            {state.currentRainCard && (
              <div className="bg-gray-800 rounded-lg p-4 border border-blue-500">
                <h3 className="text-sm font-bold text-blue-400 mb-3">🌧️ 当前降雨</h3>
                <div className="flex items-center gap-4">
                  <GameCard card={state.currentRainCard} />
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm mb-4">
                      使用手牌中的调度卡牌来应对本次降雨！
                    </p>
                    <p className="text-xs text-gray-500">
                      提示：你可以打出多张卡牌，每张只能用一次。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <h3 className="text-sm font-bold text-white mb-3">🃏 手牌</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {state.handCards.length === 0 ? (
                  <div className="text-gray-400 text-sm py-8">
                    本回合手牌已用完，点击"结束回合"进入下一轮
                  </div>
                ) : (
                  state.handCards.map((card) => (
                    <GameCard
                      key={card.id}
                      card={card}
                      onClick={() => onPlayCard(card)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={onEndRound}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                ⏭️ 结束回合
              </button>
            </div>
          </div>

          <div className="col-span-3 space-y-6">
            <StepHistory
              steps={state.steps}
              selectedStep={selectedStep}
              onSelectStep={setSelectedStep}
            />
            <div className="h-80">
              <CalcTraceDisplay step={selectedStep} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
