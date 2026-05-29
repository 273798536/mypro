import { useGameStore } from '@/store/useGameStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { List, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

const ACTION_COLORS: Record<string, string> = {
  buy: '#10b981',
  sell: '#e63946',
  hold: '#6b7280',
};

const ACTION_LABELS: Record<string, string> = {
  buy: '加仓',
  sell: '减仓',
  hold: '持有',
};

const ACTION_ICONS: Record<string, any> = {
  buy: TrendingUp,
  sell: TrendingDown,
  hold: Minus,
};

export default function DecisionAnalysis() {
  const { gameState, industryCards, newsEvents } = useGameStore();

  if (!gameState) return null;

  const decisionDetails = gameState.decisions.map((decision, idx) => {
    const industry = industryCards.find((c) => c.id === decision.industryCardId);
    const news = newsEvents.find((n) => n.id === decision.newsEventId);
    const historyPoint = gameState.netValueHistory.find(
      (h) => h.decisionId === decision.id
    );
    const prevPoint = gameState.netValueHistory[idx];
    const riskEvent = gameState.riskEvents.find((r) => r.round === decision.round);

    const valueChange = historyPoint && prevPoint ? historyPoint.value - prevPoint.value : 0;
    const changePercent =
      prevPoint && prevPoint.value > 0
        ? ((valueChange / prevPoint.value) * 100).toFixed(2)
        : '0.00';

    return {
      round: decision.round,
      industry: industry?.name || '未知行业',
      action: decision.actionType,
      actionLabel: ACTION_LABELS[decision.actionType],
      amount: decision.amount,
      news: news?.title || '-',
      valueChange: Number(valueChange.toFixed(2)),
      changePercent,
      isProfit: valueChange >= 0,
      hasRisk: !!riskEvent,
      riskPenalty: riskEvent?.penalty || 0,
      riskType: riskEvent?.type || '',
      riskDescription: riskEvent?.description || '',
    };
  });

  const chartData = decisionDetails.map((d) => ({
    round: `第${d.round}回合`,
    value: d.valueChange,
    action: d.action,
    industry: d.industry,
    isProfit: d.isProfit,
  }));

  const totalBuyDecisions = decisionDetails.filter((d) => d.action === 'buy').length;
  const totalSellDecisions = decisionDetails.filter((d) => d.action === 'sell').length;
  const totalHoldDecisions = decisionDetails.filter((d) => d.action === 'hold').length;
  const profitableDecisions = decisionDetails.filter((d) => d.isProfit).length;
  const totalRiskEvents = gameState.riskEvents.length;
  const totalPenalty = gameState.riskEvents.reduce((sum, r) => sum + r.penalty, 0);

  const winRate =
    decisionDetails.length > 0
      ? ((profitableDecisions / decisionDetails.length) * 100).toFixed(1)
      : '0.0';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-800">{data.round}</p>
          <p className="text-sm text-gray-600">{data.industry}</p>
          <p
            className={cn(
              'font-mono font-bold text-lg',
              data.isProfit ? 'text-accent-profit' : 'text-accent-loss'
            )}
          >
            {data.isProfit ? '+' : ''}
            {data.value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <h3 className="text-xl font-bold text-primary-600 mb-6 flex items-center gap-2">
        <List className="w-6 h-6" />
        决策分析
      </h3>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="stat-card from-green-50 to-emerald-50 border border-green-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">加仓次数</span>
          </div>
          <p className="text-3xl font-mono font-bold text-green-700">
            {totalBuyDecisions}
          </p>
        </div>
        <div className="stat-card from-red-50 to-rose-50 border border-red-100">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-medium">减仓次数</span>
          </div>
          <p className="text-3xl font-mono font-bold text-red-700">
            {totalSellDecisions}
          </p>
        </div>
        <div className="stat-card from-gray-50 to-slate-50 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Minus className="w-4 h-4" />
            <span className="text-sm font-medium">持有次数</span>
          </div>
          <p className="text-3xl font-mono font-bold text-gray-700">
            {totalHoldDecisions}
          </p>
        </div>
        <div className="stat-card from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">胜率</span>
          </div>
          <p className="text-3xl font-mono font-bold text-blue-700">{winRate}%</p>
        </div>
        <div className="stat-card from-orange-50 to-amber-50 border border-orange-100">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">风险事件</span>
          </div>
          <p className="text-3xl font-mono font-bold text-orange-700">
            {totalRiskEvents}
            <span className="text-lg ml-1">(-{totalPenalty}分)</span>
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-600 mb-3">各回合收益</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="round"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={800}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isProfit ? '#10b981' : '#e63946'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">决策明细</h4>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  回合
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  行业
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  净值变化
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  风险事件
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {decisionDetails.map((detail, idx) => {
                const IconComponent = ACTION_ICONS[detail.action];
                return (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors animate-slide-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-800">
                        第 {detail.round} 回合
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-700">{detail.industry}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          detail.action === 'buy' && 'bg-green-100 text-green-700',
                          detail.action === 'sell' && 'bg-red-100 text-red-700',
                          detail.action === 'hold' && 'bg-gray-100 text-gray-700'
                        )}
                      >
                        <IconComponent className="w-3 h-3" />
                        {detail.actionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-gray-700">
                      {detail.amount > 0 ? `¥${detail.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          detail.isProfit ? 'text-accent-profit' : 'text-accent-loss'
                        )}
                      >
                        {detail.isProfit ? '+' : ''}
                        {detail.changePercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {detail.hasRisk ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          -{detail.riskPenalty}分
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
