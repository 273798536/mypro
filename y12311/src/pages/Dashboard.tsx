import React, { useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import {
  Users,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Chart from '../components/charts/Chart';
import WaitDistributionChart from '../components/charts/WaitDistributionChart';
import FilterPanel from '../components/features/FilterPanel';
import { useQueueStore } from '../store/useQueueStore';
import { useExceptionStore } from '../engines/ExceptionEngine';
import { useFilterStore, filterSyncEngine } from '../engines/FilterSyncEngine';
import { EChartsOption } from 'echarts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { loadData, windows, isLoading, serviceRecords, visitors, appointments } = useQueueStore();
  const { exceptions } = useExceptionStore();
  const { dateRange, keyword, windowIds, businessTypes, status } = useFilterStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => useQueueStore.getState().getStatistics(), [serviceRecords, visitors, appointments, windows]);
  const filteredData = useMemo(() => {
    void dateRange; void keyword; void windowIds; void businessTypes; void status;
    return filterSyncEngine.getFilteredRecords(serviceRecords, visitors, appointments, windows);
  }, [serviceRecords, visitors, appointments, windows, dateRange, keyword, windowIds, businessTypes, status]);

  const pendingExceptions = exceptions.filter((e) => e.status === 'pending');

  const trendChartOption: EChartsOption = useMemo(() => {
    const days = 7;
    const labels = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return format(date, 'MM-dd', { locale: zhCN });
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['办理人数', '平均等待时长'],
        top: 0,
        textStyle: { fontSize: 12, color: '#4E5969' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 11, color: '#4E5969' },
        axisLine: { lineStyle: { color: '#E5E6EB' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '人数',
          nameTextStyle: { fontSize: 12, color: '#4E5969' },
          axisLabel: { fontSize: 11, color: '#4E5969' },
          splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '分钟',
          nameTextStyle: { fontSize: 12, color: '#4E5969' },
          axisLabel: { fontSize: 11, color: '#4E5969', formatter: '{value}分' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '办理人数',
          type: 'bar',
          data: [45, 52, 48, 61, 55, 49, 58],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#6AA1FF' },
              { offset: 1, color: '#165DFF' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '40%',
        },
        {
          name: '平均等待时长',
          type: 'line',
          yAxisIndex: 1,
          data: [12, 15, 10, 18, 14, 11, 16],
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#FF7D00', width: 2 },
          itemStyle: { color: '#FF7D00', borderWidth: 2, borderColor: '#fff' },
        },
      ],
      animationDuration: 800,
    };
  }, []);

  const windowStatusOption: EChartsOption = useMemo(() => {
    const openCount = windows.filter((w) => w.status === 'open').length;
    const pausedCount = windows.filter((w) => w.status === 'paused').length;
    const closedCount = windows.filter((w) => w.status === 'closed').length;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}个 ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'center',
            formatter: `{a|${windows.length}}\n{b|总窗口数}`,
            rich: {
              a: { fontSize: 28, fontWeight: 'bold', color: '#1D2129', fontFamily: 'serif' },
              b: { fontSize: 12, color: '#86909C', padding: [4, 0, 0, 0] },
            },
          },
          labelLine: { show: false },
          data: [
            { value: openCount, name: '开放', itemStyle: { color: '#00B42A' } },
            { value: pausedCount, name: '暂停', itemStyle: { color: '#FF7D00' } },
            { value: closedCount, name: '关闭', itemStyle: { color: '#86909C' } },
          ],
        },
      ],
    };
  }, [windows]);

  const waitTimes = useMemo(
    () => filteredData.records.map((r) => r.waitDuration),
    [filteredData.records]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">总览面板</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {format(dateRange[0], 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
            {format(dateRange[1], 'yyyy年MM月dd日', { locale: zhCN })} 排队业务概览
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总到访人数"
          value={stats.totalVisitors}
          unit="人"
          icon={<Users size={24} />}
          color="primary"
          trend="up"
          trendValue="+12.5%"
          delay={0}
        />
        <StatCard
          title="平均等待时长"
          value={stats.avgWaitTime}
          unit="分钟"
          icon={<Clock size={24} />}
          color="warning"
          trend="down"
          trendValue="-8.3%"
          delay={80}
        />
        <StatCard
          title="窗口利用率"
          value={stats.windowUtilization}
          unit="%"
          icon={<Building2 size={24} />}
          color="success"
          trend="up"
          trendValue="+5.2%"
          delay={160}
        />
        <StatCard
          title="异常率"
          value={stats.exceptionRate}
          unit="%"
          icon={<AlertTriangle size={24} />}
          color="danger"
          trend="down"
          trendValue="-2.1%"
          delay={240}
        />
      </div>

      {pendingExceptions.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 animate-pulse-slow">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-warning-800">
                有 {pendingExceptions.length} 条异常记录待确认
              </div>
              <div className="text-sm text-warning-700 mt-0.5">
                请及时处理预约爽约、时长异常和窗口临停等问题
              </div>
            </div>
            <button className="btn-warning text-sm">立即处理</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-neutral-800 mb-4">近7天业务趋势</h3>
          <Chart option={trendChartOption} height={280} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">窗口状态</h3>
          <Chart option={windowStatusOption} height={280} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">等待时长分布</h3>
          <WaitDistributionChart waitTimes={waitTimes} height={280} showCumulative={false} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">实时窗口状态</h3>
          <div className="space-y-3">
            {windows.map((window) => (
              <div
                key={window.id}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      window.status === 'open'
                        ? 'bg-success-500'
                        : window.status === 'paused'
                        ? 'bg-warning-500 animate-breathe'
                        : 'bg-neutral-400'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-neutral-800">{window.name}</div>
                    <div className="text-xs text-neutral-500">
                      {window.businessScope.slice(0, 2).join('、')}
                      {window.businessScope.length > 2 ? '...' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {window.status === 'open' && (
                    <span className="badge-success flex items-center gap-1">
                      <CheckCircle size={12} /> 开放
                    </span>
                  )}
                  {window.status === 'paused' && (
                    <span className="badge-warning flex items-center gap-1">
                      <AlertTriangle size={12} /> {window.pauseReason || '暂停'}
                    </span>
                  )}
                  {window.status === 'closed' && (
                    <span className="badge-neutral flex items-center gap-1">
                      <XCircle size={12} /> 关闭
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
