import { Ticket } from 'lucide-react';
import type { Coupon } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CouponCardProps {
  coupon: Coupon;
}

const statusColors: Record<Coupon['recoveryStatus'], string> = {
  '待追回': 'bg-red-50 text-[#ef4444]',
  '已追回': 'bg-emerald-50 text-[#10b981]',
  '无需追回': 'bg-gray-100 text-[#6b7280]',
};

export default function CouponCard({ coupon }: CouponCardProps) {
  return (
    <div className="rounded-lg shadow-sm bg-white border-l-4 border-l-blue-500">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Ticket size={18} className="text-blue-500" />
        <h3 className="text-base font-semibold text-[#1a2332]">优惠券信息</h3>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">优惠券名称</span>
          <span className="text-sm text-[#1a2332]">{coupon.couponName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">面额</span>
          <span className="text-sm font-medium text-[#1a2332]">{formatCurrency(coupon.couponAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">使用条件</span>
          <span className="text-sm text-[#1a2332]">{coupon.usageCondition}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">追回状态</span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[coupon.recoveryStatus]}`}>
            {coupon.recoveryStatus}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">追回金额</span>
          <span className="text-sm font-medium text-[#1a2332]">{formatCurrency(coupon.recoveryAmount)}</span>
        </div>
      </div>
    </div>
  );
}
