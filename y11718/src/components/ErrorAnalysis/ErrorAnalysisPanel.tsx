import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertTriangle, Thermometer, Target, TrendingUp, PieChart as PieChartIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { Warning } from '../../types';

const COLORS = ['#06B6D4', '#F97316', '#8B5CF6', '#10B981', '#64748B'];

export default function ErrorAnalysisPanel() {
  const { getCurrentExperiment, calculateResult, excludeOutliers, setExcludeOutliers } = useExperimentStore();
  const currentExperiment = getCurrentExperiment();
  const result = calculateResult();

  const fitChartData = useMemo(() => {
    if (!result) return [];
    return result.linearFitResult.points.map((p) => ({
      x: p.x,
      y: p.y,
      fitted: result.linearFitResult.slope * p.x + result.linearFitResult.intercept,
    }));
  }, [result]);

  const errorPieData = useMemo(() => {
    if (!result) return [];
    const { errorBreakdown } = result;
    return [
      { name: '温度误差', value: errorBreakdown.temperatureError, color: '#06B6D4' },
      { name: '测量误差', value: errorBreakdown.measurementError, color: '#F97316' },
      { name: '频率误差', value: errorBreakdown.frequencyError, color: '#8B5CF6' },
      { name: '离群值影响', value: errorBreakdown.outlierInfluence, color: '#EF4444' },
      { name: '其他误差', value: errorBreakdown.otherErrors, color: '#64748B' },
    ].filter((d) => d.value > 0.1);
  }, [result]);

  const getSeverityColor = (severity: Warning['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'medium':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      case 'low':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    }
  };

  const getWarningIcon = (type: Warning['type']) => {
    switch (type) {
      case 'temperature':
        return <Thermometer className="w-4 h-4" />;
      case 'nodeNumber':
        return <Target className="w-4 h-4" />;
      case 'outlier':
        return <AlertTriangle className="w-4 h-4" />;
      case 'missingData':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (!currentExperiment || !result) {
    return (
      <div className="h-full flex flex-col bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            误差分析
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">请先选择或创建实验数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            误差分析
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeOutliers}
              onChange={(e) => setExcludeOutliers(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            排除离群值
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">实验声速</div>
            <div className="text-xl font-bold text-cyan-400">
              {result.soundSpeed.toFixed(1)} <span className="text-xs text-slate-400">m/s</span>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">理论声速</div>
            <div className="text-xl font-bold text-green-400">
              {result.theoreticalSpeed.toFixed(1)} <span className="text-xs text-slate-400">m/s</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">相对误差</div>
            <div
              className={`text-xl font-bold ${
                result.relativeError < 5 ? 'text-green-400' : result.relativeError < 10 ? 'text-orange-400' : 'text-red-400'
              }`}
            >
              {result.relativeError.toFixed(2)}%
            </div>
          </div>
          <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                result.relativeError < 5 ? 'bg-green-500' : result.relativeError < 10 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(result.relativeError, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">线性拟合</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">
              y = {result.linearFitResult.slope.toFixed(2)}x + {result.linearFitResult.intercept.toFixed(2)}
            </span>
            <span className="text-cyan-400 font-mono">R² = {result.linearFitResult.rSquared.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            线性拟合图
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="节点号"
                  stroke="#64748B"
                  fontSize={10}
                  tick={{ fill: '#64748B' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="管长(cm)"
                  stroke="#64748B"
                  fontSize={10}
                  tick={{ fill: '#64748B' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Scatter name="测量点" data={fitChartData} fill="#06B6D4" />
                <LineChart>
                  <Line
                    type="linear"
                    dataKey="fitted"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    name="拟合线"
                  />
                </LineChart>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-cyan-400" />
            误差来源分解
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={errorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {errorPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, '占比']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {errorPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} {item.value.toFixed(1)}%
              </div>
            ))}
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              警告与提示 ({result.warnings.length})
            </h3>
            <div className="space-y-2">
              {result.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded-lg border ${getSeverityColor(warning.severity)}`}
                >
                  {getWarningIcon(warning.type)}
                  <div className="flex-1">
                    <div className="text-xs font-medium">{warning.message}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      严重程度: {warning.severity === 'high' ? '高' : warning.severity === 'medium' ? '中' : '低'}
                    </div>
                  </div>
                  {warning.severity === 'high' ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 opacity-50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-700/30 rounded-lg p-3">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            实验参数
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">温度</span>
              <span className="text-slate-200">{currentExperiment.temperature}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">频率</span>
              <span className="text-slate-200">{currentExperiment.frequency} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">测量次数</span>
              <span className="text-slate-200">{currentExperiment.measurements.length} 次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">离群值</span>
              <span className={currentExperiment.measurements.some((m) => m.isOutlier) ? 'text-orange-400' : 'text-green-400'}>
                {currentExperiment.measurements.filter((m) => m.isOutlier).length} 个
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
