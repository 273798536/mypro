import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useCashflowStore } from '../../store/useCashflowStore';
import StressBadge from '../common/StressBadge';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function DayCell({ date, isCurrentMonth, isSelected, onClick }: DayCellProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dailySummary = useCashflowStore(state => state.getDailySummary(dateStr));

  const hasEntries = dailySummary && dailySummary.entries.length > 0;
  const stressLevel = dailySummary?.stressLevel || 'none';

  const borderColor = stressLevel === 'danger'
    ? 'border-red-400 bg-red-50/50'
    : stressLevel === 'warning'
      ? 'border-yellow-400 bg-yellow-50/50'
      : isSelected
        ? 'border-brand-primary bg-brand-primary/5'
        : 'border-transparent hover:border-gray-300';

  return (
    <button
      onClick={onClick}
      className={`min-h-24 p-2 text-left border-2 rounded-lg transition-all ${
        isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 opacity-50'
      } ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-medium ${
            isToday(date)
              ? 'bg-brand-primary text-white rounded-full w-6 h-6 flex items-center justify-center'
              : 'text-gray-700'
          }`}
        >
          {format(date, 'd')}
        </span>
        {hasEntries && stressLevel !== 'none' && (
          <StressBadge level={stressLevel} compact />
        )}
      </div>
      {hasEntries && dailySummary && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs">
            {dailySummary.inflow > 0 && (
              <span className="flex items-center gap-0.5 text-green-600">
                <TrendingUp size={10} />
                {Math.round(dailySummary.inflow / 1000)}k
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs">
            {dailySummary.outflow > 0 && (
              <span className="flex items-center gap-0.5 text-red-600">
                <TrendingDown size={10} />
                {Math.round(dailySummary.outflow / 1000)}k
              </span>
            )}
          </div>
          {dailySummary.entries.length > 0 && (
            <div className="text-xs text-gray-400">
              {dailySummary.entries.length}笔
            </div>
          )}
        </div>
      )}
    </button>
  );
}

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date | null;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}

export default function CalendarGrid({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect
}: CalendarGridProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button
          onClick={() => onMonthChange(addDays(startOfMonth(currentMonth), -1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {format(currentMonth, 'yyyy年MM月')}
        </h2>
        <button
          onClick={() => onMonthChange(addDays(startOfMonth(currentMonth), 32))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 bg-gray-50">
        {weekDays.map(day => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
            周{day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3">
        {calendarDays.map((day, idx) => (
          <DayCell
            key={idx}
            date={day}
            isCurrentMonth={isSameMonth(day, currentMonth)}
            isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
            onClick={() => onDateSelect(day)}
          />
        ))}
      </div>
    </div>
  );
}