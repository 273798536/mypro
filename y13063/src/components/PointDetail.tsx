import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_POINTS } from '@/data/mockPoints';
import { FLAG_LABELS } from '@/types';
import type { FlagType } from '@/types';
import { MapPin, Droplets, Layers, AlertTriangle } from 'lucide-react';

export default function PointDetail() {
  const selectedId = useAppStore((s) => s.selectedPointId);
  const notes = useAppStore((s) => s.notes);

  const point = useMemo(
    () => MOCK_POINTS.find((p) => p.id === selectedId) ?? null,
    [selectedId],
  );
  const pointNotes = useMemo(
    () => (point ? notes.filter((n) => n.pointId === point.id) : []),
    [point, notes],
  );

  if (!point) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div className="text-brand-400 text-sm">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>请从左侧剖面中点击一个点位</p>
          <p className="text-xs mt-1">异常点位优先查看 📜 📝 🗣 ⚠</p>
        </div>
      </div>
    );
  }

  const isAbnormal = point.flags.length > 0;

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-brand-500">点位编号</div>
          <div className="font-serif text-2xl font-semibold text-brand-800">
            {point.code}
          </div>
        </div>
        {isAbnormal && (
          <span className="tag bg-accent-amber/10 text-accent-rust border-accent-amber/40">
            <AlertTriangle className="w-3 h-3" />
            异常
          </span>
        )}
      </div>

      <p className="text-sm text-brand-700 bg-brand-50/60 border border-brand-100 rounded-sm px-3 py-2">
        {point.description}
      </p>

      {isAbnormal && (
        <section>
          <h4 className="text-xs font-semibold text-accent-rust mb-2">异常标记</h4>
          <div className="flex flex-wrap gap-1.5">
            {point.flags.map((f: FlagType) => {
              const meta = FLAG_LABELS[f];
              return (
                <span key={f} className={`tag ${meta.color}`}>
                  {meta.emoji} {meta.label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-brand-500">
            <MapPin className="w-3.5 h-3.5" />
            坐标
          </div>
          <div className="text-sm text-brand-800 font-medium">
            X: {point.x.toFixed(2)} m
          </div>
          <div className="text-sm text-brand-800 font-medium">
            深度: {point.depth.toFixed(2)} m
          </div>
        </div>
        <div className="card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-brand-500">
            <Droplets className="w-3.5 h-3.5" />
            水位
          </div>
          <div className="text-sm text-brand-800 font-medium">
            {point.waterLevel.toFixed(2)} m
          </div>
          <div className="text-xs text-brand-500">距地表</div>
        </div>
      </section>

      <section className="card p-3">
        <div className="flex items-center gap-1.5 text-xs text-brand-500 mb-2">
          <Layers className="w-3.5 h-3.5" />
          坐标版本
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`tag ${
              point.coordVersion === 'v1'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {point.coordVersion === 'v1' ? '📜 v1 旧版' : '✅ v2 新版'}
          </span>
        </div>
        {point.oldCoord && (
          <div className="mt-3 pt-3 border-t border-brand-100 space-y-1">
            <div className="text-xs text-brand-500">旧版坐标（参考）</div>
            <div className="text-sm text-amber-700">
              X: {point.oldCoord.x.toFixed(2)} m · 深度: {point.oldCoord.depth.toFixed(2)} m
            </div>
            <div className="text-xs text-brand-500">
              偏差 ΔX: {(point.x - point.oldCoord.x).toFixed(2)} m · Δ深:{' '}
              {(point.depth - point.oldCoord.depth).toFixed(2)} m
            </div>
          </div>
        )}
      </section>

      {pointNotes.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-brand-700 mb-2">
            备注记录（{pointNotes.length}）
          </h4>
          <div className="space-y-2">
            {pointNotes.map((n) => {
              const meta =
                n.type === 'system'
                  ? { label: '系统', emoji: '💾', color: 'bg-brand-50 text-brand-700' }
                  : n.type === 'supplementary'
                  ? { label: '后补', emoji: '📝', color: 'bg-orange-50 text-orange-700' }
                  : { label: '口头', emoji: '🗣', color: 'bg-rose-50 text-rose-700' };
              return (
                <div
                  key={n.id}
                  className="card p-2.5 border-l-4 border-l-brand-400"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`tag ${meta.color} border-transparent`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-[10px] text-brand-400">
                      {new Date(n.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-brand-800">{n.content}</p>
                  <div className="text-[11px] text-brand-500 mt-1">— {n.author}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
