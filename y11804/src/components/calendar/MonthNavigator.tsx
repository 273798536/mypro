import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MonthNavigatorProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
}

export const MonthNavigator = ({ currentMonth, onMonthChange }: MonthNavigatorProps) => {
  const date = parseISO(`${currentMonth}-01`);

  const handlePrevMonth = () => {
    onMonthChange(format(subMonths(date, 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    onMonthChange(format(addMonths(date, 1), 'yyyy-MM'));
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
      <button
        onClick={handlePrevMonth}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">
          {format(date, 'yyyy年MM月', { locale: zhCN })}
        </span>
      </div>

      <button
        onClick={handleNextMonth}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
};
