import { useStore } from '../../store/useStore';
import { X, Clock, FileText } from 'lucide-react';
import { METRIC_LABELS } from '../../data/provinces';

export default function DetailPanel() {
  const { regions, selectedRegion, setSelectedRegion, setShowDetail, anomalies } = useStore();

  const region = regions.find(r => r.region === selectedRegion);
  if (!region) return null;

  const regionAnomalies = anomalies.filter(a => a.region === region.region);
  const claimRatio = region.premium > 0 ? (region.claimAmount / region.premium * 100) : 0;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-40 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-bold text-cyan-300">{region.region}</h3>
        <button
          onClick={() => { setSelectedRegion(null); setShowDetail(false); }}
          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {regionAnomalies.length > 0 && (
        <div className="p-3 border-b border-slate-700/50 space-y-2">
          {regionAnomalies.map((a, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg text-xs ${
              a.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}>
              <span className="font-bold">⚠ {a.type === 'extreme_claim' ? '极端赔付' : a.type === 'ratio_mismatch' ? '比例异常' : '地区合并'}</span>
              <p className="mt-1 opacity-80">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 border-b border-slate-700/50">
        <div className="grid grid-cols-2 gap-3">
          <DataCard label="保单数" value={region.policyCount.toLocaleString()} />
          <DataCard label="出险率" value={`${(region.claimRate * 100).toFixed(1)}%`} />
          <DataCard label="保费(万元)" value={region.premium.toLocaleString()} color="text-green-400" />
          <DataCard label="赔付额(万元)" value={region.claimAmount.toLocaleString()} color="text-amber-400" />
          <DataCard label="赔付率" value={`${claimRatio.toFixed(1)}%`} color={claimRatio > 100 ? 'text-red-400' : 'text-slate-300'} />
          <DataCard label="来源" value={region.source} small />
        </div>
      </div>

      {region.actuarialNote && (
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <FileText size={12} />
            <span>精算备注</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{region.actuarialNote}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
          <Clock size={12} />
          <span>修正历史</span>
          <span className="text-slate-600">({region.revisionHistory.length}条)</span>
        </div>
        {region.revisionHistory.length === 0 ? (
          <p className="text-sm text-slate-600 italic">暂无修正记录</p>
        ) : (
          <div className="space-y-3">
            {region.revisionHistory.map((rev, i) => (
              <div key={i} className="relative pl-4 border-l-2 border-slate-700">
                <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-cyan-500 -translate-x-[5px]" />
                <div className="text-xs text-slate-500">{new Date(rev.timestamp).toLocaleString('zh-CN')}</div>
                <div className="text-sm text-slate-300 mt-0.5">
                  <span className="text-cyan-400">{METRIC_LABELS[rev.field] || rev.field}</span>
                  ：<span className="text-red-400 line-through">{String(rev.oldValue)}</span>
                  {' → '}
                  <span className="text-green-400">{String(rev.newValue)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">原因：{rev.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/30">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`${small ? 'text-xs' : 'text-sm'} font-mono font-bold ${color || 'text-slate-200'}`}>{value}</div>
    </div>
  );
}
