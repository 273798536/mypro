import { useAppStore } from '@/store';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { SettlementPeriod } from '@/types';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: '待结算' },
  processing: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50', label: '结算中' },
  completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '已完成' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

interface PeriodCardProps {
  period: SettlementPeriod;
  isSelected: boolean;
  onClick: () => void;
}

function PeriodCard({ period, isSelected, onClick }: PeriodCardProps) {
  const StatusIcon = statusConfig[period.status].icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'bg-primary-50 border-2 border-primary-500 shadow-md'
          : 'bg-white border border-gray-200 hover:border-primary-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800">{period.periodName}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig[period.status].bg} ${statusConfig[period.status].color}`}
        >
          <StatusIcon size={12} />
          {statusConfig[period.status].label}
        </span>
      </div>
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Calendar size={14} className="mr-1" />
        {formatDate(period.startDate)} - {formatDate(period.endDate)}
      </div>
      <div className="text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">订单数</span>
          <span className="font-medium text-gray-700">{period.totalOrders}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">净收入</span>
          <span className="font-semibold text-green-600">{formatMoney(period.netAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export function PeriodTimeline() {
  const { periods, selectedPeriodId, setSelectedPeriodId } = useAppStore();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-800">账期时间线</h2>
        <p className="text-sm text-gray-500 mt-1">点击选择账期查看详情</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {periods.map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            isSelected={selectedPeriodId === period.id}
            onClick={() => setSelectedPeriodId(period.id)}
          />
        ))}
      </div>
    </div>
  );
}
