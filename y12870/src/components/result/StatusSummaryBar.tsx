import { useCalcStore } from '@/store/useCalcStore';
import { countByStatus } from '@/utils/statusClassifier';

export default function StatusSummaryBar() {
  const results = useCalcStore(s => s.results);
  const missing = useCalcStore(s => s.missingMaterials);
  const c = countByStatus(results);
  const total = results.length || 1;
  const pct = (n: number) => Math.max(0, Math.round(n / total * 1000) / 10);
  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header">
        <span className="panel-title">结果状态总览</span>
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <Stat color="#0E7C7B" label="可用" count={c.AVAILABLE} />
          <Stat color="#E9A23B" label="暂缓" count={c.DEFERRED} />
          <Stat color="#D64045" label="需重采" count={c.RECOLLECT} />
          {missing.length > 0 && <Stat color="#0A2540" label="材料缺口" count={missing.length} />}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-3 rounded-full bg-ocean-100 overflow-hidden flex">
          {c.AVAILABLE > 0 && (
            <div style={{ width: pct(c.AVAILABLE) + '%', background: '#0E7C7B' }}
              className="transition-all" title={`可用 ${c.AVAILABLE} 项`} />
          )}
          {c.DEFERRED > 0 && (
            <div style={{ width: pct(c.DEFERRED) + '%', background: '#E9A23B' }}
              className="transition-all" title={`暂缓 ${c.DEFERRED} 项`} />
          )}
          {c.RECOLLECT > 0 && (
            <div style={{ width: pct(c.RECOLLECT) + '%', background: '#D64045' }}
              className="transition-all" title={`需重采 ${c.RECOLLECT} 项`} />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-ocean-700">
          <span>可用率：<b className="tabular-nums text-status-available">{pct(c.AVAILABLE)}%</b></span>
          {results.length === 0 && <span className="text-ocean-500 italic">载入数据后将自动分类</span>}
          {missing.length > 0 && (
            <span className="text-status-recollect font-medium">
              共缺 {missing.length} 份材料，详见下方卡片
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-ocean-700">{label}</span>
      <b className="text-ocean-900">{count}</b>
    </div>
  );
}
