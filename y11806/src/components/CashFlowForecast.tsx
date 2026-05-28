import { useAppStore } from '@/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';

function formatMoney(amount: number): string {
  return `¥${(amount / 10000).toFixed(1)}万`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function CashFlowForecast() {
  const { cashFlow } = useAppStore();

  const chartData = cashFlow.map((item) => ({
    ...item,
    date: formatDate(item.date),
  }));

  const warnings = cashFlow.filter((item) => item.warning);
  const latestBalance = cashFlow[cashFlow.length - 1]?.balance || 0;
  const totalInflow = cashFlow.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = cashFlow.reduce((sum, item) => sum + item.outflow, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-600" />
          现金预测 (未来4周)
        </h3>
        {warnings.length > 0 && (
          <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium flex items-center gap-1">
            <AlertTriangle size={12} />
            {warnings.length} 个预警
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">预计流入</div>
          <div className="text-lg font-bold text-green-600">{formatMoney(totalInflow)}</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">预计流出</div>
          <div className="text-lg font-bold text-red-600">{formatMoney(totalOutflow)}</div>
        </div>
        <div className="p-3 bg-primary-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">期末余额</div>
          <div className={`text-lg font-bold ${latestBalance < 0 ? 'text-red-600' : 'text-primary-600'}`}>
            {formatMoney(latestBalance)}
          </div>
        </div>
      </div>

      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#366ba8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#366ba8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip
              formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="inflow"
              stroke="#10b981"
              fill="url(#inflowGradient)"
              name="流入"
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#366ba8"
              fill="url(#balanceGradient)"
              name="余额"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">⚠️ 风险预警</div>
          {warnings.map((warning) => (
            <div
              key={warning.date}
              className="p-2 bg-red-50 border border-red-200 rounded text-sm"
            >
              <div className="flex items-center gap-1 text-red-700 font-medium">
                <AlertTriangle size={14} />
                {formatDate(warning.date)} 现金流预警
              </div>
              <div className="text-xs text-red-600 mt-1">{warning.warningReason}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1">
        <Wallet size={12} />
        图表数据基于当前账期订单和历史结算规律预测
      </div>
    </div>
  );
}
