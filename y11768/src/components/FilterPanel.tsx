import { useFunnelStore } from '@/store/funnelStore';
import { channels, products, rejectionReasonOptions } from '@/data/mockData';
import { X, Filter } from 'lucide-react';

export default function FilterPanel() {
  const { filters, setFilter, resetFilters, filteredApplications, applications } = useFunnelStore();

  const hasActiveFilters = filters.channels.length > 0 || filters.products.length > 0 || filters.rejectionReasons.length > 0;

  return (
    <div className="absolute top-4 left-4 z-20 w-72">
      <div className="rounded-xl border border-white/10 bg-[#0A1628]/90 backdrop-blur-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#F0B429]" />
            <span className="text-sm font-semibold text-white/90">筛选条件</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-[#F0B429] hover:text-[#FFD54F] transition-colors"
            >
              <X size={12} />
              重置
            </button>
          )}
        </div>

        <div className="text-xs text-white/50">
          显示 {filteredApplications.length} / {applications.length} 条申请
        </div>

        <div className="space-y-3">
          <FilterGroup
            label="渠道"
            options={channels.map(c => ({ value: c.code, label: c.name }))}
            selected={filters.channels}
            onChange={(v) => setFilter('channels', v)}
          />
          <FilterGroup
            label="产品"
            options={products.map(p => ({ value: p.code, label: p.name }))}
            selected={filters.products}
            onChange={(v) => setFilter('products', v)}
          />
          <FilterGroup
            label="拒绝原因"
            options={rejectionReasonOptions.map(r => ({ value: r.code, label: r.description }))}
            selected={filters.rejectionReasons}
            onChange={(v) => setFilter('rejectionReasons', v)}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
            {filters.channels.map(c => (
              <FilterTag key={c} label={channels.find(ch => ch.code === c)?.name || c} onRemove={() => setFilter('channels', filters.channels.filter(x => x !== c))} />
            ))}
            {filters.products.map(p => (
              <FilterTag key={p} label={products.find(pr => pr.code === p)?.name || p} onRemove={() => setFilter('products', filters.products.filter(x => x !== p))} />
            ))}
            {filters.rejectionReasons.map(r => (
              <FilterTag key={r} label={rejectionReasonOptions.find(rr => rr.code === r)?.description || r} onRemove={() => setFilter('rejectionReasons', filters.rejectionReasons.filter(x => x !== r))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <div className="text-xs text-white/60 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-all duration-200 ${
              selected.includes(opt.value)
                ? 'bg-[#F0B429]/20 border-[#F0B429]/50 text-[#F0B429]'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#F0B429]/15 text-[#F0B429] rounded border border-[#F0B429]/20">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}
