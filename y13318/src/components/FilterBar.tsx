import { Search, ScrollText, Download, Layers3, Boxes } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { FILTER_OPTIONS } from '@/lib/contract';
import { VERSIONS, MATERIAL_TYPES } from '@/data/samples';
import type { FilterKey } from '@/types';

export function FilterBar() {
  const version = useReviewStore((s) => s.version);
  const filter = useReviewStore((s) => s.filter);
  const material = useReviewStore((s) => s.material);
  const search = useReviewStore((s) => s.search);
  const setVersion = useReviewStore((s) => s.setVersion);
  const setFilter = useReviewStore((s) => s.setFilter);
  const setMaterial = useReviewStore((s) => s.setMaterial);
  const setSearch = useReviewStore((s) => s.setSearch);
  const setVersionNoteOpen = useReviewStore((s) => s.setVersionNoteOpen);
  const setExportOpen = useReviewStore((s) => s.setExportOpen);

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-3">
      <label className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">版本</span>
        <select
          className="field w-32"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          aria-label="选择版本"
        >
          <option value="all">全部版本</option>
          {VERSIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          <Boxes size={12} className="inline" /> 材料
        </span>
        <select
          className="field w-32"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          aria-label="选择材料类型"
        >
          <option value="all">全部材料</option>
          {MATERIAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1 border border-graphite-700 p-0.5">
        <Layers3 size={12} className="ml-1.5 text-zinc-500" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key as FilterKey)}
            className={`px-2.5 py-1 text-xs font-mono transition-colors ${
              filter === opt.key
                ? 'bg-amberx-500/15 text-amberx-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="relative ml-auto">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          className="field w-48 pl-8"
          placeholder="搜索样本ID / 材料"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索样本"
        />
      </div>

      <button className="btn btn-amber" onClick={() => setVersionNoteOpen(true)}>
        <ScrollText size={14} /> 版本说明
      </button>
      <button className="btn" onClick={() => setExportOpen(true)}>
        <Download size={14} /> 导出
      </button>
    </div>
  );
}
