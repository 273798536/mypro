import { useMemo } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { FileWarning, ShieldAlert, TrendingUp, AlertCircle } from 'lucide-react';

export default function MaterialTrace() {
  const { result, policies } = useSimulationStore();

  const traceData = useMemo(() => {
    if (!result || result.extremeClaims.length === 0) return null;

    const byPolicy = new Map<string, { count: number; totalRaw: number; totalCapped: number; lines: Set<string>; severities: Map<string, number> }>();
    const byLine = new Map<string, { count: number; totalRaw: number; interceptTypes: Map<string, number> }>();
    const byInterceptType = new Map<string, number>();

    result.extremeClaims.forEach((claim) => {
      if (!byPolicy.has(claim.sourcePolicyId)) {
        byPolicy.set(claim.sourcePolicyId, { count: 0, totalRaw: 0, totalCapped: 0, lines: new Set(), severities: new Map() });
      }
      const pd = byPolicy.get(claim.sourcePolicyId)!;
      pd.count++;
      pd.totalRaw += claim.rawAmount;
      pd.totalCapped += claim.cappedAmount;
      pd.lines.add(claim.sourceField);
      pd.severities.set(claim.severity, (pd.severities.get(claim.severity) ?? 0) + 1);

      if (!byLine.has(claim.sourceField)) {
        byLine.set(claim.sourceField, { count: 0, totalRaw: 0, interceptTypes: new Map() });
      }
      const ld = byLine.get(claim.sourceField)!;
      ld.count++;
      ld.totalRaw += claim.rawAmount;
      ld.interceptTypes.set(claim.interceptType, (ld.interceptTypes.get(claim.interceptType) ?? 0) + 1);

      byInterceptType.set(claim.interceptType, (byInterceptType.get(claim.interceptType) ?? 0) + 1);
    });

    const highRiskPolicies = [...byPolicy.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const lineRisk = [...byLine.entries()]
      .sort((a, b) => b[1].totalRaw - a[1].totalRaw);

    return { highRiskPolicies, lineRisk, byInterceptType };
  }, [result]);

  if (!result || !traceData) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        请先运行模拟，然后在此查看材料追溯
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <FileWarning className="w-3.5 h-3.5 text-warn" />
        材料追溯
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {[...traceData.byInterceptType.entries()].map(([type, count]) => {
          const config = {
            deductible: { label: '免赔拦截', icon: ShieldAlert, color: 'text-warn', bg: 'bg-warn/10' },
            limit: { label: '限额封顶', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            uncaught: { label: '未被拦截', icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
          }[type] ?? { label: type, icon: AlertCircle, color: 'text-gray-400', bg: 'bg-surface-100' };
          const Icon = config.icon;
          return (
            <div key={type} className={`${config.bg} rounded-xl px-4 py-3 border border-surface-200`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <span className="text-xs text-gray-400">{config.label}</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${config.color}`}>{count}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">高风险来源保单</h3>
        <div className="space-y-2">
          {traceData.highRiskPolicies.map(([policyId, data]) => {
            const policy = policies.find(p => p.id === policyId);
            const criticalCount = data.severities.get('critical') ?? 0;
            const highCount = data.severities.get('high') ?? 0;
            return (
              <div key={policyId} className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-accent font-semibold">{policyId}</span>
                    <span className="text-xs text-gray-500">{[...data.lines].join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {criticalCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-danger/20 text-danger-light text-[10px] font-mono">
                        严重 ×{criticalCount}
                      </span>
                    )}
                    {highCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-warn/20 text-warn-light text-[10px] font-mono">
                        高 ×{highCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">出现次数：</span>
                    <span className="font-mono text-white">{data.count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">原始金额合计：</span>
                    <span className="font-mono text-warn">{(data.totalRaw / 10000).toFixed(1)}万</span>
                  </div>
                  <div>
                    <span className="text-gray-500">调整后合计：</span>
                    <span className="font-mono text-accent">{(data.totalCapped / 10000).toFixed(1)}万</span>
                  </div>
                </div>
                {policy && (
                  <div className="mt-2 text-[10px] text-gray-600 border-t border-surface-200 pt-1.5">
                    保单详情 → 保费: {policy.premium.toLocaleString()} | 保额: {policy.sumInsured.toLocaleString()} | 赔付记录: {policy.claimCount}笔
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">按险种分组</h3>
        <div className="space-y-2">
          {traceData.lineRisk.map(([line, data]) => (
            <div key={line} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-2.5 border border-surface-200">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300">{line}</span>
                <span className="text-[10px] text-gray-500">极端赔付 {data.count} 次</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-warn">原始: {(data.totalRaw / 10000).toFixed(1)}万</span>
                <div className="flex items-center gap-1.5">
                  {[...data.interceptTypes.entries()].map(([type, count]) => {
                    const label = type === 'deductible' ? '免赔' : type === 'limit' ? '限额' : '未拦截';
                    return (
                      <span key={type} className="px-1.5 py-0.5 rounded bg-surface-200 text-gray-400 text-[10px]">
                        {label} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {result.sampleWarnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">样本质量警告</h3>
          {result.sampleWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-warn/10 border border-warn/20">
              <AlertCircle className="w-3.5 h-3.5 text-warn mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-warn-light font-medium">
                  {w.type === 'insufficient_sample' ? '样本不足' : w.type === 'thin_tail' ? '尾部稀疏' : '免赔边界风险'}
                </div>
                <div className="text-gray-400 mt-0.5">{w.message}</div>
                <div className="text-gray-500 mt-1 text-[10px]">建议：{w.suggestedAction}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
