import { X, Camera } from 'lucide-react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import { CONCLUSION_LABELS } from '../../shared/types';

export default function FilterSummaryBar() {
  const { filters, setFilters, fetchList, total } = useSchemeStore();

  const tags: { key: string; label: string; value: string }[] = [];

  if (filters.bridgeTunnelName) tags.push({ key: 'bridgeTunnelName', label: '桥隧', value: filters.bridgeTunnelName });
  if (filters.schemeType) tags.push({ key: 'schemeType', label: '类型', value: filters.schemeType });
  if (filters.conclusion) tags.push({ key: 'conclusion', label: '结论', value: CONCLUSION_LABELS[filters.conclusion as keyof typeof CONCLUSION_LABELS] });
  if (filters.hasGap === 'true') tags.push({ key: 'hasGap', label: '标记', value: '仅缺段' });
  if (filters.dateFrom) tags.push({ key: 'dateFrom', label: '起始', value: filters.dateFrom });
  if (filters.dateTo) tags.push({ key: 'dateTo', label: '截止', value: filters.dateTo });

  const removeTag = (key: string) => {
    const next = { ...filters, [key]: key === 'hasGap' ? '' : '' };
    setFilters(next);
    fetchList();
  };

  return (
    <div className="h-12 min-h-[48px] bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-5 gap-3">
      <Camera size={16} className="text-[var(--color-text-muted)]" />
      <span className="text-xs text-[var(--color-text-muted)]">筛选上下文：</span>
      {tags.length === 0 ? (
        <span className="text-xs text-[var(--color-text-muted)] italic">未筛选</span>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span
              key={t.key}
              className="inline-flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
            >
              {t.label}:{t.value}
              <button onClick={() => removeTag(t.key)} className="hover:text-[var(--color-danger)] transition-colors">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="ml-auto text-xs text-[var(--color-text-muted)] font-mono">
        共 {total} 条
      </div>
    </div>
  );
}
