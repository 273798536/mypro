import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Download, HardHat } from 'lucide-react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import FilterPanel from '@/components/FilterPanel';
import FilterSummaryBar from '@/components/FilterSummaryBar';
import SchemeCard from '@/components/SchemeCard';
import { CONCLUSION_LABELS } from '../../shared/types';
import type { ListQuery } from '../../shared/types';

function filtersToQuery(f: ListQuery): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.bridgeTunnelName) q.bridgeTunnelName = f.bridgeTunnelName;
  if (f.schemeType) q.schemeType = f.schemeType;
  if (f.conclusion) q.conclusion = f.conclusion;
  if (f.hasGap) q.hasGap = f.hasGap;
  if (f.dateFrom) q.dateFrom = f.dateFrom;
  if (f.dateTo) q.dateTo = f.dateTo;
  return q;
}

function queryToFilters(params: URLSearchParams): ListQuery {
  return {
    bridgeTunnelName: params.get('bridgeTunnelName') || '',
    schemeType: params.get('schemeType') || '',
    conclusion: params.get('conclusion') || '',
    hasGap: params.get('hasGap') || '',
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
  };
}

export default function SchemeList() {
  const { list, loading, fetchList, exportMarkdown, filters, setFilters, resetFilters } = useSchemeStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const fromUrl = queryToFilters(searchParams);
      const hasAny = Object.values(fromUrl).some(v => v !== '' && v !== undefined);
      if (hasAny) {
        setFilters(fromUrl);
      }
      initialized.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    const q = filtersToQuery(filters);
    setSearchParams(q, { replace: true });
  }, [filters.bridgeTunnelName, filters.schemeType, filters.conclusion, filters.hasGap, filters.dateFrom, filters.dateTo]);

  const handleExport = async () => {
    const f = { ...filters };
    const cleanFilters: Record<string, string> = {};
    if (f.bridgeTunnelName) cleanFilters.bridgeTunnelName = f.bridgeTunnelName;
    if (f.schemeType) cleanFilters.schemeType = f.schemeType;
    if (f.conclusion) cleanFilters.conclusion = f.conclusion;
    if (f.hasGap) cleanFilters.hasGap = f.hasGap;
    if (f.dateFrom) cleanFilters.dateFrom = f.dateFrom;
    if (f.dateTo) cleanFilters.dateTo = f.dateTo;

    const result = await exportMarkdown(undefined, Object.keys(cleanFilters).length > 0 ? cleanFilters as any : undefined);
    const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex">
      <FilterPanel />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 min-h-[56px] bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <HardHat size={22} className="text-[var(--color-accent)]" />
            <h1 className="text-lg font-semibold">桥隧检修平台方案比选</h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] rounded-md transition-colors"
          >
            <Download size={16} />
            导出报告
          </button>
        </div>
        <FilterSummaryBar />
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
              <HardHat size={48} className="mb-4 opacity-30" />
              <p className="text-sm">暂无方案数据</p>
              <p className="text-xs mt-1">尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {list.map((item) => (
                <SchemeCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
