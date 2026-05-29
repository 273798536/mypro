import { useGameStore } from '@/store/useGameStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export default function PositionPanel() {
  const { gameState, industryCards, getIndustryWeight, getTotalAssets } = useGameStore();

  if (!gameState) return null;

  const totalAssets = getTotalAssets();
  const availableCash = gameState.availableCash;

  const positionData = gameState.positions.map((pos, idx) => {
    const industry = industryCards.find((c) => c.id === pos.industryCardId);
    const weight = getIndustryWeight(pos.industryCardId);
    const returnRate = pos.cost > 0 ? ((pos.currentValue - pos.cost) / pos.cost) * 100 : 0;
    const isOverweight = weight > 0.3;

    return {
      id: pos.industryCardId,
      name: industry?.name || '未知行业',
      sector: industry?.sector || '-',
      riskLevel: industry?.riskLevel || 'medium',
      manager: industry?.manager || '-',
      weight,
      weightPercent: (weight * 100).toFixed(1),
      currentValue: pos.currentValue,
      cost: pos.cost,
      returnRate,
      color: COLORS[idx % COLORS.length],
      isOverweight,
      shares: pos.shares,
    };
  });

  const pieData = [
    ...positionData.map((p) => ({ name: p.name, value: p.currentValue, color: p.color })),
    { name: '可用现金', value: availableCash, color: '#9ca3af' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            市值: ¥{payload[0].value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            占比: {((payload[0].value / totalAssets) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-primary-600 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          持仓概览
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-500">总资产</p>
          <p className="text-2xl font-mono font-bold text-primary-600">
            ¥{totalAssets.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3">仓位分布</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-2">
          <h4 className="text-sm font-medium text-gray-600 sticky top-0 bg-white py-1 z-10">
            持仓明细
          </h4>
          {positionData.map((pos, idx) => (
            <div
              key={pos.id}
              className={cn(
                'p-4 rounded-lg border transition-all animate-slide-up',
                pos.isOverweight
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-100 bg-gray-50 hover:border-primary-200 hover:bg-primary-50'
              )}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{pos.name}</span>
                    <span
                      className={cn(
                        'risk-badge',
                        RISK_COLORS[pos.riskLevel as keyof typeof RISK_COLORS]
                      )}
                    >
                      {RISK_LABELS[pos.riskLevel as keyof typeof RISK_LABELS]}
                    </span>
                    {pos.isOverweight && (
                      <span className="risk-badge bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        超配
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pos.sector} · 经理: {pos.manager}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-gray-800">
                    ¥{pos.currentValue.toLocaleString()}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-mono',
                      pos.returnRate >= 0 ? 'text-accent-profit' : 'text-accent-loss'
                    )}
                  >
                    {pos.returnRate >= 0 ? '+' : ''}
                    {pos.returnRate.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">仓位占比</span>
                  <span className="font-mono font-medium">{pos.weightPercent}%</span>
                </div>
                <div className="industry-bar bg-gray-200">
                  <div
                    className={cn(
                      'h-full rounded-lg transition-all duration-500',
                      pos.isOverweight ? 'bg-red-400' : ''
                    )}
                    style={{
                      width: `${Math.min(pos.weight * 100 * 2, 100)}%`,
                      backgroundColor: pos.isOverweight ? undefined : pos.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>成本: ¥{pos.cost.toLocaleString()}</span>
                  <span>份额: {pos.shares.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="p-4 rounded-lg border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">可用现金</span>
              </div>
              <span className="font-mono font-bold text-gray-800">
                ¥{availableCash.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
