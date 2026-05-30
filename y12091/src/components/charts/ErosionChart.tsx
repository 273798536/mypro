import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { getTimeSeriesData } from '../../utils/erosionEngine';
import { formatTimeShort, formatFlow, formatVolume } from '../../data/mockData';
import { COLORS } from '../../types';

interface ErosionChartProps {
  compareMode?: boolean;
}

export function ErosionChart({ compareMode = false }: ErosionChartProps) {
  const {
    sections,
    flowData,
    sedimentData,
    calculationResult,
    selectedSectionId,
    comparePlan,
  } = useAppStore();

  const timeSeriesData = useMemo(() => {
    if (!calculationResult) return [];
    return getTimeSeriesData(sections, flowData, sedimentData, calculationResult, selectedSectionId);
  }, [calculationResult, sections, flowData, sedimentData, selectedSectionId]);

  const compareTimeSeriesData = useMemo(() => {
    if (!comparePlan?.resultData || !compareMode) return [];
    return getTimeSeriesData(sections, comparePlan.flowData, sedimentData, comparePlan.resultData, selectedSectionId);
  }, [comparePlan, sections, flowData, sedimentData, selectedSectionId, compareMode]);

  const barChartData = useMemo(() => {
    if (!calculationResult) return [];

    return [...sections].sort((a, b) => a.chainage - b.chainage).map((section) => {
      const bedChanges = calculationResult.bedChanges[section.id] || [];
      const totalChange = bedChanges.reduce((a, b) => a + b, 0);

      let compareChange = 0;
      if (comparePlan?.resultData && compareMode) {
        const compareBedChanges = comparePlan.resultData.bedChanges[section.id] || [];
        compareChange = compareBedChanges.reduce((a, b) => a + b, 0);
      }

      return {
        name: section.name,
        chainage: section.chainage,
        冲刷: totalChange > 0 ? totalChange : 0,
        淤积: totalChange < 0 ? Math.abs(totalChange) : 0,
        净变化: totalChange,
        ...(compareMode && comparePlan ? {
          对比冲刷: compareChange > 0 ? compareChange : 0,
          对比淤积: compareChange < 0 ? Math.abs(compareChange) : 0,
        } : {}),
      };
    });
  }, [calculationResult, sections, comparePlan, compareMode]);

  const combinedTimeSeries = useMemo(() => {
    if (!compareMode || compareTimeSeriesData.length === 0) {
      return timeSeriesData.map(d => ({
        ...d,
        timeLabel: formatTimeShort(d.time),
      }));
    }

    return timeSeriesData.map((d, i) => ({
      ...d,
      timeLabel: formatTimeShort(d.time),
      对比流量: compareTimeSeriesData[i]?.flow || 0,
      对比含沙量: compareTimeSeriesData[i]?.sediment || 0,
    }));
  }, [timeSeriesData, compareTimeSeriesData, compareMode]);

  if (!calculationResult) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        暂无计算结果
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">
          流量与含沙量过程 {selectedSectionId && `- ${sections.find(s => s.id === selectedSectionId)?.name}`}
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={combinedTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748B"
              tick={{ fontSize: 10 }}
              interval={Math.floor(combinedTimeSeries.length / 6)}
            />
            <YAxis
              yAxisId="left"
              stroke="#0EA5E9"
              tick={{ fontSize: 10 }}
              label={{ value: '流量(m³/s)', angle: -90, position: 'insideLeft', style: { fill: '#0EA5E9', fontSize: 10 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#F97316"
              tick={{ fontSize: 10 }}
              label={{ value: '含沙量(kg/m³)', angle: 90, position: 'insideRight', style: { fill: '#F97316', fontSize: 10 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="flow"
              name="流量"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={false}
            />
            {compareMode && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="对比流量"
                name="对比流量"
                stroke="#60A5FA"
                strokeWidth={2}
                strokeDasharray="5,5"
                dot={false}
              />
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sediment"
              name="含沙量"
              stroke={COLORS.warning}
              strokeWidth={2}
              dot={false}
            />
            {compareMode && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="对比含沙量"
                name="对比含沙量"
                stroke="#FCD34D"
                strokeWidth={2}
                strokeDasharray="5,5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">累计冲淤量</h4>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={combinedTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748B"
              tick={{ fontSize: 10 }}
              interval={Math.floor(combinedTimeSeries.length / 6)}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 10 }}
              label={{ value: '万m³', angle: -90, position: 'insideLeft', style: { fill: '#94A3B8', fontSize: 10 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => formatVolume(value * 10000)}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area
              type="monotone"
              dataKey="erosion"
              name="冲刷量"
              stroke={COLORS.erosion}
              fill={COLORS.erosion}
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="deposition"
              name="淤积量"
              stroke={COLORS.deposition}
              fill={COLORS.deposition}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">各断面冲淤分布</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              stroke="#64748B"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 10 }}
              label={{ value: 'm', angle: -90, position: 'insideLeft', style: { fill: '#94A3B8', fontSize: 10 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => value.toFixed(4) + ' m'}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="冲刷" fill={COLORS.erosion} radius={[4, 4, 0, 0]} />
            <Bar dataKey="淤积" fill={COLORS.deposition} radius={[4, 4, 0, 0]} />
            {compareMode && (
              <>
                <Bar dataKey="对比冲刷" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="对比淤积" fill="#6EE7B7" radius={[4, 4, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">冲淤统计摘要</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">
              {formatVolume(calculationResult.erosionVolume)}
            </div>
            <div className="text-xs text-red-400/80 mt-1">总冲刷量</div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">
              {formatVolume(calculationResult.depositionVolume)}
            </div>
            <div className="text-xs text-green-400/80 mt-1">总淤积量</div>
          </div>
          <div className="text-center p-3 bg-sky-500/10 rounded-lg border border-sky-500/30 col-span-2">
            <div className={`text-2xl font-bold ${
              calculationResult.depositionVolume - calculationResult.erosionVolume > 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {formatVolume(calculationResult.depositionVolume - calculationResult.erosionVolume)}
            </div>
            <div className="text-xs text-sky-400/80 mt-1">
              净{calculationResult.depositionVolume - calculationResult.erosionVolume > 0 ? '淤积' : '冲刷'}量
            </div>
          </div>
        </div>

        {compareMode && comparePlan && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h5 className="text-xs font-medium text-slate-400 mb-3">与对比方案差异</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-slate-700/50 rounded">
                <div className={`text-lg font-bold ${
                  calculationResult.erosionVolume > comparePlan.resultData.erosionVolume
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}>
                  {calculationResult.erosionVolume > comparePlan.resultData.erosionVolume ? '+' : ''}
                  {formatVolume(calculationResult.erosionVolume - comparePlan.resultData.erosionVolume)}
                </div>
                <div className="text-[10px] text-slate-400">冲刷差异</div>
              </div>
              <div className="text-center p-2 bg-slate-700/50 rounded">
                <div className={`text-lg font-bold ${
                  calculationResult.depositionVolume > comparePlan.resultData.depositionVolume
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {calculationResult.depositionVolume > comparePlan.resultData.depositionVolume ? '+' : ''}
                  {formatVolume(calculationResult.depositionVolume - comparePlan.resultData.depositionVolume)}
                </div>
                <div className="text-[10px] text-slate-400">淤积差异</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
