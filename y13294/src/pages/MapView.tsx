import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import { useRampStore } from '@/store';
import { RampMap } from '@/components/RampMap';
import { StatCards } from '@/components/StatCards';
import { SOURCE_ORDER, sourceMeta, statusMeta, STATUS_ORDER } from '@/lib/ui';

export default function MapView() {
  const navigate = useNavigate();
  const { ramps, loading, fetchRamps } = useRampStore();

  useEffect(() => {
    void fetchRamps();
  }, [fetchRamps]);

  const overriding = ramps.filter((r) => r.isOverriding).length;
  const photos = ramps.filter((r) => r.sources.includes('on_site_photo')).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">地图总览</h1>
          <p className="mt-1 text-sm text-muted">
            状态着色点位 · 覆盖加环 · 照片补录小点 · 今日改判脉冲动画。
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <MapIcon className="h-3.5 w-3.5" /> {ramps.length} 个点位
          </span>
          {overriding > 0 && <span className="text-signal">· 覆盖 {overriding}</span>}
          {photos > 0 && <span className="text-accent">· 含照片补录 {photos}</span>}
        </div>
      </div>

      <StatCards ramps={ramps} />

      <div className="rounded-xl border border-line bg-surface p-2 shadow-card">
        <RampMap ramps={ramps} className="min-h-[460px]" />
      </div>

      {/* legend */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LegendCard title="状态着色">
          {STATUS_ORDER.map((s) => (
            <LegendItem key={s} dot={statusMeta[s].dot} label={statusMeta[s].label} count={ramps.filter((r) => r.status === s).length} />
          ))}
        </LegendCard>
        <LegendCard title="来源标记">
          {SOURCE_ORDER.map((s) => (
            <LegendItem
              key={s}
              dot={sourceMeta[s].alert ? 'bg-signal' : 'bg-accent'}
              label={sourceMeta[s].label}
              count={ramps.filter((r) => r.sources.includes(s)).length}
            />
          ))}
          <LegendItem dot="bg-signal" label="旧方案覆盖" count={overriding} />
        </LegendCard>
      </div>

      {loading && ramps.length === 0 && (
        <p className="text-center text-sm text-muted">加载点位中…</p>
      )}

      <p className="text-center text-xs text-muted">
        点击任一点位或清单行可进入坡道详情，查看改判时间线与补录来源。
        <button className="ml-1 text-accent hover:underline" onClick={() => navigate('/')}>
          返回公示清单 →
        </button>
      </p>
    </div>
  );
}

function LegendCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LegendItem({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-mono text-xs text-muted">{count}</span>
    </div>
  );
}
