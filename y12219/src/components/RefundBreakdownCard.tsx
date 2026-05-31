import { Calculator } from 'lucide-react';
import type { RefundBreakdown } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface RefundBreakdownCardProps {
  breakdown: RefundBreakdown;
}

export default function RefundBreakdownCard({ breakdown }: RefundBreakdownCardProps) {
  const items = [
    { label: '课时费退款', value: breakdown.courseFeeRefund, negative: false },
    { label: '资料扣费', value: breakdown.materialDeduction, negative: true },
    { label: '优惠追回', value: breakdown.discountRecovery, negative: true },
    { label: '进度调整', value: breakdown.progressAdjustment, negative: false },
  ];

  return (
    <div className="rounded-lg shadow-sm bg-white border-l-4 border-l-emerald-500">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Calculator size={18} className="text-emerald-500" />
        <h3 className="text-base font-semibold text-[#1a2332]">退款拆分</h3>
      </div>
      <div className="p-5 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between">
            <span className="text-sm text-[#1a2332]">{item.label}</span>
            <span className={`text-sm font-medium ${item.negative ? 'text-red-500' : 'text-[#1a2332]'}`}>
              {item.negative && item.value > 0 ? '-' : ''}{formatCurrency(item.value)}
            </span>
          </div>
        ))}
        <div className="border-t border-gray-200 my-2" />
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-[#1a2332]">实退金额</span>
          <span className="text-lg font-bold text-[#d4943a]">{formatCurrency(breakdown.actualRefund)}</span>
        </div>
      </div>
    </div>
  );
}
