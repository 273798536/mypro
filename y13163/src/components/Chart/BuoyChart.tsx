import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  Cell,
} from 'recharts';
import { useDataStore } from '@/store/useDataStore';
import { useParamStore } from '@/store/useParamStore';
import { formatTimestamp, formatErrorValue } from '@/utils/format';
import { dataStatusColors, anomalyTypeColors } from '@/utils/anomaly';
import type { BuoyDataPoint, AnomalyPoint } from '@/types';

interface ChartDataPoint {
  id: string;
  timestamp: string;
  displayTime: string;
  waveHeight: number;
  errorValue: number;
  status: BuoyDataPoint['status'];
  hasAnomaly: boolean;
  anomalyType?: AnomalyPoint['type'];
  isSuspectedNoise?: boolean;
}

export default function BuoyChart() {
  const { buoyData, anomalies, selectedDataId, selectDataAndAnomaly } = useDataStore();
  const { getCurrentVersionData } = useParamStore();
  const currentVersion = getCurrentVersionData();

  const chartData = useMemo(() => {
    return buoyData.map((point) => {
      const pointAnomalies = anomalies.filter((a) => a.dataId === point.id);
      const hasAnomaly = pointAnomalies.length > 0;
      const primaryAnomaly = pointAnomalies[0];

      return {
        id: point.id,
        timestamp: point.timestamp,
        displayTime: formatTimestamp(point.timestamp).split(' ')[1],
        waveHeight: point.waveHeight,
        errorValue: point.errorValue,
        status: point.status,
        hasAnomaly,
        anomalyType: primaryAnomaly?.type,
        isSuspectedNoise: primaryAnomaly?.isSuspectedNoise,
      };
    });
  }, [buoyData, anomalies]);

  const boundaryValues = currentVersion?.boundaryValues || [];
  const waveHeightMax = boundaryValues.find((b) => b.name === '波高上限')?.value || 15;
  const errorThreshold = boundaryValues.find((b) => b.name === '误差阈值')?.value || 0.5;

  const handleClick = (data: ChartDataPoint) => {
    const pointAnomalies = anomalies.filter((a) => a.dataId === data.id);
    const anomalyId = pointAnomalies.length > 0 ? pointAnomalies[0].id : null;
    selectDataAndAnomaly(data.id, anomalyId);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    const point = buoyData.find((b) => b.id === data.id);
    if (!point) return null;

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-cyan-glow/30 rounded-lg p-4 min-w-64 shadow-xl">
        <div className="text-xs text-slate-400 mb-2">{formatTimestamp(point.timestamp)}</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">波高：</span>
            <span className="text-cyan-glow font-mono">{point.waveHeight.toFixed(2)} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">波周期：</span>
            <span className="text-white font-mono">{point.wavePeriod.toFixed(1)} s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">误差值：</span>
            <span
              className={`font-mono ${Math.abs(point.errorValue) > errorThreshold ? 'text-warning-orange' : 'text-white'}`}
            >
              {formatErrorValue(point.errorValue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">状态：</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${dataStatusColors[point.status]}20`, color: dataStatusColors[point.status] }}
            >
              {point.status === 'normal' ? '正常' : point.status === 'warning' ? '警告' : point.status === 'error' ? '异常' : '已处理'}
            </span>
          </div>
          {data.hasAnomaly && (
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">异常类型：</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: data.anomalyType ? `${anomalyTypeColors[data.anomalyType]}20` : 'transparent',
                    color: data.anomalyType ? anomalyTypeColors[data.anomalyType] : 'white',
                  }}
                >
                  {data.anomalyType === 'extreme' ? '极端值' : data.anomalyType === 'noise' ? '噪声' : data.anomalyType === 'drift' ? '漂移' : '数据缺失'}
                  {data.isSuspectedNoise ? ' (疑似噪声)' : ''}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">来源：</span>
            <span className="text-white">{point.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">参数版本：</span>
            <span className="text-cyan-glow">{point.attribution}</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500 text-center">点击查看详情</div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">浮标数据时序图</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-cyan-glow"></div>
            <span className="text-slate-400">波高 (m)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-warning-orange"></div>
            <span className="text-slate-400">误差值 (m)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error-red animate-pulse"></div>
            <span className="text-slate-400">异常点</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey="displayTime"
              stroke="#64748B"
              tick={{ fontSize: 10, fill: '#64748B' }}
              interval={11}
            />
            <YAxis
              yAxisId="waveHeight"
              stroke="#64748B"
              tick={{ fontSize: 10, fill: '#64748B' }}
              label={{ value: '波高 (m)', angle: -90, position: 'insideLeft', fill: '#00D4FF', fontSize: 11 }}
              domain={[0, 'auto']}
            />
            <YAxis
              yAxisId="errorValue"
              orientation="right"
              stroke="#64748B"
              tick={{ fontSize: 10, fill: '#64748B' }}
              label={{ value: '误差 (m)', angle: 90, position: 'insideRight', fill: '#FF6B35', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#00D4FF40' }} />

            <ReferenceLine
              yAxisId="waveHeight"
              y={waveHeightMax}
              stroke="#FF6B35"
              strokeDasharray="5 5"
              label={{ value: `波高上限 ${waveHeightMax}m`, fill: '#FF6B35', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              yAxisId="errorValue"
              y={errorThreshold}
              stroke="#FF3D57"
              strokeDasharray="3 3"
              label={{ value: `+${errorThreshold}m`, fill: '#FF3D57', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              yAxisId="errorValue"
              y={-errorThreshold}
              stroke="#FF3D57"
              strokeDasharray="3 3"
              label={{ value: `-${errorThreshold}m`, fill: '#FF3D57', fontSize: 10, position: 'insideBottomRight' }}
            />

            <Line
              yAxisId="waveHeight"
              type="monotone"
              dataKey="waveHeight"
              stroke="#00D4FF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00D4FF', stroke: '#fff', strokeWidth: 2 }}
              name="波高"
            />

            <Line
              yAxisId="errorValue"
              type="monotone"
              dataKey="errorValue"
              stroke="#FF6B35"
              strokeWidth={1.5}
              dot={false}
              opacity={0.8}
              name="误差值"
            />

            <Scatter
              yAxisId="waveHeight"
              dataKey="waveHeight"
              data={chartData.filter((d) => d.hasAnomaly)}
              onClick={(entry) => handleClick(entry as ChartDataPoint)}
            >
              {chartData
                .filter((d) => d.hasAnomaly)
                .map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.anomalyType ? anomalyTypeColors[entry.anomalyType] : '#FF3D57'}
                    stroke="#fff"
                    strokeWidth={2}
                    className={selectedDataId === entry.id ? 'animate-pulse' : ''}
                  />
                ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
