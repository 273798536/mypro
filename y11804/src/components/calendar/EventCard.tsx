import { Calendar, Banknote, CheckCircle2 } from 'lucide-react';
import { TimelineEvent, STATUS_BG_COLORS } from '../../types';
import { formatShortDate, formatDateDisplay } from '../../utils/dateUtils';
import { formatAmountWan } from '../../utils/amountUtils';
import { StatusBadge } from '../common/StatusBadge';

interface EventCardProps {
  event: TimelineEvent;
  isSelected: boolean;
  onClick: () => void;
}

export const EventCard = ({ event, isSelected, onClick }: EventCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : `${STATUS_BG_COLORS[event.status]} hover:border-gray-300`
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">
            {formatShortDate(event.paymentDate)}
          </span>
          <StatusBadge status={event.status} size="sm" />
        </div>
        <div className="flex items-center gap-1">
          {event.hasReceipt ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Banknote className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      <h4 className="font-semibold text-gray-900 mb-1">{event.bondName}</h4>
      <p className="text-sm text-gray-500 mb-2">{event.bondCode}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDateDisplay(event.paymentDate)}</span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          ¥{formatAmountWan(event.expectedAmount)}
        </span>
      </div>
    </div>
  );
};
