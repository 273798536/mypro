import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { GAME_CONFIG } from '@/constants/config';

export const ExchangePanel: React.FC = () => {
  const { exchangeRate, forwardRate, history, round } = useGameStore();

  const rateHistory = [
    { round: 0, rate: GAME_CONFIG.BASE_EXCHANGE_RATE },
    ...history.map(h => ({ round: h.round, rate: h.exchangeRate })),
    { round, rate: exchangeRate },
  ];

  const rateChange = exchangeRate - GAME_CONFIG.BASE_EXCHANGE_RATE;
  const rateChangePercent = (rateChange / GAME_CONFIG.BASE_EXCHANGE_RATE) * 100;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          汇率市场
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">即期汇率 (USD/CNY)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {exchangeRate.toFixed(4)}
              </span>
              <span
                className={`text-sm font-medium flex items-center ${
                  rateChange >= 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {rateChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {rateChange >= 0 ? '+' : ''}
                {rateChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">远期汇率报价</p>
            <span className="text-3xl font-bold text-blue-700">
              {forwardRate.toFixed(4)}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              升水 {((forwardRate - exchangeRate) * 10000).toFixed(0)} 点
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <h4 className="text-sm font-medium text-slate-700 mb-2">汇率走势</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 12 }}
                  tickFormatter={v => (v === 0 ? '初始' : `R${v}`)}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={v => v.toFixed(2)}
                />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(4), '汇率']}
                  labelFormatter={label => (label === 0 ? '初始' : `第 ${label} 回合`)}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>提示：</strong> 汇率每回合随机波动。如果预期未来人民币贬值，可通过远期合约锁定汇率，规避汇率风险。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
