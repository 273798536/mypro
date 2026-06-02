import { useState, useRef, useEffect } from 'react';
import { Download, BarChart3, TrendingUp, Filter, X, FileText, Image, AlertTriangle, Zap, Thermometer, RotateCcw } from 'lucide-react';
import { useBatteryStore } from '../../store/useBatteryStore';
import { useChartRef } from '../../App';
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

const anomalyTypeOptions = [
  { type: 'interruption', label: '中断重启', icon: AlertTriangle, color: 'text-red-400' },
  { type: 'rate_change', label: '倍率切换', icon: Zap, color: 'text-yellow-400' },
  { type: 'temperature_drift', label: '温度漂移', icon: Thermometer, color: 'text-orange-400' }
];

export const AnalysisToolbar = () => {
  const { 
    currentBatch, 
    fittingParams, 
    exportReport, 
    filters, 
    setFilters,
    resetFilters,
    filteredCycles,
    applyFilters
  } = useBatteryStore();
  const { getChartRef } = useChartRef();
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    applyFilters();
  }, []);

  if (!currentBatch) return null;

  const estimatedEOL = fittingParams ? estimateEndOfLife(fittingParams) : null;

  const isFiltered = 
    filters.chargeRateRange[0] !== 0 ||
    filters.chargeRateRange[1] !== 5 ||
    filters.temperatureRange[0] !== 20 ||
    filters.temperatureRange[1] !== 50 ||
    filters.anomalyTypes.length > 0;

  const toggleAnomalyType = (type: string) => {
    const current = filters.anomalyTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ anomalyTypes: updated });
  };

  const handleExport = (format: 'csv' | 'png') => {
    const chartRef = { current: getChartRef() };
    exportReport(format, chartRef);
    setShowExportMenu(false);
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
            showFilters || isFiltered ? 'bg-primary text-dark' : 'bg-dark-light/80 hover:bg-dark-light'
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
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
              showExportMenu ? 'bg-primary text-dark' : 'bg-dark-light/80 hover:bg-dark-light'
            }`}
          >
            <Download className="w-5 h-5" />
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-2 bg-dark-light rounded-lg border border-dark-lighter shadow-2xl overflow-hidden animate-fade-in min-w-[160px]">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-dark-lighter transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-sm">导出 CSV</div>
                  <div className="text-xs text-gray-500">
                    {isFiltered ? `${filteredCycles.length} 条筛选数据` : '全量数据'}
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleExport('png')}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-dark-lighter transition-colors text-left"
              >
                <Image className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-sm">导出图表 PNG</div>
                  <div className="text-xs text-gray-500">当前筛选条件的曲线图</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {isFiltered && (
          <div className="ml-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 backdrop-blur-sm flex items-center gap-2 border border-yellow-500/30">
            <span className="text-xs text-yellow-400 font-mono">
              {filteredCycles.length} / {currentBatch.cycles.length} 条
            </span>
            <button
              onClick={resetFilters}
              className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
              title="重置筛选"
            >
              <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
            </button>
          </div>
        )}

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
        <div className="absolute top-16 left-4 z-20 w-80 bg-dark-light rounded-xl border border-dark-lighter shadow-2xl animate-fade-in">
          <div className="p-4 border-b border-dark-lighter flex items-center justify-between">
            <h3 className="font-semibold text-sm">数据筛选</h3>
            <div className="flex items-center gap-2">
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  重置
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-dark-lighter rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                充电倍率范围: <span className="text-primary font-mono">{filters.chargeRateRange[0]}C - {filters.chargeRateRange[1]}C</span>
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
                温度范围: <span className="text-primary font-mono">{filters.temperatureRange[0]}°C - {filters.temperatureRange[1]}°C</span>
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
            <div>
              <label className="text-xs text-gray-400 mb-2 block">异常事件类型</label>
              <div className="space-y-2">
                {anomalyTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = filters.anomalyTypes.includes(option.type);
                  return (
                    <button
                      key={option.type}
                      onClick={() => toggleAnomalyType(option.type)}
                      className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-all ${
                        isSelected 
                          ? 'bg-primary/20 border border-primary/30' 
                          : 'bg-dark-lighter/50 hover:bg-dark-lighter border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span className="text-sm">{option.label}</span>
                      {isSelected && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-2 border-t border-dark-lighter">
              <div className="text-xs text-gray-500 text-center">
                当前筛选结果: <span className="text-primary font-mono">{filteredCycles.length}</span> 条记录
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
          {isFiltered && (
            <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
              <p className="text-xs text-yellow-400">
                当前已筛选: {filteredCycles.length} 条数据，对比图显示全量批次
              </p>
            </div>
          )}
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
                    isAnimationActive={false}
                  />
                ))}
                {filteredCycles.length > 0 && (
                  <Line
                    type="monotone"
                    data={filteredCycles.map(c => ({
                      cycle: c.cycleNumber,
                      capacityRetention: c.capacityRetention
                    }))}
                    dataKey="capacityRetention"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    dot={false}
                    name={isFiltered ? '当前筛选数据' : '当前批次'}
                    strokeDasharray={isFiltered ? "10 5" : undefined}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
};
