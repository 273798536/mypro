import { useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  BarChart3,
  Layers,
  Clock,
  AlertTriangle,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  Table,
  Filter,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useAppStore } from '@/store';
import StatsCard from '@/components/StatsCard';
import {
  formatDateTime,
  getAnomalyTypeLabel,
  getSeverityLabel,
  getSeverityColor,
  calculateMean,
  calculateStdDev,
} from '@/utils/helpers';
import {
  DataQualityIssue,
  SeverityLevel,
  TemperatureReading,
  AnomalyEvent,
  GroupByType,
  TimePeriod,
} from '@/types';

interface CompareGroup {
  id: string;
  name: string;
  color: string;
  readings: TemperatureReading[];
  anomalies: AnomalyEvent[];
}

const CompareAnalysis = () => {
  const {
    sensors,
    processedData,
    anomalies,
    selectedTimeRange,
    selectedSensors,
    compareConfig,
    setCompareConfig,
    resetCompareConfig,
  } = useAppStore();

  const { groupBy, selectedGroups, timePeriod } = compareConfig;

  const handleGroupByChange = (newGroupBy: GroupByType) => {
    setCompareConfig({ groupBy: newGroupBy, selectedGroups: [] });
  };

  const handleTimePeriodChange = (newTimePeriod: TimePeriod) => {
    setCompareConfig({ timePeriod: newTimePeriod });
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = selectedGroups.includes(groupId)
      ? selectedGroups.filter((g) => g !== groupId)
      : [...selectedGroups, groupId];
    setCompareConfig({ selectedGroups: newSelected });
  };

  useEffect(() => {
    setCompareConfig({ selectedSensors, timeRange: selectedTimeRange || undefined });
  }, [selectedSensors, selectedTimeRange]);

  const filteredData = useMemo(() => {
    let data = processedData.filter((d) => selectedSensors.includes(d.sensorId));

    if (selectedTimeRange) {
      data = data.filter(
        (d) =>
          new Date(d.timestamp) >= new Date(selectedTimeRange.start) &&
          new Date(d.timestamp) <= new Date(selectedTimeRange.end)
      );
    }

    if (timePeriod !== 'all') {
      data = data.filter((d) => {
        const hour = new Date(d.timestamp).getHours();
        switch (timePeriod) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 18;
          case 'evening':
            return hour >= 18 && hour < 24;
          case 'night':
            return hour >= 0 && hour < 6;
          default:
            return true;
        }
      });
    }

    return data;
  }, [processedData, selectedSensors, selectedTimeRange, timePeriod]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => selectedSensors.includes(a.sensorId));
  }, [anomalies, selectedSensors]);

  const compareGroups = useMemo((): CompareGroup[] => {
    const colors = ['#38BDF8', '#34D399', '#F97316', '#A78BFA', '#F472B6', '#FACC15', '#FB7185'];
    const groups: CompareGroup[] = [];

    if (groupBy === 'sensor') {
      selectedSensors.forEach((sensorId, index) => {
        const sensor = sensors.find((s) => s.sensorId === sensorId);
        groups.push({
          id: sensorId,
          name: sensor?.name || sensorId,
          color: colors[index % colors.length],
          readings: filteredData.filter((d) => d.sensorId === sensorId),
          anomalies: filteredAnomalies.filter((a) => a.sensorId === sensorId),
        });
      });
    } else if (groupBy === 'anomalyType') {
      const types: DataQualityIssue[] = ['missing_sample', 'clock_drift', 'sensor_offline', 'outlier', 'value_out_of_range'];
      types.forEach((type, index) => {
        const typeAnomalies = filteredAnomalies.filter((a) => a.anomalyType === type);
        const sensorIds = [...new Set(typeAnomalies.map((a) => a.sensorId))];
        groups.push({
          id: type,
          name: getAnomalyTypeLabel(type),
          color: colors[index % colors.length],
          readings: filteredData.filter((d) => sensorIds.includes(d.sensorId)),
          anomalies: typeAnomalies,
        });
      });
    } else if (groupBy === 'timePeriod') {
      const periods: { id: TimePeriod; name: string }[] = [
        { id: 'morning', name: '上午 (06:00-12:00)' },
        { id: 'afternoon', name: '下午 (12:00-18:00)' },
        { id: 'evening', name: '傍晚 (18:00-24:00)' },
        { id: 'night', name: '夜间 (00:00-06:00)' },
      ];
      periods.forEach((period, index) => {
        const periodReadings = filteredData.filter((d) => {
          const hour = new Date(d.timestamp).getHours();
          switch (period.id) {
            case 'morning':
              return hour >= 6 && hour < 12;
            case 'afternoon':
              return hour >= 12 && hour < 18;
            case 'evening':
              return hour >= 18 && hour < 24;
            case 'night':
              return hour >= 0 && hour < 6;
            default:
              return true;
          }
        });
        const periodAnomalies = filteredAnomalies.filter((a) => {
          const hour = new Date(a.eventTime).getHours();
          switch (period.id) {
            case 'morning':
              return hour >= 6 && hour < 12;
            case 'afternoon':
              return hour >= 12 && hour < 18;
            case 'evening':
              return hour >= 18 && hour < 24;
            case 'night':
              return hour >= 0 && hour < 6;
            default:
              return true;
          }
        });
        groups.push({
          id: period.id,
          name: period.name,
          color: colors[index % colors.length],
          readings: periodReadings,
          anomalies: periodAnomalies,
        });
      });
    }

    return groups.filter((g) => g.readings.length > 0);
  }, [groupBy, selectedSensors, sensors, filteredData, filteredAnomalies]);

  const displayGroups = useMemo(() => {
    if (selectedGroups.length === 0) return compareGroups;
    return compareGroups.filter((g) => selectedGroups.includes(g.id));
  }, [compareGroups, selectedGroups]);

  const getGroupStats = (group: CompareGroup) => {
    const temps = group.readings.map((r) => r.temperature);
    const mean = calculateMean(temps);
    const stdDev = calculateStdDev(temps);
    const min = Math.min(...temps);
    const max = Math.max(...temps);

    const severityCounts = group.anomalies.reduce(
      (acc, a) => {
        acc[a.severity]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 } as Record<SeverityLevel, number>
    );

    return {
      count: group.readings.length,
      mean,
      stdDev,
      min,
      max,
      anomalyCount: group.anomalies.length,
      severityCounts,
    };
  };

  const getTrendIcon = (value: number, baseline: number) => {
    const diff = value - baseline;
    if (diff > 0.5) return <TrendingUp className="w-4 h-4 text-alert-red" />;
    if (diff < -0.5) return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Minus className="w-4 h-4 text-dark-400" />;
  };

  const barChartOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 12 },
        icon: 'roundRect',
        itemHeight: 4,
        itemWidth: 16,
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
        data: ['平均温度', '最高温度', '最低温度', '标准差'],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '温度 (°C)',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono', formatter: '{value}°C' },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.3)', type: 'dashed' } },
      },
      series: displayGroups.map((group) => {
        const stats = getGroupStats(group);
        return {
          name: group.name,
          type: 'bar',
          barWidth: '20%',
          itemStyle: { color: group.color, borderRadius: [4, 4, 0, 0] },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: `${group.color}50` } },
          data: [
            { value: stats.mean.toFixed(2), itemStyle: { color: group.color } },
            { value: stats.max.toFixed(2), itemStyle: { color: `${group.color}CC` } },
            { value: stats.min.toFixed(2), itemStyle: { color: `${group.color}99` } },
            { value: stats.stdDev.toFixed(2), itemStyle: { color: `${group.color}66` } },
          ],
        };
      }),
    };
  }, [displayGroups]);

  const radarChartOption = useMemo(() => {
    const indicators = [
      { name: '缺采样', max: 50 },
      { name: '时钟漂移', max: 50 },
      { name: '传感器离线', max: 50 },
      { name: '异常跳点', max: 50 },
      { name: '超出量程', max: 50 },
    ];

    const types: DataQualityIssue[] = ['missing_sample', 'clock_drift', 'sensor_offline', 'outlier', 'value_out_of_range'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 12 },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.5)' } },
        splitArea: { areaStyle: { color: ['rgba(15, 23, 42, 0.3)', 'rgba(15, 23, 42, 0.5)'] } },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      series: [
        {
          type: 'radar',
          data: displayGroups.map((group) => {
            const typeCounts = types.map((type) =>
              group.anomalies.filter((a) => a.anomalyType === type).length
            );
            return {
              value: typeCounts,
              name: group.name,
              itemStyle: { color: group.color },
              areaStyle: { color: `${group.color}20` },
              lineStyle: { width: 2 },
            };
          }),
        },
      ],
    };
  }, [displayGroups]);

  const boxplotOption = useMemo(() => {
    const prepareBoxplotData = (readings: TemperatureReading[]) => {
      const temps = readings.map((r) => r.temperature).sort((a, b) => a - b);
      const q1 = temps[Math.floor(temps.length * 0.25)];
      const q2 = temps[Math.floor(temps.length * 0.5)];
      const q3 = temps[Math.floor(temps.length * 0.75)];
      const min = temps[0];
      const max = temps[temps.length - 1];
      return [min, q1, q2, q3, max];
    };

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (params: { name: string; value: number[] }) => {
          const [min, q1, median, q3, max] = params.value;
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
            <div>最小值: ${min.toFixed(2)}°C</div>
            <div>下四分位数: ${q1.toFixed(2)}°C</div>
            <div>中位数: ${median.toFixed(2)}°C</div>
            <div>上四分位数: ${q3.toFixed(2)}°C</div>
            <div>最大值: ${max.toFixed(2)}°C</div>
          `;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: displayGroups.map((g) => g.name),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '温度 (°C)',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono', formatter: '{value}°C' },
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.3)', type: 'dashed' } },
      },
      series: [
        {
          type: 'boxplot',
          itemStyle: {
            color: (params: { dataIndex: number }) => displayGroups[params.dataIndex]?.color || '#38BDF8',
            borderColor: (params: { dataIndex: number }) => displayGroups[params.dataIndex]?.color || '#38BDF8',
            borderWidth: 2,
          },
          data: displayGroups.map((g) => prepareBoxplotData(g.readings)),
        },
        {
          type: 'scatter',
          data: displayGroups.flatMap((group) => {
            const stats = getGroupStats(group);
            const iqr = stats.max - stats.min;
            const outliers = group.readings.filter(
              (r) => r.temperature < stats.min - 1.5 * iqr || r.temperature > stats.max + 1.5 * iqr
            );
            return outliers.map((o) => [group.name, o.temperature]);
          }),
          itemStyle: {
            color: '#EF4444',
            shadowBlur: 10,
            shadowColor: 'rgba(239, 68, 68, 0.5)',
          },
          symbolSize: 8,
          tooltip: {
            formatter: (params: { value: [string, number] }) => `
              <div style="font-weight: 600; color: #EF4444; margin-bottom: 4px;">离群点</div>
              <div>${params.value[0]}</div>
              <div>温度: ${params.value[1].toFixed(2)}°C</div>
            `,
          },
        },
      ],
    };
  }, [displayGroups]);

  const overallStats = useMemo(() => {
    const allTemps = filteredData.map((r) => r.temperature);
    return {
      totalReadings: filteredData.length,
      totalAnomalies: filteredAnomalies.length,
      overallMean: calculateMean(allTemps),
      overallStdDev: calculateStdDev(allTemps),
    };
  }, [filteredData, filteredAnomalies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cold-400" />
            分组对比分析
          </h2>
          <p className="text-sm text-dark-400 mt-1">
            多维度对比传感器数据与异常分布
          </p>
        </div>
        <button
          onClick={resetCompareConfig}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重置筛选
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="对比分组数"
          value={displayGroups.length}
          unit="组"
          trend={0}
          status={displayGroups.length > 0 ? 'normal' : 'warning'}
          icon={<Layers className="w-6 h-6" />}
        />
        <StatsCard
          label="数据记录数"
          value={overallStats.totalReadings.toLocaleString()}
          unit="条"
          trend={5}
          status="normal"
          icon={<Thermometer className="w-6 h-6" />}
        />
        <StatsCard
          label="异常总数"
          value={overallStats.totalAnomalies}
          unit="个"
          trend={-3}
          status={overallStats.totalAnomalies > 20 ? 'danger' : overallStats.totalAnomalies > 10 ? 'warning' : 'normal'}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatsCard
          label="整体平均温度"
          value={overallStats.overallMean.toFixed(2)}
          unit="°C"
          trend={0.5}
          status={overallStats.overallMean > 25 ? 'warning' : 'normal'}
          icon={<Thermometer className="w-6 h-6" />}
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-cold-400" />
          <h3 className="text-lg font-semibold text-white">分组配置</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">分组维度</label>
            <div className="flex gap-2">
              {[
                { value: 'sensor', label: '按传感器' },
                { value: 'anomalyType', label: '按异常类型' },
                { value: 'timePeriod', label: '按时间段' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setGroupBy(item.value as GroupByType);
                    setSelectedGroups([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    groupBy === item.value
                      ? 'bg-cold-500/20 text-cold-400 border border-cold-500/50'
                      : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:bg-dark-600/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">时间段筛选</label>
            <select
              value={timePeriod}
              onChange={(e) => handleTimePeriodChange(e.target.value as TimePeriod)}
              className="input-field"
            >
              <option value="all">全部时段</option>
              <option value="morning">上午 (06:00-12:00)</option>
              <option value="afternoon">下午 (12:00-18:00)</option>
              <option value="evening">傍晚 (18:00-24:00)</option>
              <option value="night">夜间 (00:00-06:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">选择对比分组</label>
            <div className="flex flex-wrap gap-2">
              {compareGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    (selectedGroups.length === 0 || selectedGroups.includes(group.id))
                      ? 'text-white'
                      : 'bg-dark-700/30 text-dark-500 border border-dark-600'
                  }`}
                  style={{
                    backgroundColor: (selectedGroups.length === 0 || selectedGroups.includes(group.id))
                      ? `${group.color}20`
                      : undefined,
                    borderColor: (selectedGroups.length === 0 || selectedGroups.includes(group.id))
                      ? `${group.color}50`
                      : undefined,
                    borderWidth: '1px',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.name}
                  <span className="text-dark-400 font-mono">
                    ({group.readings.length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayGroups.map((group) => {
          const stats = getGroupStats(group);
          return (
            <div key={group.id} className="card p-5 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: group.color, boxShadow: `0 0 10px ${group.color}50` }}
                  />
                  <h4 className="font-semibold text-white">{group.name}</h4>
                </div>
                <span className="badge bg-dark-700/50 text-dark-300">
                  {stats.count.toLocaleString()} 条
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">平均温度</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(stats.mean, overallStats.overallMean)}
                    <span className="font-mono font-bold text-white" style={{ color: group.color }}>
                      {stats.mean.toFixed(2)}°C
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">温度区间</span>
                  <span className="font-mono text-sm text-dark-300">
                    {stats.min.toFixed(2)} ~ {stats.max.toFixed(2)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">标准差</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(stats.stdDev, overallStats.overallStdDev)}
                    <span className="font-mono text-sm text-dark-300">
                      {stats.stdDev.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="divider my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">异常数量</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      stats.anomalyCount > 10 ? 'text-alert-red' :
                      stats.anomalyCount > 5 ? 'text-alert-orange' : 'text-green-400'
                    }`}
                  >
                    {stats.anomalyCount} 个
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  {(['critical', 'high', 'medium', 'low'] as SeverityLevel[]).map((sev) => (
                    <div
                      key={sev}
                      className="flex-1 h-2 rounded-full bg-dark-700/50 overflow-hidden"
                      title={`${getSeverityLabel(sev)}: ${stats.severityCounts[sev]}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          sev === 'critical' ? 'bg-alert-red' :
                          sev === 'high' ? 'bg-alert-orange' :
                          sev === 'medium' ? 'bg-alert-yellow' : 'bg-dark-500'
                        }`}
                        style={{
                          width: `${stats.anomalyCount > 0 ? (stats.severityCounts[sev] / stats.anomalyCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-dark-500 mt-1">
                  <span>严重</span>
                  <span>高</span>
                  <span>中</span>
                  <span>低</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cold-400" />
                温度统计对比
              </h3>
              <p className="text-sm text-dark-400 mt-1">多维度温度指标对比分析</p>
            </div>
          </div>
          <div className="chart-container h-[350px]">
            <ReactECharts
              option={barChartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-alert-orange" />
                异常类型分布
              </h3>
              <p className="text-sm text-dark-400 mt-1">雷达图展示各分组异常类型分布</p>
            </div>
          </div>
          <div className="chart-container h-[350px]">
            <ReactECharts
              option={radarChartOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cold-400" />
              温度分布箱线图
            </h3>
            <p className="text-sm text-dark-400 mt-1">四分位数分布与离群点检测</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-dark-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-dark-600 border border-dark-500" />
              <span>箱体 (IQR)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-alert-red" />
              <span>离群点</span>
            </div>
          </div>
        </div>
        <div className="chart-container h-[350px]">
          <ReactECharts
            option={boxplotOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
          />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Table className="w-5 h-5 text-cold-400" />
              对比详情表格
            </h3>
            <p className="text-sm text-dark-400 mt-1">各分组详细统计数据</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">分组名称</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">数据量</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">平均温度</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">最高温度</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">最低温度</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">标准差</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">异常数</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-dark-300">严重程度分布</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">最新更新</th>
              </tr>
            </thead>
            <tbody>
              {displayGroups.map((group) => {
                const stats = getGroupStats(group);
                const latestReading = group.readings[group.readings.length - 1];
                return (
                  <tr key={group.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium text-white">{group.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-dark-300">
                      {stats.count.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 font-mono font-bold" style={{ color: group.color }}>
                      {stats.mean.toFixed(2)}°C
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-alert-orange">
                      {stats.max.toFixed(2)}°C
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-cold-400">
                      {stats.min.toFixed(2)}°C
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-dark-300">
                      {stats.stdDev.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`font-mono font-bold ${
                          stats.anomalyCount > 10 ? 'text-alert-red' :
                          stats.anomalyCount > 5 ? 'text-alert-orange' : 'text-green-400'
                        }`}
                      >
                        {stats.anomalyCount}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-center">
                        {(['critical', 'high', 'medium', 'low'] as SeverityLevel[]).map((sev) => (
                          <div key={sev} className="text-center">
                            <span className={`inline-block w-6 text-xs font-mono ${getSeverityColor(sev)} rounded px-1`}>
                              {stats.severityCounts[sev]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-xs text-dark-400">
                      {latestReading ? formatDateTime(latestReading.timestamp) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-cold-400" />
          <h3 className="text-lg font-semibold text-white">对比说明</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-dark-300">
          <div className="p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <h4 className="font-medium text-cold-400 mb-2">按传感器对比</h4>
            <p className="text-xs text-dark-400">
              对比不同传感器的温度数据，识别温度异常的传感器位置，发现潜在的设备故障或区域温度差异。
            </p>
          </div>
          <div className="p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <h4 className="font-medium text-cold-400 mb-2">按异常类型对比</h4>
            <p className="text-xs text-dark-400">
              按异常类型分组对比，分析不同类型异常的温度特征，帮助识别数据质量问题类型。
            </p>
          </div>
          <div className="p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <h4 className="font-medium text-cold-400 mb-2">按时间段对比</h4>
            <p className="text-xs text-dark-400">
              按不同时段（上午、下午、傍晚、夜间）对比温度变化，识别温度的时段性规律和异常时段。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareAnalysis;
