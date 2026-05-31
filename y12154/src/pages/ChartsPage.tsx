import React, { useEffect, useRef, useMemo } from 'react';
import { BarChart3, RefreshCw, Download } from 'lucide-react';
import * as echarts from 'echarts';
import { useDataStore } from '../stores/dataStore';
import { useThresholdStore } from '../stores/thresholdStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDistance, formatPercent } from '../utils/helpers';
import { ABNORMAL_LEVEL_COLORS, ABNORMAL_LEVEL_LABELS, ABNORMAL_TYPE_LABELS } from '../utils/constants';

export const ChartsPage: React.FC = () => {
  const {
    inspectionRecords,
    brakeCalculations,
    abnormalDetections,
    thresholdChecks,
    processAllRecords,
    isProcessing,
  } = useDataStore();
  const { config: thresholdConfig } = useThresholdStore();

  const distanceChartRef = useRef<HTMLDivElement>(null);
  const distanceChartInstance = useRef<echarts.ECharts | null>(null);

  const distributionChartRef = useRef<HTMLDivElement>(null);
  const distributionChartInstance = useRef<echarts.ECharts | null>(null);

  const trendChartRef = useRef<HTMLDivElement>(null);
  const trendChartInstance = useRef<echarts.ECharts | null>(null);

  const typeChartRef = useRef<HTMLDivElement>(null);
  const typeChartInstance = useRef<echarts.ECharts | null>(null);

  const stats = useMemo(() => {
    const levelCounts = {
      normal: abnormalDetections.filter(d => d.overallLevel === 'normal').length,
      warning: abnormalDetections.filter(d => d.overallLevel === 'warning').length,
      serious: abnormalDetections.filter(d => d.overallLevel === 'serious').length,
      overload: abnormalDetections.filter(d => d.overallLevel === 'overload').length,
    };

    const typeCounts = {
      speed_gap: abnormalDetections.filter(d => d.detectedTypes.includes('speed_gap')).length,
      brake_delay: abnormalDetections.filter(d => d.detectedTypes.includes('brake_delay')).length,
      overload: abnormalDetections.filter(d => d.detectedTypes.includes('overload')).length,
      brake_distance: abnormalDetections.filter(d => d.detectedTypes.includes('brake_distance')).length,
      missing_data: abnormalDetections.filter(d => d.detectedTypes.includes('missing_data')).length,
    };

    return { levelCounts, typeCounts };
  }, [abnormalDetections]);

  useEffect(() => {
    if (!distanceChartRef.current || brakeCalculations.length === 0) return;

    if (!distanceChartInstance.current) {
      distanceChartInstance.current = echarts.init(distanceChartRef.current);
    }

    const distanceData = brakeCalculations
      .slice(0, 20)
      .map(c => ({
        name: c.recordId.slice(-6),
        理论: Number(c.theoreticalBrakeDistance.toFixed(3)),
        实际: Number(c.actualBrakeDistance.toFixed(3)),
        偏差: Number(c.deviationPercent.toFixed(1)),
      }));

    const distanceOption: echarts.EChartsOption = {
      title: {
        text: '制动距离对比图（前20条）',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let html = `<div class="text-xs"><strong>${params[0]?.name}</strong></div>`;
          params.forEach((p: any) => {
            html += `<div class="text-xs">${p.marker} ${p.seriesName}: ${p.seriesName === '偏差' ? `${p.value}%` : `${p.value} m`}</div>`;
          });
          return html;
        },
      },
      legend: { data: ['理论', '实际', '偏差'], bottom: 5 },
      grid: { left: 60, right: 60, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: distanceData.map(d => d.name),
        axisLabel: { fontSize: 9, rotate: 45 },
      },
      yAxis: [
        { type: 'value', name: '制动距离 (m)', position: 'left' },
        { type: 'value', name: '偏差 (%)', position: 'right', axisLine: { lineStyle: { color: '#9333EA' } } },
      ],
      series: [
        {
          name: '理论',
          type: 'bar',
          data: distanceData.map(d => d.理论),
          itemStyle: { color: '#94A3B8' },
          barWidth: 12,
        },
        {
          name: '实际',
          type: 'bar',
          data: distanceData.map(d => d.实际),
          itemStyle: { color: '#1E40AF' },
          barWidth: 12,
        },
        {
          name: '偏差',
          type: 'line',
          yAxisIndex: 1,
          data: distanceData.map(d => d.偏差),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#9333EA', width: 2 },
          itemStyle: { color: '#9333EA' },
        },
      ],
    };

    distanceChartInstance.current.setOption(distanceOption);

    const handleResize = () => {
      distanceChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [brakeCalculations]);

  useEffect(() => {
    if (!distributionChartRef.current || abnormalDetections.length === 0) return;

    if (!distributionChartInstance.current) {
      distributionChartInstance.current = echarts.init(distributionChartRef.current);
    }

    const distOption: echarts.EChartsOption = {
      title: {
        text: '异常等级分布',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: { orient: 'vertical', left: 10, top: 'center' },
      series: [
        {
          name: '异常等级',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
          data: [
            { value: stats.levelCounts.normal, name: ABNORMAL_LEVEL_LABELS.normal, itemStyle: { color: ABNORMAL_LEVEL_COLORS.normal } },
            { value: stats.levelCounts.warning, name: ABNORMAL_LEVEL_LABELS.warning, itemStyle: { color: ABNORMAL_LEVEL_COLORS.warning } },
            { value: stats.levelCounts.serious, name: ABNORMAL_LEVEL_LABELS.serious, itemStyle: { color: ABNORMAL_LEVEL_COLORS.serious } },
            { value: stats.levelCounts.overload, name: ABNORMAL_LEVEL_LABELS.overload, itemStyle: { color: ABNORMAL_LEVEL_COLORS.overload } },
          ],
        },
      ],
    };

    distributionChartInstance.current.setOption(distOption);

    const handleResize = () => {
      distributionChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [stats.levelCounts, abnormalDetections.length]);

  useEffect(() => {
    if (!typeChartRef.current || abnormalDetections.length === 0) return;

    if (!typeChartInstance.current) {
      typeChartInstance.current = echarts.init(typeChartRef.current);
    }

    const typeColors: Record<string, string> = {
      speed_gap: '#F97316',
      brake_delay: '#EAB308',
      overload: '#DC2626',
      brake_distance: '#9333EA',
      missing_data: '#64748B',
    };

    const typeData = Object.entries(stats.typeCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: ABNORMAL_TYPE_LABELS[type as keyof typeof ABNORMAL_TYPE_LABELS],
        value: count,
        itemStyle: { color: typeColors[type] },
      }));

    const typeOption: echarts.EChartsOption = {
      title: {
        text: '异常类型分布',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: { orient: 'horizontal', bottom: 5 },
      series: [
        {
          name: '异常类型',
          type: 'pie',
          radius: '60%',
          center: ['50%', '45%'],
          itemStyle: { borderRadius: 6 },
          label: { show: true, formatter: '{b}: {d}%', fontSize: 10 },
          data: typeData,
        },
      ],
    };

    typeChartInstance.current.setOption(typeOption);

    const handleResize = () => {
      typeChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [stats.typeCounts, abnormalDetections.length]);

  useEffect(() => {
    if (!trendChartRef.current || inspectionRecords.length === 0) return;

    if (!trendChartInstance.current) {
      trendChartInstance.current = echarts.init(trendChartRef.current);
    }

    const recordsByDate = useMemo(() => {
      const grouped: Record<string, { total: number; pass: number; fail: number }> = {};
      inspectionRecords.forEach(record => {
        const date = record.inspectionDate;
        if (!grouped[date]) {
          grouped[date] = { total: 0, pass: 0, fail: 0 };
        }
        grouped[date].total++;
        const detection = abnormalDetections.find(d => d.recordId === record.id);
        if (detection) {
          if (detection.overallResult === 'pass') {
            grouped[date].pass++;
          } else {
            grouped[date].fail++;
          }
        }
      });
      return Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14);
    }, [inspectionRecords, abnormalDetections]);

    const trendOption: echarts.EChartsOption = {
      title: {
        text: '检验结果趋势（近14天）',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: { data: ['总检验', '合格', '不合格'], bottom: 5 },
      grid: { left: 50, right: 20, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: recordsByDate.map(r => r[0].slice(5)),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value', name: '数量' },
      series: [
        {
          name: '总检验',
          type: 'line',
          stack: 'total',
          data: recordsByDate.map(r => r[1].total),
          smooth: true,
          lineStyle: { color: '#1E40AF', width: 2 },
          itemStyle: { color: '#1E40AF' },
          areaStyle: { color: 'rgba(30, 64, 175, 0.1)' },
        },
        {
          name: '合格',
          type: 'line',
          data: recordsByDate.map(r => r[1].pass),
          smooth: true,
          lineStyle: { color: '#059669', width: 2 },
          itemStyle: { color: '#059669' },
        },
        {
          name: '不合格',
          type: 'line',
          data: recordsByDate.map(r => r[1].fail),
          smooth: true,
          lineStyle: { color: '#DC2626', width: 2 },
          itemStyle: { color: '#DC2626' },
        },
      ],
    };

    trendChartInstance.current.setOption(trendOption);

    const handleResize = () => {
      trendChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [inspectionRecords, abnormalDetections]);

  const avgStats = useMemo(() => {
    const avgDistance = brakeCalculations.length > 0
      ? brakeCalculations.reduce((sum, c) => sum + c.actualBrakeDistance, 0) / brakeCalculations.length
      : 0;
    const avgDeviation = brakeCalculations.length > 0
      ? brakeCalculations.reduce((sum, c) => sum + Math.abs(c.deviationPercent), 0) / brakeCalculations.length
      : 0;
    const passRate = abnormalDetections.length > 0
      ? (abnormalDetections.filter(d => d.overallResult === 'pass').length / abnormalDetections.length) * 100
      : 0;
    return { avgDistance, avgDeviation, passRate };
  }, [brakeCalculations, abnormalDetections]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-900" />
            图表分析
          </h1>
          <p className="text-slate-500 mt-1">多维度分析检验数据，直观展示统计结果</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => processAllRecords()}
            isLoading={isProcessing}
          >
            刷新数据
          </Button>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            导出图表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">平均制动距离</div>
          <div className="text-3xl font-bold text-slate-900">{formatDistance(avgStats.avgDistance)}</div>
          <div className="text-xs text-slate-400 mt-1">共 {brakeCalculations.length} 条有效计算</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">平均偏差率</div>
          <div className={`text-3xl font-bold ${
            avgStats.avgDeviation < 15 ? 'text-emerald-600' :
            avgStats.avgDeviation < 30 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {formatPercent(avgStats.avgDeviation)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            阈值: ±{formatPercent(thresholdConfig.brakeDistanceWarning * 100)} 警告
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500 mb-1">综合合格率</div>
          <div className={`text-3xl font-bold ${
            avgStats.passRate >= 90 ? 'text-emerald-600' :
            avgStats.passRate >= 75 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {formatPercent(avgStats.passRate)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {abnormalDetections.length} 条记录参与判定
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div ref={distanceChartRef} style={{ height: '380px' }} />
        </Card>
        <Card>
          <div ref={trendChartRef} style={{ height: '380px' }} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div ref={distributionChartRef} style={{ height: '380px' }} />
        </Card>
        <Card>
          <div ref={typeChartRef} style={{ height: '380px' }} />
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">阈值配置参考</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">制动距离</p>
            <p className="text-sm font-medium text-slate-900">
              警告 ±{formatPercent(thresholdConfig.brakeDistanceWarning * 100)}
            </p>
            <p className="text-sm font-medium text-red-600">
              严重 ±{formatPercent(thresholdConfig.brakeDistanceSerious * 100)}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">速度缺口</p>
            <p className="text-sm font-medium text-slate-900">
              警告 {thresholdConfig.speedGapWarning} m/s
            </p>
            <p className="text-sm font-medium text-red-600">
              严重 {thresholdConfig.speedGapSerious} m/s
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">制动延迟</p>
            <p className="text-sm font-medium text-slate-900">
              警告 {thresholdConfig.brakeDelayWarning} s
            </p>
            <p className="text-sm font-medium text-red-600">
              严重 {thresholdConfig.brakeDelaySerious} s
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">载荷超限</p>
            <p className="text-sm font-medium text-red-600">
              阈值 {formatPercent(thresholdConfig.overloadThreshold * 100)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              摩擦系数 {thresholdConfig.baseFrictionCoefficient}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
