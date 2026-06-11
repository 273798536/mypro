import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useDataStore } from '@/store/useDataStore';
import { useAppStore } from '@/store/useAppStore';
import { BoomPoint } from '@/types';
import { detectMixedUnits, getAnomalyTypeLabel } from '@/utils/unit';
import { formatDateTime } from '@/utils/date';

const BOOM_COLORS = [
  '#00d4ff',
  '#2ed573',
  '#ffa502',
  '#a55eea',
  '#ff6b81',
];

export default function TimelineChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { points } = useDataStore();
  const { viewMode, filters, selectedPointId, selectPoint } = useAppStore();

  const mixedUnitPointIds = useMemo(() => {
    const mixed = detectMixedUnits(points);
    return new Set(mixed.map(m => m.pointId));
  }, [points]);

  const filteredPoints = useMemo(() => {
    let result = [...points];

    if (filters.boomIds.length > 0) {
      result = result.filter(p => filters.boomIds.includes(p.boomId));
    }

    if (filters.timeRangeStart) {
      result = result.filter(p => p.timestamp >= filters.timeRangeStart!);
    }
    if (filters.timeRangeEnd) {
      result = result.filter(p => p.timestamp <= filters.timeRangeEnd!);
    }

    if (viewMode === 'anomaly') {
      result = result.filter(p => p.isAnomaly);
    } else if (viewMode === 'normal') {
      result = result.filter(p => !p.isAnomaly);
    } else if (viewMode === 'mixed') {
      result = result.filter(p => mixedUnitPointIds.has(p.id));
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }, [points, viewMode, filters, mixedUnitPointIds]);

  const chartData = useMemo(() => {
    const boomGroups = new Map<string, BoomPoint[]>();
    for (const p of filteredPoints) {
      const group = boomGroups.get(p.boomId) || [];
      group.push(p);
      boomGroups.set(p.boomId, group);
    }

    const series: echarts.SeriesOption[] = [];
    const anomalyMarkPoints: echarts.MarkPointComponentOption['data'] = [];
    const mixedMarkPoints: echarts.MarkPointComponentOption['data'] = [];

    let colorIdx = 0;
    for (const [boomId, boomPoints] of boomGroups) {
      const color = BOOM_COLORS[colorIdx % BOOM_COLORS.length];
      colorIdx++;

      const data = boomPoints.map(p => [p.timestamp, p.value]);

      const pointAnomalies = boomPoints
        .filter(p => p.isAnomaly)
        .map(p => ({
          name: `异常: ${getAnomalyTypeLabel(p.anomalyType)}`,
          coord: [p.timestamp, p.value],
          value: getAnomalyTypeLabel(p.anomalyType),
          itemStyle: { color: '#ff4757' },
          symbol: 'circle',
          symbolSize: 12,
          pointId: p.id,
        } as any));

      const pointMixed = boomPoints
        .filter(p => mixedUnitPointIds.has(p.id))
        .map(p => ({
          name: '单位混写',
          coord: [p.timestamp, p.value],
          value: '混写',
          itemStyle: { color: '#ffa502' },
          symbol: 'diamond',
          symbolSize: 10,
          pointId: p.id,
        } as any));

      anomalyMarkPoints.push(...pointAnomalies);
      mixedMarkPoints.push(...pointMixed);

      series.push({
        name: boomId,
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 3 },
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 8,
          data: [
            ...pointAnomalies,
            ...pointMixed,
          ],
          label: {
            show: false,
          },
        },
      });
    }

    return { series, anomalyMarkPoints, mixedMarkPoints };
  }, [filteredPoints, mixedUnitPointIds]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');
    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 28, 43, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f0ff',
          fontSize: 12,
        },
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.3)',
          },
          label: {
            backgroundColor: '#1a2332',
            color: '#e8f0ff',
          },
        },
      },
      legend: {
        data: [],
        top: 10,
        right: 20,
        textStyle: {
          color: '#8892b0',
          fontSize: 12,
        },
        itemWidth: 20,
        itemHeight: 2,
      },
      grid: {
        left: 60,
        right: 30,
        top: 50,
        bottom: 60,
      },
      xAxis: {
        type: 'time',
        axisLine: {
          lineStyle: { color: 'rgba(0, 212, 255, 0.2)' },
        },
        axisLabel: {
          color: '#8892b0',
          fontSize: 11,
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.08)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '载荷 (kN)',
        nameTextStyle: {
          color: '#8892b0',
          fontSize: 11,
          padding: [0, 0, 0, 40],
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#8892b0',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.08)',
            type: 'dashed',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 10,
          height: 20,
          borderColor: 'rgba(0, 212, 255, 0.2)',
          fillerColor: 'rgba(0, 212, 255, 0.1)',
          handleStyle: {
            color: '#00d4ff',
          },
          textStyle: {
            color: '#8892b0',
            fontSize: 10,
          },
        },
      ],
      series: [],
    });

    const handleClick = (params: any) => {
      if (params.componentType === 'markPoint' && params.data?.pointId) {
        selectPoint(params.data.pointId);
      } else if (params.componentType === 'series') {
        const timestamp = params.value?.[0];
        const seriesName = params.seriesName;
        if (timestamp && seriesName) {
          const point = filteredPoints.find(
            p => p.boomId === seriesName && Math.abs(p.timestamp - timestamp) < 15000
          );
          if (point) {
            selectPoint(point.id);
          }
        }
      }
    };

    chartInstance.current.on('click', handleClick);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    const legendData = chartData.series.map(s => s.name as string);

    chartInstance.current.setOption({
      legend: { data: legendData },
      series: chartData.series,
    });
  }, [chartData]);

  useEffect(() => {
    if (!chartInstance.current || !selectedPointId) return;

    const point = filteredPoints.find(p => p.id === selectedPointId);
    if (point) {
      chartInstance.current.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex: filteredPoints.filter(p => p.boomId === point.boomId).findIndex(p => p.id === selectedPointId),
      });
    }
  }, [selectedPointId, filteredPoints]);

  const selectedPoint = filteredPoints.find(p => p.id === selectedPointId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-glow/20">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-text-primary">时序曲线</h2>
          {selectedPoint && (
            <div className="text-xs text-text-secondary">
              已选中: <span className="text-tech-blue font-mono">{selectedPoint.boomId}</span>
              <span className="mx-1">·</span>
              <span className="text-text-muted">{formatDateTime(selectedPoint.timestamp)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-alert-red" /> 异常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rotate-45 bg-warning-yellow" /> 单位混写
          </span>
        </div>
      </div>
      <div ref={chartRef} className="flex-1 min-h-0" id="timeline-chart" />
    </div>
  );
}
