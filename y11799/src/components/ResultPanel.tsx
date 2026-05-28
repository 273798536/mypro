import { Activity, TrendingUp, DollarSign, Zap, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useAppStore } from '@/store';
import { getHeatPumpById } from '@/data/heatPumps';

const ResultPanel = () => {
  const { result, copCurve, costCurve, input, alerts } = useAppStore();
  const heatPump = getHeatPumpById(input.heatPumpId);

  const hasErrors = alerts.some(a => a.type === 'error');

  const getCopColor = (cop: number) => {
    if (cop >= 4.5) return 'text-green-400';
    if (cop >= 3.5) return 'text-blue-400';
    if (cop >= 2.5) return 'text-amber-400';
    return 'text-red-400';
  };

  const getCopStatus = (cop: number) => {
    if (cop >= 4.5) return { text: '优秀', color: 'bg-green-500' };
    if (cop >= 3.5) return { text: '良好', color: 'bg-blue-500' };
    if (cop >= 2.5) return { text: '一般', color: 'bg-amber-500' };
    return { text: '较低', color: 'bg-red-500' };
  };

  return (
    <div className="h-full bg-slate-800/50 rounded-xl p-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-bold text-white">估算结果</h2>
      </div>

      {hasErrors ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 font-medium mb-2">参数存在错误</p>
          <p className="text-slate-400 text-sm">请检查左侧参数配置中的红色提示</p>
        </div>
      ) : !result ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Gauge className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400">正在计算...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">COP 能效比</span>
              <span className={`px-2 py-0.5 rounded text-xs text-white ${getCopStatus(result.cop).color}`}>
                {getCopStatus(result.cop).text}
              </span>
            </div>
            <div className={`text-5xl font-bold ${getCopColor(result.cop)} mb-1`}>
              {result.cop}
            </div>
            <div className="text-xs text-slate-400">
              温度修正系数: {result.temperatureCorrectionFactor} | 额定COP: {heatPump?.ratedCOP}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                制热量
              </div>
              <div className="text-xl font-bold text-white">{result.capacity} <span className="text-sm text-slate-400">kW</span></div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Zap className="w-3 h-3" />
                耗电量
              </div>
              <div className="text-xl font-bold text-yellow-400">{result.powerConsumption} <span className="text-sm text-slate-400">kW/h</span></div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <DollarSign className="w-4 h-4" />
              电费估算
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-red-400 mb-1">峰时</div>
                <div className="text-lg font-bold text-white">¥{result.hourlyCost.peak}</div>
                <div className="text-xs text-slate-500">元/小时</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">平时</div>
                <div className="text-lg font-bold text-white">¥{result.hourlyCost.flat}</div>
                <div className="text-xs text-slate-500">元/小时</div>
              </div>
              <div>
                <div className="text-xs text-green-400 mb-1">谷时</div>
                <div className="text-lg font-bold text-white">¥{result.hourlyCost.valley}</div>
                <div className="text-xs text-slate-500">元/小时</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-600/30 to-slate-700/50 rounded-lg p-3 text-center border border-blue-500/20">
              <div className="text-xs text-slate-400 mb-1">日电费</div>
              <div className="text-lg font-bold text-white">¥{result.dailyCost}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600/30 to-slate-700/50 rounded-lg p-3 text-center border border-purple-500/20">
              <div className="text-xs text-slate-400 mb-1">月电费</div>
              <div className="text-lg font-bold text-white">¥{result.monthlyCost}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-600/30 to-slate-700/50 rounded-lg p-3 text-center border border-amber-500/20">
              <div className="text-xs text-slate-400 mb-1">年电费</div>
              <div className="text-lg font-bold text-white">¥{result.annualCost}</div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3">
            <h3 className="text-sm font-medium text-white mb-3">COP-温度曲线</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={copCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="temp" stroke="#64748b" fontSize={10} label={{ value: '室外温度(℃)', position: 'bottom', fill: '#64748b', fontSize: 10 }} />
                  <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [`COP: ${value}`, '能效比']}
                  />
                  <Line
                    type="monotone"
                    dataKey="cop"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3">
            <h3 className="text-sm font-medium text-white mb-3">年度月度电费（北京地区）</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number, name: string, props: { payload: { temp: number } }) => [
                      `¥${value}`,
                      `电费 (${props.payload.temp}℃)`
                    ]}
                  />
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorCost)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              数据来源: {input.sourceInfo}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ResultPanel;
