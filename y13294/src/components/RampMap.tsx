import { useState } from 'react';
import { cn } from '@/lib/utils';
import { fmtDateTime, isToday, sourceMeta, statusMeta } from '@/lib/ui';
import { SourceBadge } from './badges';
import type { RampListItem } from '@shared/types';

interface RampMapProps {
  ramps: RampListItem[];
  focusedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function useProjection(ramps: RampListItem[]) {
  if (ramps.length === 0) {
    return { project: () => ({ left: 50, top: 50 }) };
  }
  const lngs = ramps.map((r) => r.lng);
  const lats = ramps.map((r) => r.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng || 1;
  const spanLat = maxLat - minLat || 1;
  const project = (r: RampListItem) => ({
    left: 10 + ((r.lng - minLng) / spanLng) * 80,
    top: 12 + ((maxLat - r.lat) / spanLat) * 76,
  });
  return { project };
}

export function RampMap({ ramps, focusedId, onSelect, className }: RampMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { project } = useProjection(ramps);

  if (ramps.length === 0) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl border border-dashed border-line bg-paper text-sm text-muted', className)} style={{ minHeight: 320 }}>
        暂无坡道点位
      </div>
    );
  }

  const active = hovered ?? focusedId ?? null;
  const activeRamp = ramps.find((r) => r.id === active) ?? null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-blueprint',
        className,
      )}
      style={{ minHeight: 360 }}
    >
      {/* decorative river + bridges */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path
          d="M -5 58 C 20 50, 35 66, 55 58 S 90 50, 110 60 L 110 78 C 90 70, 70 80, 55 74 S 25 64, -5 72 Z"
          fill="rgba(15,76,92,0.07)"
        />
        <path
          d="M -5 58 C 20 50, 35 66, 55 58 S 90 50, 110 60"
          fill="none"
          stroke="rgba(15,76,92,0.18)"
          strokeWidth="0.4"
          strokeDasharray="1.5 1.5"
        />
        {[18, 42, 66, 88].map((x) => (
          <line key={x} x1={x} y1="30" x2={x} y2="92" stroke="rgba(28,27,23,0.06)" strokeWidth="0.3" />
        ))}
      </svg>

      {/* markers */}
      {ramps.map((r) => {
        const p = project(r);
        const m = statusMeta[r.status];
        const hasPhoto = r.sources.includes('on_site_photo');
        const recent = isToday(r.lastChangeAt);
        const isActive = active === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect?.(r.id)}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered((h) => (h === r.id ? null : h))}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            aria-label={r.name}
          >
            {recent && (
              <span
                className={cn(
                  'absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 animate-pulse-ring',
                  m.dot,
                )}
              />
            )}
            <span
              className={cn(
                'relative block h-3.5 w-3.5 rounded-full border-2 border-surface shadow-sm transition-transform group-hover:scale-125',
                m.dot,
                r.isOverriding && 'ring-2 ring-signal ring-offset-1 ring-offset-surface',
                isActive && 'scale-125',
              )}
            />
            {hasPhoto && (
              <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-accent ring-1 ring-surface" />
            )}
          </button>
        );
      })}

      {/* hover card */}
      {activeRamp && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface/95 p-3 shadow-card backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-sm font-semibold">{activeRamp.name}</span>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusMeta[activeRamp.status].dot)} />
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">
            {activeRamp.bridgeName} · {activeRamp.lat.toFixed(4)}, {activeRamp.lng.toFixed(4)}
          </div>
          <div className="mt-2 space-y-1.5">
            {activeRamp.lastChangeSource && (
              <div className="flex items-center gap-1.5">
                <SourceBadge source={activeRamp.lastChangeSource} />
                <span className="font-mono text-[11px] text-muted">{fmtDateTime(activeRamp.lastChangeAt)}</span>
              </div>
            )}
            {activeRamp.lastAffected && (
              <div className="rounded border border-line bg-paper px-2 py-1 text-[11px] leading-snug text-ink/80">
                {activeRamp.lastAffected}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {activeRamp.isOverriding && (
                <span className="chip border-signal/40 bg-signal/10 font-mono text-[10px] text-signal">覆盖</span>
              )}
              {activeRamp.sources.includes('on_site_photo') && (
                <span className="chip border-accent/30 bg-accent/10 font-mono text-[10px] text-accent">照片</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface/85 px-2.5 py-1.5 backdrop-blur">
        {(['processed', 'pending', 'overridden'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1 font-mono text-[10px] text-muted">
            <span className={cn('h-2 w-2 rounded-full', statusMeta[s].dot)} />
            {statusMeta[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted">
          <span className="h-2 w-2 rounded-full ring-2 ring-signal ring-offset-1 ring-offset-surface" />
          覆盖
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          照片补录
        </span>
      </div>
    </div>
  );
}
