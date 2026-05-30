import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { X, Download, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatTime, exportToJSON, exportToCSV, downloadFile } from '@/utils/finance';

export const ReviewPanel: React.FC = () => {
  const {
    showReview,
    toggleReview,
    score,
    currentRate,
    totalDuration,
    totalCashflow,
    rateEvents,
    settlements,
    cashflowMisses,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'events' | 'settlements' | 'misses'>('events');

  const handleExportJSON = () => {
    const data = {
      exportTime: new Date().toISOString(),
      finalScore: score,
      finalRate: currentRate,
      finalDuration: totalDuration,
      totalCashflow,
      rateEvents,
      settlements,
      cashflowMisses,
    };
    const content = exportToJSON(data);
    downloadFile(content, '债券久期弹球成绩单.json', 'application/json');
  };

  const handleExportCSV = () => {
    const headers = ['时间', '类型', '详情', '数值变动', '公式'];
    const rows: (string | number)[][] = [];

    rateEvents.forEach((event) => {
      rows.push([
        formatTime(event.timestamp),
        `利率变动${event.isConsecutiveJump ? '(连跳)' : ''}`,
        event.formula,
        event.rateChange > 0 ? `+${event.rateChange.toFixed(2)}%` : `${event.rateChange.toFixed(2)}%`,
        `利率${event.rateBefore.toFixed(2)}%→${event.rateAfter.toFixed(2)}%`,
      ]);
    });

    settlements.forEach((s) => {
      rows.push([
        formatTime(s.timestamp),
        '久期结算',
        `债券${s.bondId}`,
        s.priceChange.toFixed(4) + '%',
        `价格变动 = -${s.initialDuration.toFixed(2)} × ${s.rateChange.toFixed(2)}%`,
      ]);
    });

    cashflowMisses.forEach((miss) => {
      rows.push([
        formatTime(miss.timestamp),
        '现金流漏计',
        `道具${miss.itemId}`,
        `-${miss.missedAmount}`,
        miss.correctionSteps.join('; '),
      ]);
    });

    const content = exportToCSV(headers, rows);
    downloadFile(content, '债券久期弹球成绩单.csv', 'text/csv');
  };

  if (!showReview) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" style={{ border: '2px solid #D4AF37' }}>
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <h2 className="text-2xl font-bold" style={{ color: '#D4AF37', fontFamily: 'Playfair Display, serif' }}>
            复盘分析面板
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-700"
              style={{ border: '1px solid #D4AF37' }}
            >
              <Download className="w-4 h-4" />
              导出JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: '#D4AF37', color: '#0A2463' }}
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
            <button
              onClick={toggleReview}
              className="p-2 rounded-lg hover:bg-gray-700 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-5 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: '#D4AF37' }}>{score}</div>
              <div className="text-sm text-gray-400 mt-1">最终得分</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{currentRate.toFixed(2)}%</div>
              <div className="text-sm text-gray-400 mt-1">最终利率</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{totalDuration.toFixed(2)}年</div>
              <div className="text-sm text-gray-400 mt-1">最终久期</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">¥{totalCashflow}</div>
              <div className="text-sm text-gray-400 mt-1">现金流总额</div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${activeTab === 'events' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            利率事件 ({rateEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${activeTab === 'settlements' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            久期结算 ({settlements.length})
          </button>
          <button
            onClick={() => setActiveTab('misses')}
            className={`flex-1 py-3 px-4 font-medium transition-all ${activeTab === 'misses' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            现金流漏计 ({cashflowMisses.length})
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-96">
          {activeTab === 'events' && (
            <div className="space-y-3">
              {rateEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">暂无利率事件记录</div>
              ) : (
                rateEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="bg-gray-800 rounded-xl p-4 transition-all hover:bg-gray-750"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: event.rateChange > 0 ? 'rgba(231, 76, 60, 0.2)' : 'rgba(39, 174, 96, 0.2)' }}
                        >
                          {event.rateChange > 0 ? (
                            <TrendingUp className="w-5 h-5 text-red-400" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            利率变动 #{index + 1}
                            {event.isConsecutiveJump && (
                              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
                                ⚡ 连跳{event.jumpCount}次
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{formatTime(event.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${event.rateChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {event.rateChange > 0 ? '+' : ''}{event.rateChange.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          {event.rateBefore.toFixed(2)}% → {event.rateAfter.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg text-sm font-mono">
                      <span className="text-gray-500">计算公式: </span>
                      <span className="text-yellow-400">{event.formula}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settlements' && (
            <div className="space-y-3">
              {settlements.length === 0 ? (
                <div className="text-center text-gray-500 py-8">暂无久期结算记录</div>
              ) : (
                settlements.map((s, index) => (
                  <div
                    key={s.id}
                    className="bg-gray-800 rounded-xl p-4 transition-all hover:bg-gray-750"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: s.isDirectionCorrect ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)' }}
                        >
                          {s.isDirectionCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">久期结算 #{index + 1}</div>
                          <div className="text-xs text-gray-500">{formatTime(s.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${s.priceChange < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          价格变动: {s.priceChange.toFixed(4)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          久期: {s.initialDuration.toFixed(2)} → {s.finalDuration.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg text-sm">
                      <div className="font-mono">
                        <span className="text-gray-500">公式: </span>
                        <span className="text-blue-400">价格变动% = -修正久期 × 利率变动</span>
                      </div>
                      <div className="font-mono mt-1">
                        <span className="text-gray-500">计算: </span>
                        <span className="text-yellow-400">
                          -{s.initialDuration.toFixed(2)} × {s.rateChange.toFixed(2)}% = {s.priceChange.toFixed(4)}%
                        </span>
                      </div>
                    </div>
                    {!s.isDirectionCorrect && s.correctionSuggestion && (
                      <div className="mt-3 p-3 bg-red-900 bg-opacity-30 rounded-lg text-sm text-red-300 border border-red-700">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        {s.correctionSuggestion}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'misses' && (
            <div className="space-y-3">
              {cashflowMisses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  暂无现金流漏计，表现优秀！
                </div>
              ) : (
                cashflowMisses.map((miss, index) => (
                  <div
                    key={miss.id}
                    className="bg-gray-800 rounded-xl p-4 border border-red-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-900 bg-opacity-50">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <div className="font-medium text-red-400">漏计 #{index + 1}</div>
                          <div className="text-xs text-gray-500">{formatTime(miss.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-400">-¥{miss.missedAmount}</div>
                        <div className="text-sm text-gray-400">道具ID: {miss.itemId.slice(0, 8)}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-400 mb-2">修正步骤:</div>
                      <ol className="space-y-1">
                        {miss.correctionSteps.map((step, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-yellow-400 font-bold">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
