import { useSimulationStore } from '@/store/useSimulationStore';
import { Coins, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import type { SimulationResult } from '@/types';

function MetricCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: string; unit: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-mono font-bold ${color} data-glow`}>{value}</span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(2);
  return n.toFixed(2);
}

function formatMoneyUnit(n: number): string {
  return n >= 10000 ? '万元' : '元';
}

export default function ResultCards() {
  const { result } = useSimulationStore();
  if (!result) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">模拟结果</h2>
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="纯保费"
          value={formatMoney(result.purePremium)}
          unit={formatMoneyUnit(result.purePremium)}
          icon={Coins}
          color="text-white"
        />
        <MetricCard
          label="毛保费"
          value={formatMoney(result.grossPremium)}
          unit={formatMoneyUnit(result.grossPremium)}
          icon={TrendingUp}
          color="text-accent"
        />
        <MetricCard
          label="综合成本率"
          value={(result.combinedRatio * 100).toFixed(1)}
          unit="%"
          icon={Shield}
          color={result.combinedRatio > 1 ? 'text-warn' : 'text-accent'}
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="VaR 95%"
          value={formatMoney(result.var95)}
          unit={formatMoneyUnit(result.var95)}
          icon={AlertTriangle}
          color="text-warn"
        />
        <MetricCard
          label="VaR 99%"
          value={formatMoney(result.var99)}
          unit={formatMoneyUnit(result.var99)}
          icon={AlertTriangle}
          color="text-warn"
        />
        <MetricCard
          label="TVaR 95%"
          value={formatMoney(result.tvar95)}
          unit={formatMoneyUnit(result.tvar95)}
          icon={AlertTriangle}
          color="text-danger"
        />
        <MetricCard
          label="TVaR 99%"
          value={formatMoney(result.tvar99)}
          unit={formatMoneyUnit(result.tvar99)}
          icon={AlertTriangle}
          color="text-danger"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">均值</div>
          <div className="font-mono text-sm text-white">{formatMoney(result.meanLoss)} {formatMoneyUnit(result.meanLoss)}</div>
        </div>
        <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">标准差</div>
          <div className="font-mono text-sm text-white">{formatMoney(result.stdLoss)} {formatMoneyUnit(result.stdLoss)}</div>
        </div>
        <div className="bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">模拟次数</div>
          <div className="font-mono text-sm text-accent">{result.iterations.toLocaleString()}</div>
        </div>
      </div>

      {result.sampleWarnings.length > 0 && (
        <div className="space-y-2">
          {result.sampleWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-warn/10 border border-warn/20">
              <AlertTriangle className="w-3.5 h-3.5 text-warn mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-warn-light font-medium">{w.type === 'insufficient_sample' ? '样本不足' : w.type === 'thin_tail' ? '尾部稀疏' : '免赔边界'}</div>
                <div className="text-gray-400 mt-0.5">{w.message}</div>
                <div className="text-gray-500 mt-0.5">建议：{w.suggestedAction}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
