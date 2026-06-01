import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { OilPressureSeries, DeviceLedger } from '../../types';
import dayjs from 'dayjs';

interface PressureChartProps {
  series: OilPressureSeries;
  ledger?: DeviceLedger;
  height?: number;
}

const PressureChart: React.FC<PressureChartProps> = ({
  series,
  ledger,
  height = 320,
}) => {
  const option = useMemo(() => {
    const times = series.dataPoints.map((p) =>
      dayjs(p.timestamp).format('HH:mm:ss')
    );
    const pressures = series.dataPoints.map((p) => p.pressure);
    const temperatures = series.dataPoints.map((p) => p.temperature);

    const markAreas: any[] = [];
    const markLines: any[] = [];

    if (ledger) {
      markLines.push(
        {
          yAxis: ledger.pressureWarning,
          lineStyle: { color: '#FF7D00', type: 'dashed', width: 2 },
          label: {
            formatter: `预警 ${ledger.pressureWarning}MPa`,
            position: 'end',
            color: '#FF7D00',
            fontSize: 11,
          },
        },
        {
          yAxis: ledger.pressureAlarm,
          lineStyle: { color: '#F53F3F', type: 'dashed', width: 2 },
          label: {
            formatter: `报警 ${ledger.pressureAlarm}MPa`,
            position: 'end',
            color: '#F53F3F',
            fontSize: 11,
          },
        }
      );
    }

    series.anomalies.forEach((anomaly) => {
      const startIndex = times.findIndex(
        (t) => dayjs(anomaly.startTime).format('HH:mm:ss') <= t
      );
      const endIndex = times.findIndex(
        (t) => dayjs(anomaly.endTime).format('HH:mm:ss') <= t
      );

      if (startIndex >= 0 && endIndex >= 0) {
        let color = 'rgba(255, 125, 0, 0.15)';
        if (anomaly.severity === 'high') {
          color = 'rgba(245, 63, 63, 0.2)';
        }

        markAreas.push([
          { xAxis: startIndex, itemStyle: { color } },
          { xAxis: endIndex },
        ]);
      }
    });

    return {
      grid: {
        left: 50,
        right: 50,
        top: 40,
        bottom: 40,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#1f2937', fontSize: 12 },
        formatter: (params: any) => {
          const time = params[0].axisValue;
          let html = `<div style="font-weight: 600; margin-bottom: 8px;">${time}</div>`;
          params.forEach((p: any) => {
            const unit = p.seriesName === '油压' ? 'MPa' : '°C';
            const color = p.color;
            html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <span>${p.seriesName}：</span>
              <span style="font-weight: 600;">${p.value}${unit}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        data: ['油压', '油温'],
        top: 8,
        right: 16,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#4b5563' },
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          interval: Math.floor(times.length / 8),
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '压力(MPa)',
          nameTextStyle: { color: '#6b7280', fontSize: 11, padding: [0, 30, 0, 0] },
          min: 10,
          max: 40,
          axisLine: { lineStyle: { color: '#d1d5db' } },
          axisLabel: { color: '#6b7280', fontSize: 11 },
          splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '温度(°C)',
          nameTextStyle: { color: '#6b7280', fontSize: 11, padding: [0, 0, 0, 30] },
          min: 30,
          max: 70,
          axisLine: { lineStyle: { color: '#d1d5db' } },
          axisLabel: { color: '#6b7280', fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '油压',
          type: 'line',
          data: pressures,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#165DFF', width: 2 },
          itemStyle: { color: '#165DFF' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 93, 255, 0.25)' },
                { offset: 1, color: 'rgba(22, 93, 255, 0.02)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: markLines,
          },
          markArea: {
            silent: true,
            data: markAreas,
          },
        },
        {
          name: '油温',
          type: 'line',
          yAxisIndex: 1,
          data: temperatures,
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#F59E0B', width: 1.5 },
          itemStyle: { color: '#F59E0B' },
        },
      ],
    };
  }, [series, ledger]);

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default PressureChart;
