import React, { useState } from 'react';
import { Home, RotateCcw, Download, Play, ChevronDown, ChevronUp, AlertCircle, Trophy, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { SettlementReport } from '../engine/types';
import { useGameStore } from '../store/useGameStore';
import { downloadReplay } from '../engine/replay';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { getRatingColor } from '../engine/replay';
import { formatPnL, getPnLColor } from '../utils/format';

interface SettlementPageProps {
  onGoHome: () => void;
  onPlayAgain: () => void;
  onWatchReplay: () => void;
}

export const SettlementPage: React.FC<SettlementPageProps> = ({
  onGoHome,
  onPlayAgain,
  onWatchReplay,
}) => {
  const { gameState, settlementReport, replayData } = useGameStore();
  const [showTradeDetails, setShowTradeDetails] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);

  if (!settlementReport) return null;

  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const { scoreBreakdown, tradeSummary, riskAnalysis, eventsEncountered, rating, failureReasons } = settlementReport;

  const handleDownloadReplay = () => {
    if (replayData) {
      downloadReplay(replayData);
    }
  };

  const endReasonLabels: Record<string, string> = {
    timeout: '时间结束',
    bankrupt: '资金破产',
    manual: '主动结算',
    force_liquidation: '强制平仓',
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <header className="bg-terminal-panel border-b border-terminal-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">结算报告</h1>
            <p className="text-sm text-gray-400">
              {config.name}难度 · {endReasonLabels[gameState.endReason || 'timeout']}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-terminal-panel border border-terminal-border hover:border-trade-info text-gray-300 hover:text-trade-info flex items-center gap-2 transition-colors"
              onClick={onGoHome}
            >
              <Home size={18} />
              返回主页
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-trade-up hover:bg-trade-up/80 text-white flex items-center gap-2 transition-colors"
              onClick={onPlayAgain}
            >
              <RotateCcw size={18} />
              再来一局
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-terminal-panel rounded-xl border border-terminal-border p-8 text-center">
            <div className="text-8xl font-bold mb-2">
              <span className={getRatingColor(rating)}>{rating}</span>
            </div>
            <div className="text-4xl font-bold font-mono mb-2">
              <span className={getPnLColor(settlementReport.totalScore)}>
                {formatPnL(settlementReport.totalScore)}
              </span>
            </div>
            <p className="text-gray-400">
              目标得分: {config.targetScore}
              <span className="mx-2">·</span>
              完成度: {((settlementReport.totalScore / config.targetScore) * 100).toFixed(1)}%
            </p>
            
            {failureReasons.length > 0 && (
              <div className="mt-4 p-4 bg-trade-down/10 rounded-lg border border-trade-down/30 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2 text-trade-down font-semibold mb-2">
                  <AlertCircle size={18} />
                  需要改进的地方
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  {failureReasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-trade-up" />
                盈亏分解
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400 flex items-center gap-2">
                    <TrendingUp size={16} className="text-trade-up" />
                    已实现盈亏
                  </span>
                  <span className={`font-mono font-semibold ${getPnLColor(scoreBreakdown.realizedPnL)}`}>
                    {formatPnL(scoreBreakdown.realizedPnL)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400 flex items-center gap-2">
                    <TrendingDown size={16} className="text-trade-warn" />
                    未实现盈亏
                  </span>
                  <span className={`font-mono font-semibold ${getPnLColor(scoreBreakdown.unrealizedPnL)}`}>
                    {formatPnL(scoreBreakdown.unrealizedPnL)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400">手续费</span>
                  <span className={`font-mono font-semibold ${
                    riskAnalysis.feeToProfitRatio > 0.5 ? 'text-trade-down animate-pulse' : 'text-trade-down'
                  }`}>
                    {scoreBreakdown.fees.toFixed(2)}
                    {riskAnalysis.feeToProfitRatio > 0.5 && (
                      <span className="text-xs ml-1">(占利润{(riskAnalysis.feeToProfitRatio * 100).toFixed(0)}%)</span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400">库存惩罚</span>
                  <span className="font-mono font-semibold text-trade-down">
                    {scoreBreakdown.inventoryPenalty.toFixed(2)}
                  </span>
                </div>
                
                {scoreBreakdown.eventBonus !== 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-terminal-border">
                    <span className="text-gray-400">事件奖励</span>
                    <span className="font-mono font-semibold text-trade-up">
                      +{scoreBreakdown.eventBonus.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between py-3 bg-terminal-bg rounded-lg px-3 mt-2">
                  <span className="text-white font-semibold">总得分</span>
                  <span className={`text-xl font-bold font-mono ${getPnLColor(settlementReport.totalScore)}`}>
                    {formatPnL(settlementReport.totalScore)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy size={20} className="text-trade-warn" />
                  交易统计
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-terminal-bg rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">总成交笔数</div>
                    <div className="text-2xl font-bold text-white font-mono">{tradeSummary.totalTrades}</div>
                  </div>
                  <div className="bg-terminal-bg rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">买卖比</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {tradeSummary.buyTrades}:{tradeSummary.sellTrades}
                    </div>
                  </div>
                  <div className="bg-terminal-bg rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">平均价差</div>
                    <div className="text-2xl font-bold text-trade-up font-mono">
                      {tradeSummary.avgSpread.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-terminal-bg rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">库存超标次数</div>
                    <div className={`text-2xl font-bold font-mono ${
                      riskAnalysis.inventoryViolations > 10 ? 'text-trade-down' : 'text-white'
                    }`}>
                      {riskAnalysis.inventoryViolations}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">操作</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="py-3 rounded-lg bg-trade-event hover:bg-trade-event/80 text-white flex items-center justify-center gap-2 transition-colors"
                    onClick={onWatchReplay}
                  >
                    <Play size={18} />
                    观看回放
                  </button>
                  <button
                    className="py-3 rounded-lg bg-terminal-bg hover:bg-gray-700 text-gray-300 flex items-center justify-center gap-2 transition-colors border border-terminal-border"
                    onClick={handleDownloadReplay}
                    disabled={!replayData}
                  >
                    <Download size={18} />
                    导出回放
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-terminal-panel rounded-xl border border-terminal-border overflow-hidden">
            <button
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              onClick={() => setShowTradeDetails(!showTradeDetails)}
            >
              <h2 className="text-lg font-semibold text-white">交易明细 ({gameState.tradeHistory.length}笔)</h2>
              {showTradeDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showTradeDetails && (
              <div className="border-t border-terminal-border">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-terminal-bg sticky top-0">
                      <tr className="text-gray-400 text-left">
                        <th className="px-4 py-2">时间</th>
                        <th className="px-4 py-2">方向</th>
                        <th className="px-4 py-2">价格</th>
                        <th className="px-4 py-2">数量</th>
                        <th className="px-4 py-2">手续费</th>
                        <th className="px-4 py-2 text-right">盈亏贡献</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameState.tradeHistory.map((trade, idx) => (
                        <tr key={trade.id} className="border-t border-terminal-border/50 hover:bg-white/5">
                          <td className="px-4 py-2 text-gray-400 font-mono text-xs">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-2">
                            <span className={trade.side === 'buy' ? 'text-trade-up' : 'text-trade-down'}>
                              {trade.side === 'buy' ? '买入' : '卖出'}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-white">{trade.price.toFixed(2)}</td>
                          <td className="px-4 py-2 font-mono text-gray-300">{trade.quantity}</td>
                          <td className="px-4 py-2 font-mono text-trade-down">{trade.fee.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-right font-mono ${getPnLColor(trade.pnlContribution)}`}>
                            {formatPnL(trade.pnlContribution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {eventsEncountered.length > 0 && (
            <div className="bg-terminal-panel rounded-xl border border-terminal-border overflow-hidden">
              <button
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                onClick={() => setShowEventDetails(!showEventDetails)}
              >
                <h2 className="text-lg font-semibold text-white">事件回顾 ({eventsEncountered.length}个)</h2>
                {showEventDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {showEventDetails && (
                <div className="border-t border-terminal-border p-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    {eventsEncountered.map((event) => (
                      <div key={event.id} className="bg-terminal-bg rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold text-sm ${
                            event.severity === 'critical' ? 'text-trade-down' :
                            event.severity === 'warning' ? 'text-trade-warn' : 'text-trade-info'
                          }`}>
                            {event.type === 'price_jump' ? '价格跳空' :
                             event.type === 'liquidity_crisis' ? '流动性枯竭' :
                             event.type === 'fee_change' ? '手续费调整' : '波动率上升'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{event.message}</p>
                        {event.effect.priceChange && (
                          <p className={`text-xs mt-1 ${event.effect.priceChange > 0 ? 'text-trade-up' : 'text-trade-down'}`}>
                            价格变动: {event.effect.priceChange > 0 ? '+' : ''}{event.effect.priceChange.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
