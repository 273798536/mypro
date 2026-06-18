import { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, ShieldAlert, Circle } from 'lucide-react';
import type { Sample, ReviewStatus } from '@/types';
import { useReviewStore } from '@/store/useReviewStore';

interface SampleListProps {
  samples: Sample[];
  currentSampleId: string;
}

type FilterType = 'all' | 'pending' | 'reviewing' | 'confirmed' | 'boundary' | 'leak';

export function SampleList({ samples, currentSampleId }: SampleListProps) {
  const { filter, setFilter, setCurrentSample } = useReviewStore();
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredSamples = useMemo(() => {
    let result = samples;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.productName.toLowerCase().includes(q) ||
          s.productId.toLowerCase().includes(q),
      );
    }

    switch (filter.status as FilterType) {
      case 'pending':
        result = result.filter((s) => s.reviewStatus === 'pending');
        break;
      case 'reviewing':
        result = result.filter((s) => s.reviewStatus === 'reviewing');
        break;
      case 'confirmed':
        result = result.filter((s) => s.reviewStatus === 'confirmed');
        break;
      case 'boundary':
        result = result.filter((s) => s.isBoundary);
        break;
      case 'leak':
        result = result.filter((s) => s.leakRisk !== 'none');
        break;
    }

    return result;
  }, [samples, filter.search, filter.status]);

  const filters: { key: FilterType; label: string; icon: typeof Circle }[] = [
    { key: 'all', label: '全部', icon: Circle },
    { key: 'pending', label: '待复核', icon: Clock },
    { key: 'reviewing', label: '复核中', icon: Clock },
    { key: 'confirmed', label: '已确认', icon: CheckCircle },
    { key: 'boundary', label: '边界样本', icon: AlertTriangle },
    { key: 'leak', label: '泄漏风险', icon: ShieldAlert },
  ];

  return (
    <div className="h-full flex flex-col bg-midnight/30">
      <div className="p-3 border-b border-slate-700/50 space-y-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="搜索商品名称或ID..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/30 transition-all"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 rounded-md transition-colors"
          >
            <Filter size={14} />
            <span>
              筛选：{filters.find((f) => f.key === filter.status)?.label || '全部'}
            </span>
          </button>

          {showFilterMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden animate-fade-in">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter({ status: f.key });
                    setShowFilterMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                    filter.status === f.key
                      ? 'bg-cyan-accent/15 text-cyan-accent'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <f.icon size={14} />
                  <span>{f.label}</span>
                  <span className="ml-auto text-slate-500">
                    {countByFilter(samples, f.key)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSamples.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            没有匹配的样本
          </div>
        ) : (
          filteredSamples.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              isActive={sample.id === currentSampleId}
              onClick={() => setCurrentSample(sample.id)}
            />
          ))
        )}
      </div>

      <div className="p-2 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        共 {filteredSamples.length} 条样本
      </div>
    </div>
  );
}

function countByFilter(samples: Sample[], key: FilterType): number {
  switch (key) {
    case 'all':
      return samples.length;
    case 'pending':
      return samples.filter((s) => s.reviewStatus === 'pending').length;
    case 'reviewing':
      return samples.filter((s) => s.reviewStatus === 'reviewing').length;
    case 'confirmed':
      return samples.filter((s) => s.reviewStatus === 'confirmed').length;
    case 'boundary':
      return samples.filter((s) => s.isBoundary).length;
    case 'leak':
      return samples.filter((s) => s.leakRisk !== 'none').length;
    default:
      return samples.length;
  }
}

function SampleCard({
  sample,
  isActive,
  onClick,
}: {
  sample: Sample;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusConfig: Record<ReviewStatus, { color: string; bg: string }> = {
    pending: { color: 'text-slate-400', bg: 'bg-slate-500' },
    reviewing: { color: 'text-cyan-accent', bg: 'bg-cyan-accent' },
    confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-400' },
    disputed: { color: 'text-amber-warn', bg: 'bg-amber-warn' },
  };

  const status = statusConfig[sample.reviewStatus];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isActive
          ? 'bg-cyan-accent/10 border-cyan-accent/40 shadow-lg shadow-cyan-accent/5'
          : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/30 hover:border-slate-600/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg">
          📦
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${status.bg} flex-shrink-0`}
            />
            <span className="text-sm font-medium text-slate-200 truncate">
              {sample.productName}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono">
            {sample.productId}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {sample.isBoundary && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-warn/20 text-amber-warn">
                <AlertTriangle size={10} />
                边界
              </span>
            )}
            {sample.leakRisk !== 'none' && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded ${
                  sample.leakRisk === 'high'
                    ? 'bg-rose-alert/20 text-rose-alert'
                    : sample.leakRisk === 'medium'
                    ? 'bg-amber-warn/20 text-amber-warn'
                    : 'bg-cyan-accent/20 text-cyan-accent'
                }`}
              >
                <ShieldAlert size={10} />
                泄漏
              </span>
            )}
            {sample.notes.length > 0 && (
              <span className="text-[10px] text-slate-500">
                💬 {sample.notes.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
