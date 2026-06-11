import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AnomalySeverity } from '../../types';

/**
 * 日历网格组件属性接口
 */
interface CalendarGridProps {
  /** 当前选中的日期 */
  selectedDate: Date;
  /** 选中日期变更回调 */
  onSelectDate: (date: Date) => void;
  /** 有投喂记录的日期集合 */
  feedingDates: Set<string>;
  /** 异常日期映射：日期字符串 -> 严重程度 */
  anomalyDates: Map<string, AnomalySeverity>;
}

/**
 * 日期格式化为 YYYY-MM-DD 字符串
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 判断两个日期是否为同一天
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 月视图日历网格组件
 * 显示投喂记录背景、异常标记圆点、选中高亮
 */
export function CalendarGrid({
  selectedDate,
  onSelectDate,
  feedingDates,
  anomalyDates,
}: CalendarGridProps) {
  /** 当前视图显示的年月（基于选中日期） */
  const [viewDate, setViewDate] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  /** 星期标题 */
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  /**
   * 计算当前月份需要显示的所有日期格子
   * 包含上个月末尾和下个月开头的补齐日期
   */
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    /** 当月第一天是星期几 */
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    /** 当月总天数 */
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    /** 上个月总天数 */
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Date[] = [];

    /** 补齐上个月的日期 */
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, daysInPrevMonth - i));
    }

    /** 当月日期 */
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    /** 补齐下个月的日期，使总数为 42 格（6 行） */
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [viewDate]);

  /** 切换到上一个月 */
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  /** 切换到下一个月 */
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  /**
   * 根据异常严重程度返回对应的圆点颜色
   */
  const getAnomalyDotColor = (severity: AnomalySeverity): string => {
    switch (severity) {
      case 'high':
        return 'bg-corral-severe';
      case 'medium':
        return 'bg-amber-warn';
      case 'low':
        return 'bg-amber-warn/60';
      default:
        return 'bg-amber-warn';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 p-4">
      {/* 头部：月份标题和切换按钮 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">
          {viewDate.getFullYear()} 年 {viewDate.getMonth() + 1} 月
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors text-deep-ocean/60 hover:text-deep-ocean"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors text-deep-ocean/60 hover:text-deep-ocean"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 星期标题行 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              idx === 0 || idx === 6 ? 'text-deep-ocean/40' : 'text-deep-ocean/60'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, idx) => {
          const dateKey = formatDateKey(date);
          const isCurrentMonth = date.getMonth() === viewDate.getMonth();
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const hasFeeding = feedingDates.has(dateKey);
          const anomalySeverity = anomalyDates.get(dateKey);
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                rounded-lg text-sm transition-all duration-200
                ${isCurrentMonth ? '' : 'opacity-30'}
                ${isSelected ? 'ring-2 ring-deep-ocean ring-offset-1' : ''}
                ${hasFeeding ? 'bg-deep-ocean/8' : ''}
                ${
                  isSelected
                    ? 'bg-deep-ocean text-paper'
                    : isToday
                    ? 'bg-deep-ocean/15 text-deep-ocean font-semibold'
                    : hasFeeding
                    ? 'text-deep-ocean hover:bg-deep-ocean/15'
                    : isWeekend
                    ? 'text-deep-ocean/40 hover:bg-paper-dark'
                    : 'text-deep-ocean/80 hover:bg-paper-dark'
                }
              `}
            >
              {/* 日期号 */}
              <span>{date.getDate()}</span>

              {/* 异常标记圆点 */}
              {anomalySeverity && (
                <span
                  className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${getAnomalyDotColor(
                    anomalySeverity
                  )}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
