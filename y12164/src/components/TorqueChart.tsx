import { useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useAppStore } from '../store/appStore';
import { formatTorqueValue } from '../utils/torqueEngine';

interface TorqueChartProps {
  height?: number;
}

export const TorqueChart = ({ height = 300 }: TorqueChartProps) => {
  const chartRef = useRef<ReactECharts>(null);
  const { torqueResults, selectedJointId, robotConfig } = useAppStore();

  const joint = selectedJointId
    ? robotConfig?.joints.find((j) => j.id === selectedJointId)
    : null;

  const option = useMemo((): EChartsOption => {
    const results = selectedJointId
      ? torqueResults.filter((r) => r.jointId === selectedJointId)
      : torqueResults.slice(0, 3);

    const series = results.map((result) => {
      const jointConfig = robotConfig?.joints.find((j) => j.id === result.jointId);
      return {
        name: result.jointName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: jointConfig?.color || '#165DFF',
        },
        itemStyle: {
          color: jointConfig?.color || '#165DFF',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${jointConfig?.color || '#165DFF'}40` },
              { offset: 1, color: `${jointConfig?.color || '#165DFF'}00` },
            ],
          },
        },
        data: result.curve.map((p) => [p.timestamp, p.value.toFixed(2)]),
        markLine: result.isOverLimit
          ? {
              silent: false,
              symbol: ['none', 'none'],
              lineStyle: {
                color: '#F53F3F',
                width: 2,
                type: 'dashed',
              },
              label: {
                formatter: `阈值: ${formatTorqueValue(result.threshold)}`,
                color: '#F53F3F',
                fontSize: 12,
              },
              data: [{ yAxis: result.threshold }],
            }
          : undefined,
        markPoint:
          result.overLimitPoints.length > 0
            ? {
                symbol: 'circle',
                symbolSize: 12,
                itemStyle: {
                  color: '#F53F3F',
                  borderColor: '#fff',
                  borderWidth: 2,
                },
                label: {
                  show: true,
                  formatter: '超限',
                  color: '#fff',
                  fontSize: 10,
                },
                data: result.overLimitPoints.slice(0, 5).map((ts) => {
                  const point = result.curve.find((p) => p.timestamp === ts);
                  return {
                    coord: [ts, point?.value || 0],
                    value: `${((point?.value || 0) / result.threshold * 100 - 100).toFixed(1)}%`,
                  };
                }),
              }
            : undefined,
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(29, 33, 41, 0.95)',
        borderColor: '#4E5969',
        borderWidth: 1,
        textStyle: {
          color: '#E5E6EB',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">时间: ${params[0].axisValue}ms</div>`;
          params.forEach((p: any) => {
            result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${p.color};"></span>
              <span>${p.seriesName}:</span>
              <span style="font-weight: bold;">${formatTorqueValue(parseFloat(p.value[1]))}</span>
            </div>`;
          });
          return result;
        },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: {
          color: '#86909C',
          fontSize: 12,
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 40,
      },
      xAxis: {
        type: 'value',
        name: '时间 (ms)',
        nameTextStyle: {
          color: '#86909C',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#4E5969',
          },
        },
        axisLabel: {
          color: '#86909C',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
        },
        splitLine: {
          lineStyle: {
            color: '#272E3B',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '扭矩 (N·m)',
        nameTextStyle: {
          color: '#86909C',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#4E5969',
          },
        },
        axisLabel: {
          color: '#86909C',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
        },
        splitLine: {
          lineStyle: {
            color: '#272E3B',
            type: 'dashed',
          },
        },
      },
      series,
    };
  }, [torqueResults, selectedJointId, robotConfig]);

  if (torqueResults.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-industrial-700 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-industrial-300 text-sm">暂无扭矩数据</p>
          <p className="text-industrial-400 text-xs mt-2">请先执行扭矩验算</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-industrial-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white font-mono">
            扭矩曲线 {selectedJointId && `- ${joint?.name}`}
          </h3>
          <p className="text-xs text-industrial-300 mt-1">
            {selectedJointId ? '单个关节详细曲线' : '多关节对比曲线（点击3D模型关节查看详细）'}
          </p>
        </div>
        {joint && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="data-label">最大扭矩</p>
              <p className="data-value text-danger-500">
                {formatTorqueValue(torqueResults.find((r) => r.jointId === selectedJointId)?.maxTorque || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="data-label">阈值</p>
              <p className="data-value text-warning-500">
                {formatTorqueValue(joint.maxTorque)}
              </p>
            </div>
          </div>
        )}
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: height - 80, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};
