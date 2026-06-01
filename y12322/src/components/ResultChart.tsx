import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useStore, useActiveMaterial, useActiveResult, useActiveChartData } from '@/store/useStore';

export default function ResultChart() {
  const chartData = useActiveChartData();
  const activeMaterial = useActiveMaterial();
  const activeResult = useActiveResult();
  const selectedMethod = useStore((s) => s.selectedMethod);

  if (!activeMaterial) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        添加函数表达式后显示图表
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        无法生成图表数据
      </div>
    );
  }

  const a = Math.min(activeMaterial.intervalA, activeMaterial.intervalB);
  const b = Math.max(activeMaterial.intervalA, activeMaterial.intervalB);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-300">
            f(x) = <span className="text-amber-300 font-mono">{activeMaterial.expression}</span>
          </h3>
          <span className="text-xs text-slate-500">
            [{a}, {b}]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            selectedMethod === 'simpson'
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {selectedMethod === 'simpson' ? '辛普森法' : '梯形法'}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(v: number) => {
                if (Math.abs(v) >= 1000) return v.toExponential(1);
                return v.toFixed(2);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              formatter={(value: number) => [value.toPrecision(6), 'f(x)']}
              labelFormatter={(label: number) => `x = ${label.toFixed(6)}`}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#fillGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
            <ReferenceLine x={a} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine x={b} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {activeResult && !isNaN(activeResult.result) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">积分近似值</div>
            <div className="text-lg font-mono text-emerald-400 mt-0.5">
              {activeResult.result.toPrecision(10)}
            </div>
          </div>
          <div className="px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">误差估计</div>
            <div className={`text-lg font-mono mt-0.5 ${
              activeResult.errorEstimate > 0.01
                ? 'text-red-400'
                : activeResult.errorEstimate > 0.001
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}>
              {activeResult.errorEstimate.toExponential(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
