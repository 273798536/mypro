import React, { useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import { BarChart3, Percent, Clock, Users, TrendingUp, Box } from 'lucide-react';
import Chart from '../components/charts/Chart';
import WaitDistributionChart from '../components/charts/WaitDistributionChart';
import StatCard from '../components/ui/StatCard';
import FilterPanel from '../components/features/FilterPanel';
import { useQueueStore } from '../store/useQueueStore';
import { useFilterStore, filterSyncEngine } from '../engines/FilterSyncEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Distribution: React.FC = () => {
  const { loadData, isLoading, serviceRecords, visitors, appointments, windows } = useQueueStore();
  const { dateRange, keyword, windowIds, businessTypes, status } = useFilterStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    void dateRange; void keyword; void windowIds; void businessTypes; void status;
    return filterSyncEngine.getFilteredRecords(serviceRecords, visitors, appointments, windows);
  }, [serviceRecords, visitors, appointments, windows, dateRange, keyword, windowIds, businessTypes, status]);

  const waitTimes = useMemo(
    () => filteredData.records.map((r) => r.waitDuration).filter((t) => t >= 0),
    [filteredData.records]
  );

  const serviceTimes = useMemo(
    () => filteredData.records.map((r) => r.serviceDuration).filter((t) => t > 0),
    [filteredData.records]
  );

  const statistics = useMemo(() => {
    if (waitTimes.length === 0) {
      return {
        avg: 0,
        median: 0,
        p75: 0,
        p95: 0,
        p99: 0,
        timeoutRate: 0,
        variance: 0,
        std: 0,
      };
    }

    const sorted = [...waitTimes].sort((a, b) => a - b);
    const n = sorted.length;

    const avg = waitTimes.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const p75 = sorted[Math.floor(n * 0.75)];
    const p95 = sorted[Math.floor(n * 0.95)];
    const p99 = sorted[Math.floor(n * 0.99)];

    const timeoutThreshold = 30;
    const timeoutCount = waitTimes.filter((t) => t > timeoutThreshold).length;
    const timeoutRate = (timeoutCount / n) * 100;

    const variance = waitTimes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
      avg: Math.round(avg * 10) / 10,
      median: Math.round(median * 10) / 10,
      p75: Math.round(p75 * 10) / 10,
      p95: Math.round(p95 * 10) / 10,
      p99: Math.round(p99 * 10) / 10,
      timeoutRate: Math.round(timeoutRate * 10) / 10,
      variance: Math.round(variance * 10) / 10,
      std: Math.round(std * 10) / 10,
    };
  }, [waitTimes]);

  const serviceStats = useMemo(() => {
    if (serviceTimes.length === 0) {
      return { avg: 0, std: 0, min: 0, max: 0 };
    }

    const avg = serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length;
    const variance = serviceTimes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / serviceTimes.length;
    const std = Math.sqrt(variance);

    return {
      avg: Math.round(avg * 10) / 10,
      std: Math.round(std * 10) / 10,
      min: Math.min(...serviceTimes),
      max: Math.max(...serviceTimes),
    };
  }, [serviceTimes]);

  const boxPlotOption: EChartsOption = useMemo(() => {
    const sorted = [...waitTimes].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) {
      return {
        xAxis: { type: 'category' },
        yAxis: { type: 'value' },
        series: [],
      };
    }

    const q1 = sorted[Math.floor(n * 0.25)];
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const min = Math.max(sorted[0], q1 - 1.5 * iqr);
    const max = Math.min(sorted[n - 1], q3 + 1.5 * iqr);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const data = (p as { data: number[] }).data;
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">等待时长箱线图</div>
            <div>最小值：${data[0]} 分钟</div>
            <div>Q1：${data[1]} 分钟</div>
            <div>中位数：${data[2]} 分钟</div>
            <div>Q3：${data[3]} 分钟</div>
            <div>最大值：${data[4]} 分钟</div>
          `;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '10%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: ['等待时长分布'],
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '分钟',
        nameTextStyle: { fontSize: 12, color: '#4E5969' },
        axisLabel: { fontSize: 11, color: '#4E5969' },
        splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
      },
      series: [
        {
          type: 'boxplot',
          data: [[min, q1, median, q3, max]],
          itemStyle: {
            color: '#165DFF',
            borderColor: '#0E42D2',
            borderWidth: 2,
          },
          boxWidth: [40, 40],
        },
        {
          type: 'scatter',
          data: waitTimes
            .filter((t) => t < min || t > max)
            .map((t) => [0, t]),
          symbolSize: 8,
          itemStyle: {
            color: '#F53F3F',
          },
        },
      ],
    };
  }, [waitTimes]);

  const cumulativeOption: EChartsOption = useMemo(() => {
    if (waitTimes.length === 0) return {};

    const sorted = [...waitTimes].sort((a, b) => a - b);
    const n = sorted.length;
    const xData: number[] = [];
    const yData: number[] = [];

    for (let i = 0; i <= 100; i += 5) {
      const index = Math.floor((n - 1) * (i / 100));
      xData.push(i);
      yData.push(sorted[index] || 0);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const data = p as { value: number; name: string };
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">累积分布</div>
            <div>${data.name} 的人等待时间 ≤ ${data.value} 分钟</div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData.map((v) => `${v}%`),
        name: '累积占比',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: 12, color: '#4E5969' },
        axisLabel: { fontSize: 10, color: '#4E5969' },
        axisLine: { lineStyle: { color: '#E5E6EB' } },
      },
      yAxis: {
        type: 'value',
        name: '等待时长（分钟）',
        nameTextStyle: { fontSize: 12, color: '#4E5969' },
        axisLabel: { fontSize: 11, color: '#4E5969' },
        splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          data: yData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#165DFF', width: 3 },
          itemStyle: { color: '#165DFF', borderWidth: 2, borderColor: '#fff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(22, 93, 255, 0.3)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0)' },
            ]),
          },
          markLine: {
            silent: true,
            data: [
              { yAxis: 30, label: { formatter: '30分钟阈值', color: '#F53F3F' }, lineStyle: { color: '#F53F3F', type: 'dashed' } },
            ],
          },
        },
      ],
    };
  }, [waitTimes]);

  const serviceDistributionOption: EChartsOption = useMemo(() => {
    if (serviceTimes.length === 0) return {};

    const bins = 12;
    const max = Math.max(...serviceTimes, 1);
    const binWidth = max / bins;
    const histogram = Array(bins).fill(0);

    serviceTimes.forEach((value) => {
      const binIndex = Math.min(Math.floor(value / binWidth), bins - 1);
      histogram[binIndex]++;
    });

    const xData = histogram.map((_, i) => `${Math.round(i * binWidth)}-${Math.round((i + 1) * binWidth)}`);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          const data = p as { value: number; name: string };
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">服务时长 ${data.name} 分钟</div>
            <div>记录数：<span style="font-weight: 600; color: #00B42A;">${data.value}</span> 条</div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData,
        name: '服务时长（分钟）',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: 12, color: '#4E5969' },
        axisLabel: { fontSize: 10, color: '#4E5969' },
        axisLine: { lineStyle: { color: '#E5E6EB' } },
      },
      yAxis: {
        type: 'value',
        name: '记录数',
        nameTextStyle: { fontSize: 12, color: '#4E5969' },
        axisLabel: { fontSize: 11, color: '#4E5969' },
        splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: histogram,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#58D268' },
              { offset: 1, color: '#00B42A' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
        },
      ],
    };
  }, [serviceTimes]);

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
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">等待分布</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {format(dateRange[0], 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
            {format(dateRange[1], 'yyyy年MM月dd日', { locale: zhCN })} 统计分析
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          title="样本数"
          value={waitTimes.length}
          unit="条"
          icon={<Users size={20} />}
          color="primary"
          delay={0}
        />
        <StatCard
          title="平均值"
          value={statistics.avg}
          unit="分钟"
          icon={<BarChart3 size={20} />}
          color="primary"
          delay={40}
        />
        <StatCard
          title="中位数"
          value={statistics.median}
          unit="分钟"
          icon={<TrendingUp size={20} />}
          color="success"
          delay={80}
        />
        <StatCard
          title="P75分位"
          value={statistics.p75}
          unit="分钟"
          icon={<Box size={20} />}
          color="neutral"
          delay={120}
        />
        <StatCard
          title="P95分位"
          value={statistics.p95}
          unit="分钟"
          icon={<Box size={20} />}
          color="warning"
          delay={160}
        />
        <StatCard
          title="P99分位"
          value={statistics.p99}
          unit="分钟"
          icon={<Box size={20} />}
          color="danger"
          delay={200}
        />
        <StatCard
          title="标准差"
          value={statistics.std}
          unit="分钟"
          icon={<TrendingUp size={20} />}
          color="neutral"
          delay={240}
        />
        <StatCard
          title="超时率"
          value={statistics.timeoutRate}
          unit="%"
          icon={<Percent size={20} />}
          color={statistics.timeoutRate > 20 ? 'danger' : statistics.timeoutRate > 10 ? 'warning' : 'success'}
          delay={280}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">等待时长直方图</h3>
          <WaitDistributionChart waitTimes={waitTimes} height={300} showCumulative={true} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">累积分布曲线</h3>
          <Chart option={cumulativeOption} height={300} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-neutral-800 mb-4">等待时长箱线图</h3>
          <Chart option={boxPlotOption} height={300} />
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-neutral-800 mb-4">
            服务时长分布
            <span className="text-sm font-normal text-neutral-500 ml-2">
              (均值 {serviceStats.avg} ± {serviceStats.std} 分钟)
            </span>
          </h3>
          <Chart option={serviceDistributionOption} height={300} />
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-neutral-800 mb-4">统计说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-neutral-50 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2 flex items-center gap-2">
              <Clock size={16} className="text-primary-500" />
              分位数说明
            </h4>
            <ul className="space-y-1 text-neutral-600">
              <li>• P75：75%的人等待时间不超过该值</li>
              <li>• P95：95%的人等待时间不超过该值</li>
              <li>• P99：99%的人等待时间不超过该值</li>
            </ul>
          </div>
          <div className="p-4 bg-neutral-50 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2 flex items-center gap-2">
              <Percent size={16} className="text-warning-500" />
              超时判定
            </h4>
            <ul className="space-y-1 text-neutral-600">
              <li>• 等待超过30分钟判定为超时</li>
              <li>• 当前超时率：{statistics.timeoutRate}%</li>
              <li>• 建议控制在10%以内</li>
            </ul>
          </div>
          <div className="p-4 bg-neutral-50 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2 flex items-center gap-2">
              <BarChart3 size={16} className="text-success-500" />
              离散程度
            </h4>
            <ul className="space-y-1 text-neutral-600">
              <li>• 标准差：{statistics.std} 分钟</li>
              <li>• 方差：{statistics.variance} 分钟²</li>
              <li>• 服务时长均值：{serviceStats.avg} 分钟</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Distribution;
