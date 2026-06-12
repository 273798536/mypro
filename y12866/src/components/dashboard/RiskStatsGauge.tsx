import { AlertTriangle, ShieldAlert, ShieldQuestion, ShieldCheck } from 'lucide-react';
import type { Declaration, RiskLevel } from '@/types';

interface Props {
  declarations: Declaration[];
}

function StatCard({ label, count, icon, colorClass, delay }: {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  delay: number;
}) {
  return (
    <div className={`card-risk ${colorClass} p-4 stagger-item`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between pl-3">
        <div>
          <div className="text-2xl font-bold font-mono">{count}</div>
          <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
        <div className="opacity-40">{icon}</div>
      </div>
    </div>
  );
}

export default function RiskStatsGauge({ declarations }: Props) {
  const high = declarations.filter(d => d.currentRiskLevel === 'high').length;
  const medium = declarations.filter(d => d.currentRiskLevel === 'medium').length;
  const low = declarations.filter(d => d.currentRiskLevel === 'low').length;
  const anomalies = declarations.reduce((sum, d) => sum + d.boundaryIssues.length, 0);

  const totalGaps = declarations.reduce((sum, d) => sum + d.weatherGaps.filter(g => g.status === 'missing').length, 0);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="高风险" count={high} icon={<ShieldAlert className="w-8 h-8 text-red-300" />} colorClass="card-risk-high" delay={0} />
        <StatCard label="中风险" count={medium} icon={<ShieldQuestion className="w-8 h-8 text-orange-300" />} colorClass="card-risk-medium" delay={100} />
        <StatCard label="低风险" count={low} icon={<ShieldCheck className="w-8 h-8 text-yellow-300" />} colorClass="card-risk-low" delay={200} />
        <StatCard label="边界异常" count={anomalies} icon={<AlertTriangle className="w-8 h-8 text-slate-300" />} colorClass="" delay={300} />
      </div>
      {totalGaps > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>当前有 <strong>{totalGaps}</strong> 项气象数据缺口待补录，不影响已计算结果的准确性</span>
        </div>
      )}
    </div>
  );
}
