import React, { useState } from 'react';
import { Home, Trophy, Download, Play, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { GameRecord, Difficulty } from '../engine/types';
import { getGameRecords, clearGameRecords, downloadRecords } from '../utils/storage';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { formatDate, getPnLColor, formatPnL } from '../utils/format';

interface LeaderboardPageProps {
  onGoHome: () => void;
  onWatchReplay: (record: GameRecord) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onGoHome, onWatchReplay }) => {
  const [records, setRecords] = useState<GameRecord[]>(getGameRecords());
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const filteredRecords = filterDifficulty === 'all'
    ? records
    : records.filter(r => r.difficulty === filterDifficulty);

  const sortedRecords = [...filteredRecords].sort((a, b) => b.score - a.score);

  const handleClearRecords = () => {
    clearGameRecords();
    setRecords([]);
    setShowConfirmClear(false);
  };

  const handleExportRecords = () => {
    downloadRecords();
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
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
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              onClick={onGoHome}
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-trade-warn" size={24} />
                排行榜
              </h1>
              <p className="text-sm text-gray-400">共 {records.length} 条记录</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:border-trade-info"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'all')}
            >
              <option value="all">全部难度</option>
              {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            
            <button
              className="px-4 py-2 rounded-lg bg-terminal-panel border border-terminal-border hover:border-trade-info text-gray-300 hover:text-trade-info flex items-center gap-2 transition-colors"
              onClick={handleExportRecords}
              disabled={records.length === 0}
            >
              <Download size={18} />
              导出
            </button>
            
            <button
              className="px-4 py-2 rounded-lg bg-trade-down/20 hover:bg-trade-down/30 text-trade-down flex items-center gap-2 transition-colors"
              onClick={() => setShowConfirmClear(true)}
              disabled={records.length === 0}
            >
              <Trash2 size={18} />
              清空
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {sortedRecords.length === 0 ? (
            <div className="text-center py-16">
              <Trophy size={64} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">暂无记录</h3>
              <p className="text-gray-500 mb-6">开始游戏后，你的成绩会显示在这里</p>
              <button
                className="px-6 py-3 rounded-lg bg-trade-up hover:bg-trade-up/80 text-white font-semibold transition-colors"
                onClick={onGoHome}
              >
                去玩游戏
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecords.map((record, index) => {
                const config = DIFFICULTY_CONFIGS[record.difficulty];
                const isExpanded = expandedRecord === record.id;
                
                return (
                  <div
                    key={record.id}
                    className="bg-terminal-panel rounded-xl border border-terminal-border overflow-hidden"
                  >
                    <button
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl w-10 text-center">{getRankBadge(index)}</span>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold font-mono ${getPnLColor(record.score)}`}>
                              {formatPnL(record.score)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                              {config.name}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(record.startTime)} · {endReasonLabels[record.endReason] || record.endReason}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-gray-400">已实现盈亏</div>
                          <div className={`font-mono ${getPnLColor(record.realizedPnL)}`}>
                            {formatPnL(record.realizedPnL)}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-400">成交笔数</div>
                          <div className="font-mono text-white">{record.tradeCount}</div>
                        </div>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-terminal-border p-4 bg-terminal-bg/50">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="bg-terminal-panel rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">已实现盈亏</div>
                            <div className={`font-mono font-bold ${getPnLColor(record.realizedPnL)}`}>
                              {formatPnL(record.realizedPnL)}
                            </div>
                          </div>
                          <div className="bg-terminal-panel rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">总手续费</div>
                            <div className="font-mono font-bold text-trade-down">
                              -{record.totalFees.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-terminal-panel rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">库存惩罚</div>
                            <div className="font-mono font-bold text-trade-down">
                              -{record.inventoryPenalty.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-terminal-panel rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">交易次数</div>
                            <div className="font-mono font-bold text-white">
                              {record.tradeCount}
                            </div>
                          </div>
                        </div>
                        
                        {record.replayData && (
                          <button
                            className="px-4 py-2 rounded-lg bg-trade-event hover:bg-trade-event/80 text-white text-sm flex items-center gap-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWatchReplay(record);
                            }}
                          >
                            <Play size={16} />
                            观看回放
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6 w-96">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-trade-down/20 flex items-center justify-center">
                <Trash2 className="text-trade-down" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">确认清空？</h2>
                <p className="text-sm text-gray-400">所有记录将被永久删除</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 py-3 rounded-lg bg-terminal-bg hover:bg-gray-700 text-gray-300 font-semibold transition-colors border border-terminal-border"
                onClick={() => setShowConfirmClear(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 rounded-lg bg-trade-down hover:bg-trade-down/80 text-white font-semibold transition-colors"
                onClick={handleClearRecords}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
