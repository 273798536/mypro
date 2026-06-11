import { Activity, Thermometer, Layers, Save } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useMemo } from 'react';

export function Header() {
  const { points, phases, currentPhaseId } = useStore();

  const stats = useMemo(() => {
    const anomaly = points.filter((p) => p.status !== 'normal').length;
    const normal = points.length - anomaly;
    const avgTemp =
      points.reduce((s, p) => s + (p.temperature ?? 0), 0) / (points.length || 1);
    return { anomaly, normal, avgTemp };
  }, [points]);

  const curPhase = phases.find((p) => p.id === currentPhaseId);

  return (
    <header className="dc-panel border-b border-dc-border px-5 py-2.5 flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-dc-cold/15 border border-dc-cold/50 flex items-center justify-center">
          <Layers size={16} className="text-dc-cold" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold tracking-wider text-dc-text">
            数据中心冷通道方案比选
          </h1>
          <p className="text-[10px] font-mono text-dc-text-mute">
            机房A · {curPhase?.name ?? ''} · 当前 {points.length} 个点位
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4 ml-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dc-bg-2 border border-dc-border rounded-sm">
          <Activity size={12} className="text-dc-ok" />
          <span className="text-[10px] font-mono text-dc-text-dim">正常</span>
          <span className="text-[11px] font-mono font-bold text-dc-ok">{stats.normal}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dc-bg-2 border border-dc-border rounded-sm">
          <Activity size={12} className="text-dc-anomaly" />
          <span className="text-[10px] font-mono text-dc-text-dim">异常</span>
          <span className="text-[11px] font-mono font-bold text-dc-anomaly">{stats.anomaly}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-dc-bg-2 border border-dc-border rounded-sm">
          <Thermometer size={12} className="text-dc-warm" />
          <span className="text-[10px] font-mono text-dc-text-dim">均温</span>
          <span className="text-[11px] font-mono font-bold text-dc-text">{stats.avgTemp.toFixed(1)}°C</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="dc-btn flex items-center gap-1.5">
          <Save size={12} />
          导出报告
        </button>
        <button className="dc-btn-primary flex items-center gap-1.5">
          提交审批
        </button>
      </div>
    </header>
  );
}
