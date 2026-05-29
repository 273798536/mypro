import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { TrendingUp, TrendingDown, Pause, ArrowRight, Calculator, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function DecisionPanel() {
  const navigate = useNavigate();
  const {
    gameState,
    getCurrentNews,
    getPositionByIndustryId,
    makeDecision,
    nextRound,
    finishCurrentGame,
    lastDecisionResult,
    currentRiskEvents,
    clearLastResult,
  } = useGameStore();

  const [action, setAction] = useState<'buy' | 'sell' | 'hold'>('hold');
  const [amount, setAmount] = useState(50000);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!gameState) return null;

  const news = getCurrentNews();
  const position = news ? getPositionByIndustryId(news.industryCardId) : null;
  const hasMadeDecision = gameState.decisions.some(
    (d) => d.round === gameState.currentRound
  );
  const isLastRound = gameState.currentRound >= gameState.totalRounds;

  const maxBuy = Math.min(gameState.availableCash * 0.5, 200000);
  const maxSell = position ? Math.min(position.currentValue * 0.5, 200000) : 0;

  const handleMakeDecision = () => {
    if (!news) return;

    setIsProcessing(true);
    clearLastResult();

    setTimeout(() => {
      const tradeAmount = action === 'hold' ? 0 : amount;
      const result = makeDecision(news.id, action, tradeAmount);

      setIsProcessing(false);

      if (!result.success) {
        alert(result.message);
      }
    }, 500);
  };

  const handleNextRound = () => {
    if (isLastRound) {
      finishCurrentGame();
      navigate('/report');
    } else {
      nextRound();
      setAction('hold');
      setAmount(50000);
      clearLastResult();
    }
  };

  const estimatedFee = action !== 'hold' ? amount * gameState.transactionFeeRate : 0;
  const totalCost = action === 'buy' ? amount + estimatedFee : amount - estimatedFee;

  const riskBudgetPercent = (gameState.riskScore / gameState.riskBudget) * 100;
  const riskBudgetColor =
    riskBudgetPercent >= 70
      ? 'bg-green-500'
      : riskBudgetPercent >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-primary-600 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          投资决策
        </h3>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-gray-500">当前回合</p>
            <p className="text-xl font-mono font-bold text-primary-600">
              {gameState.currentRound} / {gameState.totalRounds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">风险评分</p>
            <p
              className={cn(
                'text-xl font-mono font-bold',
                riskBudgetPercent >= 70
                  ? 'text-accent-profit'
                  : riskBudgetPercent >= 40
                  ? 'text-accent-warning'
                  : 'text-accent-loss'
              )}
            >
              {gameState.riskScore} / {gameState.riskBudget}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">风险预算</span>
          <span className="text-gray-600">{riskBudgetPercent.toFixed(0)}%</span>
        </div>
        <div className="progress-bar h-3">
          <div
            className={cn('progress-fill', riskBudgetColor)}
            style={{ width: `${Math.max(riskBudgetPercent, 5)}%` }}
          />
        </div>
      </div>

      {lastDecisionResult && (
        <div
          className={cn(
            'p-4 rounded-lg mb-4 animate-slide-down flex items-start gap-3',
            lastDecisionResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          )}
        >
          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p
              className={cn(
                'font-medium',
                lastDecisionResult.success ? 'text-green-800' : 'text-red-800'
              )}
            >
              {lastDecisionResult.message}
            </p>
            {lastDecisionResult.riskEvents.length > 0 && (
              <div className="mt-2 space-y-2">
                {lastDecisionResult.riskEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-100/50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        风险事件: -{event.penalty} 分
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {hasMadeDecision ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-gray-800 mb-2">本回合决策已完成</p>
          <p className="text-gray-500 mb-6">点击下方按钮进入下一回合</p>
          <button
            onClick={handleNextRound}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLastRound ? '查看结算报告' : '进入下一回合'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择操作
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setAction('buy')}
                disabled={isProcessing}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                  action === 'buy'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                )}
              >
                <TrendingUp
                  className={cn(
                    'w-8 h-8',
                    action === 'buy' ? 'text-green-600' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    action === 'buy' ? 'text-green-700' : 'text-gray-600'
                  )}
                >
                  加仓
                </span>
              </button>
              <button
                onClick={() => setAction('hold')}
                disabled={isProcessing}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                  action === 'hold'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                )}
              >
                <Pause
                  className={cn(
                    'w-8 h-8',
                    action === 'hold' ? 'text-gray-600' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    action === 'hold' ? 'text-gray-700' : 'text-gray-600'
                  )}
                >
                  持有
                </span>
              </button>
              <button
                onClick={() => setAction('sell')}
                disabled={isProcessing || !position || position.currentValue <= 0}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                  action === 'sell'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50',
                  (!position || position.currentValue <= 0) &&
                    'opacity-50 cursor-not-allowed'
                )}
              >
                <TrendingDown
                  className={cn(
                    'w-8 h-8',
                    action === 'sell' ? 'text-red-600' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    action === 'sell' ? 'text-red-700' : 'text-gray-600'
                  )}
                >
                  减仓
                </span>
              </button>
            </div>
          </div>

          {action !== 'hold' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    交易金额
                  </label>
                  <span className="text-sm text-gray-500">
                    {action === 'buy'
                      ? `最大可买: ¥${maxBuy.toLocaleString()}`
                      : `最大可卖: ¥${maxSell.toLocaleString()}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max={action === 'buy' ? maxBuy : maxSell}
                  step="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">¥10,000</span>
                  <span className="text-2xl font-mono font-bold text-primary-600">
                    ¥{amount.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    ¥{(action === 'buy' ? maxBuy : maxSell).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">预计手续费</p>
                  <p className="text-lg font-mono font-bold text-gray-700">
                    ¥{estimatedFee.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {action === 'buy' ? '总支出' : '实际到账'}
                  </p>
                  <p
                    className={cn(
                      'text-lg font-mono font-bold',
                      action === 'buy' ? 'text-accent-loss' : 'text-accent-profit'
                    )}
                  >
                    ¥{totalCost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {action === 'hold' && (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <Pause className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">选择持有观望，不进行任何交易</p>
            </div>
          )}

          <button
            onClick={handleMakeDecision}
            disabled={isProcessing || !news}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all',
              action === 'buy'
                ? 'btn-success'
                : action === 'sell'
                ? 'btn-danger'
                : 'btn-secondary',
              isProcessing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                处理中...
              </>
            ) : (
              <>
                {action === 'buy' && <TrendingUp className="w-5 h-5" />}
                {action === 'sell' && <TrendingDown className="w-5 h-5" />}
                {action === 'hold' && <Pause className="w-5 h-5" />}
                确认{action === 'buy' ? '加仓' : action === 'sell' ? '减仓' : '持有'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
