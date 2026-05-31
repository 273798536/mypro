import { ArrowLeftRight } from 'lucide-react';
import type { RefundRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface DiscountRollbackComparisonProps {
  record: RefundRecord;
}

export default function DiscountRollbackComparison({ record }: DiscountRollbackComparisonProps) {
  if (!record.progress.isManuallyModified || record.changeHistory.length === 0) {
    return null;
  }

  const latestChange = record.changeHistory[record.changeHistory.length - 1];
  const diff = latestChange.discountRollbackAfter - latestChange.discountRollbackBefore;

  const beforeItems = [
    { label: '优惠追回金额', value: formatCurrency(latestChange.discountRollbackBefore) },
    { label: '已消耗课时', value: `${latestChange.previousConsumedHours}课时` },
  ];

  const afterItems = [
    { label: '优惠追回金额', value: formatCurrency(latestChange.discountRollbackAfter) },
    { label: '已消耗课时', value: `${latestChange.newConsumedHours}课时` },
  ];

  return (
    <div className="rounded-lg shadow-sm bg-white p-5">
      <div className="flex items-center gap-2 mb-5">
        <ArrowLeftRight size={18} className="text-[#d4943a]" />
        <h3 className="text-base font-semibold text-[#1a2332]">优惠回滚前后对比</h3>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 text-center">修改前</p>
          {beforeItems.map((item) => (
            <div key={item.label}>
              <span className="text-xs text-gray-400">{item.label}</span>
              <p className="text-sm font-medium text-[#1a2332]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center pt-8">
          <ArrowLeftRight size={20} className="text-[#d4943a]" />
        </div>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400 text-center">修改后</p>
          {afterItems.map((item) => (
            <div key={item.label}>
              <span className="text-xs text-gray-400">{item.label}</span>
              <p className="text-sm font-medium text-[#1a2332]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 bg-amber-50 rounded-lg p-3 flex justify-between items-center">
        <span className="text-sm text-[#1a2332]">差异金额</span>
        <span className="text-base font-bold text-[#d4943a]">{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
      </div>
    </div>
  );
}
