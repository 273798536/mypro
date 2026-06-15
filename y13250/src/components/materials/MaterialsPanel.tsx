import { useState } from 'react';
import { useStore } from '@/store';
import { MaterialCard } from './MaterialCard';
import { Search, Package, Filter } from 'lucide-react';
import type { MaterialSource } from '@/types';
import { sourceMeta } from '../common/StatusBadge';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ key: MaterialSource | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'resident_feedback', label: '💬 居民反馈' },
  { key: 'written', label: '📄 书面' },
  { key: 'verbal', label: '🗣️ 口头' },
];

export function MaterialsPanel() {
  const materials = useStore(s => s.materials);
  const [kw, setKw] = useState('');
  const [flt, setFlt] = useState<MaterialSource | 'all'>('all');

  const list = materials.filter(m => {
    if (flt !== 'all' && m.source !== flt) return false;
    if (!kw.trim()) return true;
    const q = kw.trim();
    return (
      m.title.includes(q) ||
      m.relatedPointIds.some(pid => {
        const pt = useStore.getState().points.find(p => p.id === pid);
        return pt?.name.includes(q);
      })
    );
  });

  const caliberCount = materials.filter(m => m.caliberChanged).length;

  return (
    <div className="h-full flex flex-col bg-bg-card/70 rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '380ms' }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-export" />
          <h2 className="text-base font-bold tracking-wide">材料区</h2>
          <span className="text-[11px] px-2 py-0.5 rounded bg-bg-hover text-text-muted font-mono">{materials.length} 份</span>
          {caliberCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-accent-caliber/15 text-accent-caliber border border-accent-caliber/30">
              {caliberCount} 份改口径
            </span>
          )}
        </div>
        <Package className="w-4 h-4 text-text-dim" />
      </div>
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={kw}
            onChange={e => setKw(e.target.value)}
            placeholder="搜材料标题 / 点位名称…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="w-3 h-3 text-text-dim shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFlt(f.key)}
              className={cn(
                'shrink-0 px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap',
                flt === f.key ? 'bg-accent-export/20 text-accent-export border border-accent-export/40' : 'text-text-muted hover:text-text hover:bg-bg-hover',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {list.length === 0 && (
          <div className="text-center py-10 text-text-dim text-sm">无匹配材料</div>
        )}
        {list.map(m => (
          <MaterialCard key={m.id} materialId={m.id} />
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border text-[10px] text-text-dim leading-relaxed">
        💡 点击材料卡片 → 定位关联归并组；点击材料右上角 🔀 对比改口径前后版本。
      </div>
    </div>
  );
}
