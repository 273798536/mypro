import type { FilterState, PointStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FilterSidebarProps {
  filters: FilterState;
  sources: string[];
  onChange: (f: Partial<FilterState>) => void;
  onReset: () => void;
}

export function FilterSidebar({ filters, sources, onChange, onReset }: FilterSidebarProps) {
  const statuses: PointStatus[] = ['pending', 'processing', 'evidence_needed', 'completed', 'merged'];
  const activeCount = [
    filters.status.length > 0,
    filters.source.length > 0,
    filters.has_notes !== null,
    filters.has_screenshots !== null,
    filters.has_conflict !== null,
    !!filters.keyword,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-semibold text-slate-700">筛选条件</h3>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X size={12} /> 重置 {activeCount} 项
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">关键词搜索</label>
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          placeholder="点位名称、地址..."
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-sm focus:outline-none focus:border-slate-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">处理状态</label>
        <div className="space-y-1.5">
          {statuses.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={filters.status.includes(s)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...filters.status, s]
                    : filters.status.filter((x) => x !== s);
                  onChange({ status: next });
                }}
                className="rounded-sm border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              {STATUS_LABELS[s]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">数据来源</label>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {sources.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={filters.source.includes(s)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...filters.source, s]
                    : filters.source.filter((x) => x !== s);
                  onChange({ source: next });
                }}
                className="rounded-sm border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">内容完整度</label>
        <div className="space-y-1.5">
          {([
            ['has_notes', '有备注'],
            ['has_screenshots', '有截图'],
            ['has_conflict', '有方案冲突'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900">
              <select
                value={filters[key] === null ? '' : String(filters[key])}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : e.target.value === 'true';
                  onChange({ [key]: v } as Partial<FilterState>);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-sm focus:outline-none focus:border-slate-500"
              >
                <option value="">不限</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200">
        <Button variant="secondary" size="sm" className="w-full" onClick={onReset}>
          重置全部筛选
        </Button>
      </div>
    </div>
  );
}
