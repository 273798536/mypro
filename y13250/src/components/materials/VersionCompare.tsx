import { useStore } from '@/store';
import { X, GitCompare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { similarityRatio } from '@/utils/similarity';

function DiffView({ a, b }: { a: string; b: string }) {
  const tokensA = a.split(/(?<=[，。！？；：\n,.!?;:])/).filter(Boolean);
  const tokensB = b.split(/(?<=[，。！？；：\n,.!?;:])/).filter(Boolean);
  const setB = new Set(tokensB.map(t => t.trim()));
  const setA = new Set(tokensA.map(t => t.trim()));
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-[11px] text-text-dim mb-1 uppercase tracking-wider">旧版</div>
        <div className="rounded-lg border border-border bg-bg p-3 leading-7 max-h-64 overflow-y-auto">
          {tokensA.map((t, i) => {
            const trimmed = t.trim();
            const changed = !setB.has(trimmed) && similarityRatio(trimmed, Array.from(setB).find(x => similarityRatio(x, trimmed) > 0.3) || '') < 0.7;
            return (
              <span
                key={i}
                className={cn(changed && 'bg-accent-abnormal/20 line-through decoration-accent-abnormal/70 text-accent-abnormal rounded px-0.5')}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[11px] text-text-dim mb-1 uppercase tracking-wider">新版</div>
        <div className="rounded-lg border border-border bg-bg p-3 leading-7 max-h-64 overflow-y-auto">
          {tokensB.map((t, i) => {
            const trimmed = t.trim();
            const changed = !setA.has(trimmed);
            return (
              <span
                key={i}
                className={cn(changed && 'bg-accent-normal/20 text-accent-normal rounded px-0.5 border-b border-accent-normal/60')}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VersionCompare() {
  const vc = useStore(s => s.versionCompare);
  const close = useStore(s => s.closeVersionCompare);
  const material = useStore(s => s.materials.find(m => m.id === vc.materialId));
  if (!vc.open || !material) return null;

  const vA = material.versions.find(v => v.version === vc.vA);
  const vB = material.versions.find(v => v.version === vc.vB);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-bg-soft border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 bg-bg-soft/95 backdrop-blur border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-caliber/15 flex items-center justify-center text-accent-caliber">
              <GitCompare className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text">材料版本对比 · 改口径追踪</div>
              <div className="text-[11px] text-text-muted">{material.title}</div>
            </div>
            <div className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-caliber/15 text-accent-caliber text-[11px] border border-accent-caliber/30">
              <AlertCircle className="w-3 h-3" />
              该材料存在口径变更，请在归并时人工复核
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-dim">v{vA?.version || '-'}</span>
                <span className="text-[10px] text-text-dim font-mono">{vA?.changer}</span>
              </div>
              <div className="text-sm text-text font-medium mb-1">版本说明</div>
              <div className="text-xs text-text-muted">{vA?.changeNote || '-'}</div>
              <div className="mt-2 text-[10px] text-text-dim font-mono">{vA ? new Date(vA.timestamp).toLocaleString('zh-CN') : '-'}</div>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-3 ring-1 ring-accent-caliber/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-accent-caliber">v{vB?.version || '-'}（当前）</span>
                <span className="text-[10px] text-text-dim font-mono">{vB?.changer}</span>
              </div>
              <div className="text-sm text-text font-medium mb-1">版本说明</div>
              <div className="text-xs text-text-muted">{vB?.changeNote || '-'}</div>
              <div className="mt-2 text-[10px] text-text-dim font-mono">{vB ? new Date(vB.timestamp).toLocaleString('zh-CN') : '-'}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-text mb-2.5">文字内容差异对比</div>
            {vA && vB ? (
              <DiffView a={vA.content} b={vB.content} />
            ) : (
              <div className="text-center text-text-dim py-6">无法加载版本内容</div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-text mb-2.5">提到点位的变更</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-bg p-3">
                <div className="text-[11px] text-text-dim mb-1">旧版提到</div>
                <div className="flex flex-wrap gap-1">
                  {(vA?.pointMentions || []).length === 0 && <span className="text-[11px] text-text-dim">无</span>}
                  {(vA?.pointMentions || []).map((p, i) => (
                    <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-accent-abnormal/15 text-accent-abnormal line-through decoration-2">{p}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg p-3">
                <div className="text-[11px] text-text-dim mb-1">新版提到</div>
                <div className="flex flex-wrap gap-1">
                  {(vB?.pointMentions || []).length === 0 && <span className="text-[11px] text-text-dim">无</span>}
                  {(vB?.pointMentions || []).map((p, i) => (
                    <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-accent-normal/15 text-accent-normal">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
