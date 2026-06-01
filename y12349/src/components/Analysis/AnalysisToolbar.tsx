import { useState } from 'react';
import { Download, BarChart3, TrendingUp, Filter, X } from 'lucide-react';
import { useBatteryStore } from '../../store/useBatteryStore';
import { mockComparisonBatches } from '../../data/mockData';
import { estimateEndOfLife } from '../../utils/fitting';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const AnalysisToolbar = () => {
  const { currentBatch, fittingParams, exportReport, filters, setFilters } = useBatteryStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  if (!currentBatch) return null;

  const estimatedEOL = fittingParams ? estimateEndOfLife(fittingParams) : null;

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
            showFilters ? 'bg-primary text-dark' : 'bg-dark-light/80 hover:bg-dark-light'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
            showComparison ? 'bg-primary text-dark' : 'bg-dark-light/80 hover:bg-dark-light'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => exportReport('csv')}
          className="p-2 rounded-lg bg-dark-light/80 hover:bg-dark-light backdrop-blur-sm transition-all"
        >
          <Download className="w-5 h-5" />
        </button>

        {fittingParams && (
          <div className="ml-2 px-3 py-1.5 rounded-lg bg-dark-light/80 backdrop-blur-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-gray-400">预计EOL:</span>
            <span className="font-mono text-sm text-primary">
              {estimatedEOL} 次
            </span>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="absolute top-16 left-4 z-20 w-72 bg-dark-light rounded-xl border border-dark-lighter shadow-2xl animate-fade-in">
          <div className="p-4 border-b border-dark-lighter flex items-center justify-between">
            <h3 className="font-semibold text-sm">数据筛选</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-dark-lighter rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                充电倍率范围: {filters.chargeRateRange[0]}C - {filters.chargeRateRange[1]}C
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={filters.chargeRateRange[0]}
                  onChange={(e) => setFilters({
                    chargeRateRange: [parseFloat(e.target.value), filters.chargeRateRange[1]]
                  })}
                  className="flex-1"
                />
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={filters.chargeRateRange[1]}
                  onChange={(e) => setFilters({
                    chargeRateRange: [filters.chargeRateRange[0], parseFloat(e.target.value)]
                  })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                温度范围: {filters.temperatureRange[0]}°C - {filters.temperatureRange[1]}°C
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={20}
                  max={60}
                  value={filters.temperatureRange[0]}
                  onChange={(e) => setFilters({
                    temperatureRange: [parseInt(e.target.value), filters.temperatureRange[1]]
                  })}
                  className="flex-1"
                />
                <input
                  type="range"
                  min={20}
                  max={60}
                  value={filters.temperatureRange[1]}
                  onChange={(e) => setFilters({
                    temperatureRange: [filters.temperatureRange[0], parseInt(e.target.value)]
                  })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showComparison && (
        <div className="absolute top-16 left-4 z-20 w-96 bg-dark-light rounded-xl border border-dark-lighter shadow-2xl animate-fade-in">
          <div className="p-4 border-b border-dark-lighter flex items-center justify-between">
            <h3 className="font-semibold text-sm">批次对比</h3>
            <button
              onClick={() => setShowComparison(false)}
              className="p-1 hover:bg-dark-lighter rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                />
                <YAxis
                  domain={[60, 100]}
                  stroke="#64748B"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {mockComparisonBatches.map((batch, i) => (
                  <Line
                    key={batch.id}
                    data={batch.data}
                    type="monotone"
                    dataKey="capacityRetention"
                    stroke={['#06B6D4', '#F59E0B', '#10B981'][i]}
                    strokeWidth={2}
                    dot={false}
                    name={batch.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
};
