import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EstimationResult, RadiationReading, MaterialBatch, AnomalyRecord, AnomalyType } from '../types';
import { COLORS, CHART_THEME, ANOMALY_TYPE_LABELS } from '../constants';

interface ChartDataItem {
  result: EstimationResult;
  reading: RadiationReading;
  batch: MaterialBatch | undefined;
  anomaly: AnomalyRecord | undefined;
}

interface TemperatureChartProps {
  data: ChartDataItem[];
}

const BATCH_COLORS = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#14C9C9'];

const ANOMALY_MARKERS: Record<AnomalyType, { symbol: string; color: string; label: string }> = {
  [AnomalyType.SENSOR_DRIFT]: { symbol: 'diamond', color: COLORS.danger, label: ANOMALY_TYPE_LABELS[AnomalyType.SENSOR_DRIFT] },
  [AnomalyType.EMISSIVITY_MISSING]: { symbol: 'circle', color: '#FF7D00', label: ANOMALY_TYPE_LABELS[AnomalyType.EMISSIVITY_MISSING] },
  [AnomalyType.BATCH_MISMATCH]: { symbol: 'rect', color: '#F7BA1E', label: ANOMALY_TYPE_LABELS[AnomalyType.BATCH_MISMATCH] },
  [AnomalyType.FIELD_MISSING]: { symbol: 'triangle', color: '#86909C', label: ANOMALY_TYPE_LABELS[AnomalyType.FIELD_MISSING] },
};

const TemperatureChart: React.FC<TemperatureChartProps> = ({ data }) => {
  const option = useMemo(() => {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.reading.readingTime).getTime() - new Date(b.reading.readingTime).getTime()
    );

    const batchMap = new Map<string, ChartDataItem[]>();
    sortedData.forEach((item) => {
      const batchKey = item.batch?.batchNo || '未知批次';
      if (!batchMap.has(batchKey)) {
        batchMap.set(batchKey, []);
      }
      batchMap.get(batchKey)!.push(item);
    });

    const series: any[] = [];
    const batchColors = BATCH_COLORS;
    let colorIndex = 0;

    batchMap.forEach((batchData, batchNo) => {
      const color = batchColors[colorIndex % batchColors.length];
      colorIndex++;

      const normalData = batchData
        .filter((item) => !item.result.isIsolated)
        .map((item) => [new Date(item.reading.readingTime).getTime(), item.result.estimatedTemp]);

      const isolatedData = batchData
        .filter((item) => item.result.isIsolated)
        .map((item) => [new Date(item.reading.readingTime).getTime(), item.result.estimatedTemp]);

      if (normalData.length > 0) {
        series.push({
          name: `${batchNo}`,
          type: 'line',
          data: normalData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: color,
          },
          itemStyle: {
            color: color,
          },
        });
      }

      if (isolatedData.length > 0) {
        series.push({
          name: `${batchNo} (隔离)`,
          type: 'line',
          data: isolatedData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: color,
            opacity: 0.6,
          },
          itemStyle: {
            color: color,
            opacity: 0.6,
          },
        });
      }

      const anomalyMarkData: any[] = [];
      batchData.forEach((item) => {
        if (item.anomaly?.type && ANOMALY_MARKERS[item.anomaly.type]) {
          const marker = ANOMALY_MARKERS[item.anomaly.type];
          anomalyMarkData.push({
            name: marker.label,
            coord: [new Date(item.reading.readingTime).getTime(), item.result.estimatedTemp],
            value: item.result.estimatedTemp,
            itemStyle: {
              color: marker.color,
            },
            symbol: marker.symbol,
            symbolSize: 12,
          });
        }
      });

      if (anomalyMarkData.length > 0) {
        series.push({
          name: `${batchNo} - 异常标记`,
          type: 'scatter',
          data: anomalyMarkData,
          symbolSize: 12,
          tooltip: {
            formatter: (params: any) => {
              return `${params.name}<br/>时间: ${new Date(params.data.coord[0]).toLocaleString()}<br/>温度: ${params.data.coord[1].toFixed(2)}°C`;
            },
          },
        });
      }
    });

    return {
      ...CHART_THEME,
      title: {
        text: '温度趋势曲线',
        left: 'center',
        textStyle: {
          color: COLORS.text,
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        textStyle: {
          color: COLORS.text,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const time = new Date(params[0].axisValue).toLocaleString();
          let result = `<div style="font-weight: 600; margin-bottom: 8px;">${time}</div>`;
          params.forEach((p: any) => {
            if (p.seriesType === 'line') {
              result += `<div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${p.color}; margin-right: 8px;"></span>
                <span>${p.seriesName}: </span>
                <span style="font-weight: 600; margin-left: 4px;">${p.value[1].toFixed(2)}°C</span>
              </div>`;
            } else if (p.seriesType === 'scatter') {
              result += `<div style="display: flex; align-items: center; margin: 4px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${p.color}; margin-right: 8px;"></span>
                <span>${p.seriesName}: </span>
                <span style="font-weight: 600; margin-left: 4px;">${p.data.coord[1].toFixed(2)}°C</span>
              </div>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: Array.from(batchMap.keys()).flatMap((key) => [key, `${key} (隔离)`]).filter((name) =>
          series.some((s) => s.name === name)
        ),
        top: 40,
        textStyle: {
          color: COLORS.textSecondary,
        },
        type: 'scroll',
        pageTextStyle: {
          color: COLORS.textSecondary,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: 100,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        name: '时间',
        nameTextStyle: {
          color: COLORS.textSecondary,
        },
        axisLine: {
          lineStyle: {
            color: COLORS.border,
          },
        },
        axisLabel: {
          color: COLORS.textSecondary,
          formatter: (value: number) => {
            return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          },
        },
        splitLine: {
          lineStyle: {
            color: COLORS.border,
            opacity: 0.3,
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '估算温度 (°C)',
        nameTextStyle: {
          color: COLORS.textSecondary,
        },
        axisLine: {
          lineStyle: {
            color: COLORS.border,
          },
        },
        axisLabel: {
          color: COLORS.textSecondary,
          formatter: '{value}°C',
        },
        splitLine: {
          lineStyle: {
            color: COLORS.border,
            opacity: 0.3,
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomLock: false,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 24,
          bottom: 10,
          borderColor: COLORS.border,
          fillerColor: `${COLORS.primary}30`,
          handleStyle: {
            color: COLORS.primary,
          },
          textStyle: {
            color: COLORS.textSecondary,
          },
        },
      ],
      series,
    };
  }, [data]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <ReactECharts
        option={option}
        style={{ height: '450px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
};

export default TemperatureChart;
