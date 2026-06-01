import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Layers, AlertTriangle } from 'lucide-react';
import { useBatchComparison, useAppStore } from '../../store/useAppStore';
import { formatInertia, formatDeviation } from '../../utils/unitConverter';
import { getDeviationColor } from '../../utils/formatters';

export function BatchComparison() {
  const comparisonData = useBatchComparison();
  const { flywheels, inertiaResults } = useAppStore();
  
  const chartData = comparisonData.flatMap(batch => 
    batch.comparisonChartData.map((item, index) => ({
      ...item,
      batch: `${item.batch.slice(-3)}-${index + 1}`,
      fullBatch: item.batch,
    }))
  );
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="industrial-card p-2 text-xs">
          <div className="data-label">批次: {data.fullBatch}</div>
          <div className="font-mono text-industrial-200">
            惯量: {formatInertia(data.inertia)} kg·m²
          </div>
          <div className="font-mono" style={{ color: getDeviationColor(data.deviation) }}>
            偏差: {formatDeviation(data.deviation)}
          </div>
        </div>
      );
    }
    return null;
  };
  
  if (comparisonData.length === 0) {
    return (
      <div className="p-4">
        <p className="text-industrial-500 text-sm">暂无批次对比数据</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-industrial-700">
        <div className="section-title flex items-center gap-2">
          <Layers size={14} />
          批次对比分析
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex">
        <div className="w-2/3 flex flex-col p-4">
          <div className="industrial-card p-3 mb-4">
            <div className="grid grid-cols-3 gap-4">
              {comparisonData.map(batch => (
                <div key={batch.batchNo} className="text-center">
                  <div className="data-label">{batch.batchNo}</div>
                  <div className="data-value text-lg font-mono">
                    {formatInertia(batch.averageInertia)}
                  </div>
                  <div className="text-xs text-industrial-500">
                    标准差: {formatInertia(batch.stdDeviation)}
                  </div>
                  {batch.outliers.length > 0 && (
                    <div className="text-xs text-alert-orange flex items-center justify-center gap-1 mt-1">
                      <AlertTriangle size={10} />
                      {batch.outliers.length} 个异常值
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 min-h-0 industrial-card p-3">
            <div className="section-title text-xs mb-2">各飞轮惯量对比</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A404B" opacity={0.5} />
                <XAxis
                  dataKey="batch"
                  stroke="#525A68"
                  tick={{ fill: '#8A94A6', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  stroke="#525A68"
                  tick={{ fill: '#8A94A6', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  formatter={() => '转动惯量 (kg·m²)'}
                />
                <Bar dataKey="inertia" name="inertia" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getDeviationColor(entry.deviation)}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="w-1/3 border-l border-industrial-700 p-4 overflow-y-auto">
          <div className="section-title text-xs mb-3">详细数据</div>
          {comparisonData.map(batch => (
            <div key={batch.batchNo} className="industrial-card p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-industrial-200">{batch.batchNo}</span>
                <span className="text-xs text-industrial-500">
                  {batch.flywheelIds.length} 个飞轮
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="data-label">平均惯量:</span>
                  <span className="font-mono text-industrial-200">
                    {formatInertia(batch.averageInertia)} kg·m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">标准差:</span>
                  <span className="font-mono text-industrial-300">
                    {formatInertia(batch.stdDeviation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="data-label">变异系数:</span>
                  <span className="font-mono text-industrial-300">
                    {((batch.stdDeviation / batch.averageInertia) * 100).toFixed(2)}%
                  </span>
                </div>
                {batch.outliers.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-industrial-700">
                    <div className="data-label mb-1 flex items-center gap-1 text-alert-orange">
                      <AlertTriangle size={10} />
                      异常飞轮:
                    </div>
                    {batch.outliers.map(owId => {
                      const fw = flywheels.find(f => f.id === owId);
                      const result = inertiaResults.find(r => r.flywheelId === owId);
                      return (
                        <div key={owId} className="flex justify-between py-0.5">
                          <span className="text-industrial-400">{fw?.name || owId}</span>
                          <span className="font-mono text-alert-orange">
                            {result ? formatDeviation(result.deviation) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="industrial-card p-3 mt-4">
            <div className="section-title text-xs mb-2">图例说明</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-alert-green" />
                <span className="text-industrial-400">偏差 {'<'} 2%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-alert-yellow" />
                <span className="text-industrial-400">偏差 2% ~ 5%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-alert-red" />
                <span className="text-industrial-400">偏差 {'>'} 5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
