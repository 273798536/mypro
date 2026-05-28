import { useAppStore } from '@/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, Info } from 'lucide-react';
import { useState } from 'react';

function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

const COLORS = ['#366ba8', '#f97316'];

export function FeeBreakdown() {
  const { feeBreakdown, selectedPeriodId } = useAppStore();
  const [showExplanation, setShowExplanation] = useState(false);

  if (!selectedPeriodId || !feeBreakdown) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <PieChartIcon size={18} className="text-primary-600" />
          扣费拆解
        </h3>
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          请选择账期查看费用分析
        </div>
      </div>
    );
  }

  const pieData = [
    { name: '平台扣点', value: feeBreakdown.platformFee },
    { name: '广告扣费', value: feeBreakdown.adFee },
  ];

  const totalFee = feeBreakdown.platformFee + feeBreakdown.adFee;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <PieChartIcon size={18} className="text-primary-600" />
          扣费拆解
        </h3>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-gray-400 hover:text-primary-500 transition-colors"
        >
          <Info size={16} />
        </button>
      </div>

      {showExplanation && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <div className="font-medium mb-1">📊 数据说明</div>
          {feeBreakdown.explanation}
        </div>
      )}

      <div className="h-36 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [formatMoney(value), '']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }} />
            <span className="text-sm text-gray-600">平台扣点</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">
              {formatMoney(feeBreakdown.platformFee)}
            </div>
            <div className="text-xs text-gray-400">
              {feeBreakdown.platformFeeRatio.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }} />
            <span className="text-sm text-gray-600">广告扣费</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">
              {formatMoney(feeBreakdown.adFee)}
            </div>
            <div className="text-xs text-gray-400">{feeBreakdown.adFeeRatio.toFixed(1)}%</div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">费用合计</span>
          <span className="font-bold text-gray-800">{formatMoney(totalFee)}</span>
        </div>
      </div>
    </div>
  );
}
