import { useAppStore } from '@/store';
import { Clock, AlertCircle, RefreshCw, CheckCircle, DollarSign, Clock as ClockIcon, ArrowLeftRight } from 'lucide-react';
import type { PendingItem } from '@/types';

const typeConfig = {
  deduction: {
    icon: DollarSign,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: '扣点补扣',
  },
  delay: {
    icon: ClockIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: '延迟结算',
  },
  refund: {
    icon: ArrowLeftRight,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: '跨账期退款',
  },
};

function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

interface PendingItemCardProps {
  item: PendingItem;
  onConfirm: (id: string) => void;
}

function PendingItemCard({ item, onConfirm }: PendingItemCardProps) {
  const TypeIcon = typeConfig[item.type].icon;
  const config = typeConfig[item.type];

  return (
    <div
      className={`p-3 rounded-lg border ${config.border} ${config.bg} transition-all hover:shadow-sm`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded ${config.bg} ${config.color}`}>
            <TypeIcon size={14} />
          </span>
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} />
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{formatMoney(item.amount)}</span>
        {item.status === 'pending' ? (
          <button
            onClick={() => onConfirm(item.id)}
            className="px-3 py-1 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-700 transition-colors flex items-center gap-1"
          >
            <CheckCircle size={12} />
            确认
          </button>
        ) : (
          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-md flex items-center gap-1">
            <CheckCircle size={12} />
            已确认
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-400">关联账期: {item.relatedPeriod}</div>
    </div>
  );
}

export function PendingArea() {
  const { pendingItems, confirmPendingItem } = useAppStore();

  const pendingCount = pendingItems.filter((item) => item.status === 'pending').length;

  const handleConfirm = async (id: string) => {
    confirmPendingItem(id);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <AlertCircle size={18} className="text-orange-500" />
          待确认区
        </h3>
        {pendingCount > 0 && (
          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium flex items-center gap-1">
            <RefreshCw size={12} />
            {pendingCount} 项待处理
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {pendingItems.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">暂无待确认事项</div>
        ) : (
          pendingItems.map((item) => (
            <PendingItemCard key={item.id} item={item} onConfirm={handleConfirm} />
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        包括平台扣点补扣、延迟结算、跨账期退款等需要确认的事项
      </div>
    </div>
  );
}
