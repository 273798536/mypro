import { useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ZAxis,
  ReferenceArea,
} from 'recharts';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import { getAnomalyTypeLabel } from '../engine/anomalyDetector';
import { AlertTriangle, Maximize2, Camera, RefreshCw } from 'lucide-react';
import { captureScreenshot, downloadScreenshot } from '../utils/export';

interface ChartDatum {
  x: number;
  originalY?: number;
  interpolatedY?: number;
  error?: number;
  pointType?: 'normal' | 'duplicate' | 'extrapolation' | 'oscillation';
  label?: string;
}

export default function ChartArea() {
  const { config, calculationResult, isCalculating } = useInterpolatorStore();
  const [showErrorChart, setShowErrorChart] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const { mainData, errorData, originalPointsData } = useMemo(() => {
    if (!calculationResult) {
      return { mainData: [], errorData: [], originalPointsData: [] };
    }

    const mainData: ChartDatum[] = calculationResult.interpolatedPoints.map((p) => ({
      x: Number(p.x.toFixed(4)),
      originalY: Number(p.originalY.toFixed(6)),
      interpolatedY: Number(p.y.toFixed(6)),
    }));

    const errorData: ChartDatum[] = calculationResult.interpolatedPoints.map((p) => ({
      x: Number(p.x.toFixed(4)),
      error: Number(p.error.toFixed(8)),
    }));

    const originalPointsData: ChartDatum[] = calculationResult.originalPoints.map((p, i) => ({
      x: Number(p.x.toFixed(4)),
      originalY: Number(p.y.toFixed(6)),
      pointType: p.anomalyType || 'normal',
      label: `点${i}: (${p.x.toFixed(2)}, ${p.y.toFixed(4)})${p.anomalyType ? ` [${getAnomalyTypeLabel(p.anomalyType)}]` : ''}`,
    }));

    return { mainData, errorData, originalPointsData };
  }, [calculationResult]);

  const oscillationAnomaly = calculationResult?.anomalies.find(a => a.type === 'oscillation');
  const extrapolationAnomaly = calculationResult?.anomalies.find(a => a.type === 'extrapolation');

  const edgeMargin = (config.sampleEnd - config.sampleStart) * 0.15;
  const edgeStart = config.sampleStart + edgeMargin;
  const edgeEnd = config.sampleEnd - edgeMargin;

  const handleScreenshot = async () => {
    if (!chartRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureScreenshot('chart-area');
      downloadScreenshot(dataUrl);
    } catch (e) {
      console.error('截图失败:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const getPointColor = (type: string) => {
    switch (type) {
      case 'duplicate': return '#EC4899';
      case 'extrapolation': return '#F59E0B';
      case 'oscillation': return '#EF4444';
      default: return '#10B981';
    }
  };

  const yDomain = useMemo(() => {
    if (mainData.length === 0) return ['auto', 'auto'];
    
    const allY = mainData.flatMap(d => [d.originalY, d.interpolatedY]).filter(v => v !== undefined) as number[];
    if (allY.length === 0) return ['auto', 'auto'];
    
    const min = Math.min(...allY);
    const max = Math.max(...allY);
    const padding = (max - min) * 0.1;
    
    return [min - padding, max + padding];
  }, [mainData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-primary-900/95 backdrop-blur-sm border border-primary-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-primary-200 font-mono text-sm mb-2">x = {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(6)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary-900/95 backdrop-blur-sm border border-primary-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-primary-200 font-mono text-sm">{data.label}</p>
          {data.pointType !== 'normal' && (
            <p className="text-accent-warning text-xs mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              异常点
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="chart-area" ref={chartRef} className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary-100">
            插值结果可视化
          </h2>
          <p className="text-primary-400 text-sm font-mono mt-1">
            f(x) = {config.functionExpression} · {config.order}阶 · {config.method === 'lagrange' ? '拉格朗日' : '牛顿'}插值
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowErrorChart(!showErrorChart)}
            className="px-3 py-2 text-sm bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <Maximize2 size={16} />
            {showErrorChart ? '隐藏误差图' : '显示误差图'}
          </button>
          <button
            onClick={handleScreenshot}
            disabled={isCapturing || !calculationResult}
            className="px-3 py-2 text-sm bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Camera size={16} />
            {isCapturing ? '截图中...' : '导出截图'}
          </button>
        </div>
      </div>

      {isCalculating && (
        <div className="flex items-center justify-center py-12 text-primary-400">
          <RefreshCw className="animate-spin mr-2" size={20} />
          计算中...
        </div>
      )}

      {!isCalculating && calculationResult && (
        <>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mainData}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="interpolatedGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="originalGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                
                {oscillationAnomaly && (
                  <>
                    <ReferenceArea
                      x1={config.sampleStart}
                      x2={edgeStart}
                      y1={yDomain[0]}
                      y2={yDomain[1]}
                      fill="#EC4899"
                      fillOpacity={0.1}
                    />
                    <ReferenceArea
                      x1={edgeEnd}
                      x2={config.sampleEnd}
                      y1={yDomain[0]}
                      y2={yDomain[1]}
                      fill="#EC4899"
                      fillOpacity={0.1}
                    />
                  </>
                )}

                <XAxis
                  dataKey="x"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#475569' }}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#475569' }}
                  axisLine={{ stroke: '#475569' }}
                  domain={yDomain}
                  tickFormatter={(v) => v.toFixed(2)}
                />

                <Tooltip content={<CustomTooltip />} />
                
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="originalY"
                  name="原函数"
                  stroke="url(#originalGradient)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#10B981' }}
                  isAnimationActive={false}
                />

                <Line
                  type="monotone"
                  dataKey="interpolatedY"
                  name="插值多项式"
                  stroke="url(#interpolatedGradient)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: '#8B5CF6' }}
                  isAnimationActive={false}
                />

                <Scatter
                  data={originalPointsData}
                  dataKey="originalY"
                  name="插值节点"
                  isAnimationActive={false}
                >
                  {originalPointsData.map((entry, index) => (
                    <circle
                      key={`dot-${index}`}
                      cx={0}
                      cy={0}
                      r={entry.pointType !== 'normal' ? 7 : 5}
                      fill={getPointColor(entry.pointType || 'normal')}
                      stroke="#0F172A"
                      strokeWidth={2}
                      className={entry.pointType !== 'normal' ? 'animate-pulse' : ''}
                    />
                  ))}
                </Scatter>

                <ZAxis dataKey="pointType" range={[60, 60]} />
                <Tooltip content={<ScatterTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {showErrorChart && (
            <div className="h-48 border-t border-primary-800 pt-4">
              <h3 className="text-sm font-medium text-primary-300 mb-2 font-mono">
                绝对误差曲线 | 最大误差: {calculationResult.maxError.toExponential(4)} | 平均误差: {calculationResult.avgError.toExponential(4)}
              </h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart
                  data={errorData}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="x"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: '#475569' }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: '#475569' }}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(v) => v.toExponential(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    labelStyle={{ color: '#94A3B8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="error"
                    name="绝对误差"
                    stroke="url(#errorGradient)"
                    strokeWidth={2}
                    fill="url(#errorGradient)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {!isCalculating && !calculationResult && (
        <div className="flex-1 flex items-center justify-center text-primary-500">
          <p>点击"开始计算"按钮生成插值结果</p>
        </div>
      )}
    </div>
  );
}
