import { useState } from 'react';
import { Thermometer, Droplets, Wind, Activity, Upload, Table, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuoyData } from '../types';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FormulaPanel } from './FormulaPanel';
import { formulaInfo, biomassFormula, calculateHarvestEstimate } from '../utils/calculations';

interface BuoyDataPanelProps {
  dataList: BuoyData[];
  area: number;
  hasViolation: boolean;
  tideRange: number;
  windSpeed: number;
  waterRecords: any[];
  className?: string;
}

const indicatorConfig = [
  { key: 'temperature', label: '水温', unit: '°C', icon: Thermometer, color: 'text-rose-500' },
  { key: 'salinity', label: '盐度', unit: 'psu', icon: Droplets, color: 'text-cyan-500' },
  { key: 'dissolvedOxygen', label: '溶解氧', unit: 'mg/L', icon: Wind, color: 'text-sky-500' },
  { key: 'pH', label: 'pH值', unit: '', icon: Activity, color: 'text-amber-500' },
  { key: 'chlorophyll', label: '叶绿素a', unit: 'μg/L', icon: Activity, color: 'text-emerald-500' },
  { key: 'turbidity', label: '浊度', unit: 'NTU', icon: Activity, color: 'text-slate-500' },
];

export function BuoyDataPanel({
  dataList,
  area,
  hasViolation,
  tideRange,
  windSpeed,
  waterRecords,
  className,
}: BuoyDataPanelProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [selectedIndicator, setSelectedIndicator] = useState('temperature');

  const estimate = calculateHarvestEstimate(
    area,
    dataList,
    waterRecords,
    hasViolation,
    tideRange,
    windSpeed
  );

  const avgData = dataList.reduce(
    (acc, data) => ({
      temperature: acc.temperature + data.temperature / dataList.length,
      salinity: acc.salinity + data.salinity / dataList.length,
      dissolvedOxygen: acc.dissolvedOxygen + data.dissolvedOxygen / dataList.length,
      pH: acc.pH + data.pH / dataList.length,
      chlorophyll: acc.chlorophyll + data.chlorophyll / dataList.length,
      turbidity: acc.turbidity + data.turbidity / dataList.length,
    }),
    { temperature: 0, salinity: 0, dissolvedOxygen: 0, pH: 0, chlorophyll: 0, turbidity: 0 }
  );

  const chartData = dataList.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    value: d[selectedIndicator as keyof BuoyData] as number,
  }));

  const selectedConfig = indicatorConfig.find(c => c.key === selectedIndicator)!;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity size={20} className="text-sky-600" />
          浮标数据处理
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'table' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Table size={14} />
              数据表格
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'chart' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <LineChart size={14} />
              趋势图
            </button>
          </div>
          <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 flex items-center gap-1.5">
            <Upload size={14} />
            导入数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {indicatorConfig.map(config => {
          const Icon = config.icon;
          const value = avgData[config.key as keyof typeof avgData];
          return (
            <div
              key={config.key}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all',
                selectedIndicator === config.key
                  ? 'border-sky-300 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
              onClick={() => setSelectedIndicator(config.key)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={config.color} />
                <span className="text-xs text-slate-500">{config.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {value.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">{config.unit}</span>
              </p>
            </div>
          );
        })}
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">时间</th>
                  {indicatorConfig.map(config => (
                    <th key={config.key} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {config.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataList.map(data => (
                  <tr key={data.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {new Date(data.timestamp).toLocaleString('zh-CN')}
                    </td>
                    {indicatorConfig.map(config => {
                      const value = data[config.key as keyof BuoyData] as number;
                      return (
                        <td key={config.key} className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-700">
                          {value.toFixed(1)}
                          <span className="text-xs text-slate-400 ml-1">{config.unit}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} ${selectedConfig.unit}`, selectedConfig.label]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedConfig.label}
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <FormulaPanel
        formula={formulaInfo}
        result={estimate.estimatedYield}
        resultUnit={estimate.unit}
        calculation={{
          values: {
            '养殖面积': estimate.breakdown.area,
            '单位面积生物量': estimate.breakdown.biomassPerUnit,
            '成活率': estimate.breakdown.survivalRate / 100,
            '校正系数': estimate.breakdown.correctionFactor / 100,
          },
          breakdown: {
            '养殖面积': estimate.breakdown.area,
            '单位面积生物量': estimate.breakdown.biomassPerUnit,
            '成活率': `${estimate.breakdown.survivalRate}%`,
            '校正系数': (estimate.breakdown.correctionFactor / 100).toFixed(4),
            '估算产量': `${estimate.estimatedYield.toLocaleString()} ${estimate.unit}`,
          },
        }}
        defaultOpen
      />

      <FormulaPanel
        formula={biomassFormula}
        calculation={{
          values: {
            'T (水温)': avgData.temperature,
            'S (盐度)': avgData.salinity,
            'DO (溶解氧)': avgData.dissolvedOxygen,
            'Chl (叶绿素a)': avgData.chlorophyll,
          },
          breakdown: {
            '计算结果': `${estimate.breakdown.biomassPerUnit} kg/亩`,
          },
        }}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-700">收成估算结果</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">置信度</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"
                style={{ width: `${estimate.confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">{estimate.confidence}%</span>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-2">估算产量</p>
          <p className="text-4xl font-bold text-slate-800">
            {estimate.estimatedYield.toLocaleString()}
            <span className="text-lg font-normal text-slate-500 ml-2">{estimate.unit}</span>
          </p>
          <p className="text-sm text-slate-400 mt-2">
            约 {(estimate.estimatedYield / 1000).toFixed(2)} 吨
          </p>
        </div>
      </div>
    </div>
  );
}
