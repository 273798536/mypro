import { useStore } from '@/store';
import { SourceBadge } from '../common/StatusBadge';
import { GitCompare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MaterialCard({ materialId }: { materialId: string }) {
  const material = useStore(s => s.materials.find(m => m.id === materialId));
  const highlight = useStore(s => s.highlight);
  const setHighlight = useStore(s => s.setHighlight);
  const setSelectedMerge = useStore(s => s.setSelectedMerge);
  const points = useStore(s => s.points);
  const openVersionCompare = useStore(s => s.openVersionCompare);
  if (!material) return null;

  const isHl = highlight.type === 'material' && highlight.id === materialId;
  const relatedMerges = new Set(
    material.relatedPointIds
      .map(pid => points.find(p => p.id === pid)?.mergeId)
      .filter(Boolean) as string[],
  );

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-bg-card p-3 cursor-pointer transition-all hover:border-soft hover:bg-bg-hover',
        isHl && 'ring-2 ring-accent-caliber animate-blink-hl border-accent-caliber/50',
      )}
      onClick={() => {
        if (relatedMerges.size > 0) setSelectedMerge(relatedMerges.values().next().value);
        setHighlight({ type: 'material', id: materialId, triggeredAt: Date.now() });
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <SourceBadge source={material.source} />
            <span className="text-[10px] text-text-dim font-mono">v{material.currentVersion}</span>
            {material.caliberChanged && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-caliber/20 text-accent-caliber text-[10px] border border-accent-caliber/40"
                title="该材料后来改过口径"
              >
                <Sparkles className="w-3 h-3" />
                已改口径
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-text leading-snug line-clamp-2 mb-1">{material.title}</div>
        </div>
        {material.versions.length >= 2 && (
          <button
            className="shrink-0 p-1.5 rounded-md text-text-muted hover:text-accent-caliber hover:bg-accent-caliber/15 transition-colors"
            title="对比两个版本的差异"
            onClick={e => {
              e.stopPropagation();
              openVersionCompare(material.id, material.versions[0].version, material.versions[material.versions.length - 1].version);
            }}
          >
            <GitCompare className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="text-[11px] text-text-muted">
        上传人 <span className="text-text">{material.uploader}</span>
        <span className="mx-1.5 text-border">·</span>
        <span>{new Date(material.uploadTime).toLocaleDateString('zh-CN')}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
        {material.relatedPointIds.slice(0, 4).map(pid => {
          const pt = points.find(p => p.id === pid);
          if (!pt) return null;
          return (
            <span key={pid} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-hover text-text-muted max-w-[120px] truncate">
              {pt.name}
            </span>
          );
        })}
        {material.relatedPointIds.length > 4 && (
          <span className="text-[10px] px-1.5 py-0.5 text-text-dim">+{material.relatedPointIds.length - 4}</span>
        )}
      </div>
    </div>
  );
}
