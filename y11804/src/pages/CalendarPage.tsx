import { useMemo } from 'react';
import { Calendar as CalendarIcon, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useCouponStore } from '../store/useCouponStore';
import { StatCard } from '../components/common/StatCard';
import { MonthNavigator } from '../components/calendar/MonthNavigator';
import { EventCard } from '../components/calendar/EventCard';
import { VerifyDetailPanel } from '../components/calendar/VerifyDetailPanel';
import { ArrivalRateChart } from '../components/charts/ArrivalRateChart';
import { formatAmountYi, formatPercent } from '../utils/amountUtils';

export const CalendarPage = () => {
  const {
    currentMonth,
    selectedPlanId,
    setCurrentMonth,
    setSelectedPlanId,
    getDashboardStats,
    getTimelineEvents,
    couponPlans,
  } = useCouponStore();

  const stats = getDashboardStats();
  const allEvents = getTimelineEvents();

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => event.paymentDate.startsWith(currentMonth));
  }, [allEvents, currentMonth]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, typeof filteredEvents> = {};
    filteredEvents.forEach((event) => {
      if (!grouped[event.paymentDate]) {
        grouped[event.paymentDate] = [];
      }
      grouped[event.paymentDate].push(event);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events }));
  }, [filteredEvents]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">票息日历</h1>
          <p className="text-gray-500">
            以时间轴为主线，清晰展示每笔票息的到账状态。点击卡片查看详细核验信息。
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="应付息笔数"
            value={stats.totalPlans}
            subtitle={`合计 ${formatAmountYi(stats.totalAmount)} 元`}
            icon={<CalendarIcon className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="已到账"
            value={stats.receivedCount}
            subtitle={`到账率 ${formatPercent(stats.arrivalRate)}`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="待核验"
            value={stats.pendingCount}
            subtitle={`待核验金额 ${formatAmountYi(stats.pendingAmount)} 元`}
            icon={<Clock className="w-5 h-5" />}
            color="gray"
          />
          <StatCard
            title="异常项"
            value={stats.exceptionCount}
            subtitle={`差异金额 ${formatAmountYi(stats.exceptionAmount)} 元`}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">票息时间轴</h2>
              <MonthNavigator currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </div>

            {couponPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无数据</h3>
                <p className="text-gray-500 mb-4">
                  请先导入债券持仓、票息计划和托管回单数据
                </p>
                <p className="text-sm text-gray-400">
                  或点击右上角"生成示例数据"按钮体验完整功能
                </p>
              </div>
            ) : eventsByDate.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">当月无票息</h3>
                <p className="text-gray-500">请切换到其他月份查看</p>
              </div>
            ) : (
              <div className="space-y-4">
                {eventsByDate.map(({ date, events }) => (
                  <div key={date} className="flex gap-4">
                    <div className="flex flex-col items-center pt-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-md" />
                      <div className="w-0.5 flex-1 bg-blue-200 my-2" />
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        {events.map((event) => (
                          <EventCard
                            key={event.planId}
                            event={event}
                            isSelected={selectedPlanId === event.planId}
                            onClick={() => setSelectedPlanId(event.planId)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-4 space-y-6">
            <ArrivalRateChart stats={stats} />

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-4">图例说明</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">全额到账</p>
                    <p className="text-xs text-gray-500">金额与日期均匹配</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">付息日顺延</p>
                    <p className="text-xs text-gray-500">遇节假日自动顺延</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">部分到账</p>
                    <p className="text-xs text-gray-500">实际到账少于计划</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">未到账</p>
                    <p className="text-xs text-gray-500">疑似漏付需确认</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">待核验</p>
                    <p className="text-xs text-gray-500">等待托管回单</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPlanId && (
        <VerifyDetailPanel planId={selectedPlanId} onClose={() => setSelectedPlanId(null)} />
      )}
    </div>
  );
};
