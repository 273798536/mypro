// 站点列表页面 - 展示所有公交港湾站点，支持筛选、导出、分页、切换地图视图
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Map, ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { useBusBayStore } from '@/store';
import { FilterPanel } from '@/components/FilterPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { DuplicateBadge } from '@/components/DuplicateBadge';
import { BadDataIndicator } from '@/components/BadDataIndicator';
import { cn } from '@/lib/utils';
import type { BadDataFlag, BusBay } from '@/types';

const PAGE_SIZE = 10;

interface ToastItem { id: string; message: string; type: 'success' | 'error' }

function Toast({ items, onRemove }: { items: ToastItem[]; onRemove: (id: string) => void }) {
  useEffect(() => {
    items.forEach((item) => {
      const timer = setTimeout(() => onRemove(item.id), 5000);
      return () => clearTimeout(timer);
    });
  }, [items, onRemove]);
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-[slideIn_0.2s_ease-out]',
          item.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
          <CheckCircle2 className={cn('w-5 h-5 shrink-0', item.type === 'success' ? 'text-emerald-500' : 'text-red-500')} />
          <div className="text-sm max-w-sm whitespace-pre-line">{item.message}</div>
          <button onClick={() => onRemove(item.id)} className="shrink-0 ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DistrictTag({ district }: { district: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-prussia-50 text-prussia-700 border border-prussia-100">
      {district}
    </span>
  );
}

interface PaginatorProps { currentPage: number; totalPages: number; total: number; onPageChange: (page: number) => void }

function Paginator({ currentPage, totalPages, total, onPageChange }: PaginatorProps) {
  if (totalPages <= 1) {
    return <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500"><span>共 {total} 条记录</span><span>第 1 页</span></div>;
  }
  const pageNumbers: (number | 'ellipsis')[] = [];
  const addPage = (p: number | 'ellipsis') => pageNumbers.push(p);
  if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) addPage(i);
  else {
    addPage(1);
    if (currentPage > 3) addPage('ellipsis');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) addPage(i);
    if (currentPage < totalPages - 2) addPage('ellipsis');
    addPage(totalPages);
  }
  const btnBase = 'inline-flex items-center text-sm rounded-md border transition-all duration-200';
  const pageBtn = (active: boolean) => cn(btnBase, 'justify-center min-w-[32px] h-8',
    active ? 'border-prussia-600 bg-prussia-600 text-white font-medium shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-prussia-400 hover:text-prussia-700 hover:bg-prussia-50');
  const navBtn = (disabled: boolean) => cn(btnBase, 'gap-1 px-2.5 py-1.5',
    disabled ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white text-slate-700 hover:border-prussia-400 hover:text-prussia-700 hover:bg-prussia-50');
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
      <span className="text-sm text-slate-500">共 {total} 条记录，第 {currentPage} / {totalPages} 页</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={navBtn(currentPage === 1)}>
          <ChevronLeft className="w-4 h-4" />上一页
        </button>
        {pageNumbers.map((p, idx) => p === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} className={pageBtn(p === currentPage)}>{p}</button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={navBtn(currentPage === totalPages)}>
          下一页<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-14 h-14 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 21l-4.35-4.35" /><circle cx="11" cy="11" r="8" /><path d="M8 11h6" /><path d="M11 8v6" />
          </svg>
        </div>
        <div className="absolute -inset-2 rounded-full bg-prussia-100/30 -z-10 blur-xl" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">没有符合条件的站点</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm">请调整筛选条件，或点击「重置」按钮清除所有条件。</p>
    </div>
  );
}

function useBayBadDataFlags(bayId: string): BadDataFlag[] {
  const feedbacks = useBusBayStore((s) => s.feedbacks);
  return useMemo(() => {
    const bayFeedbacks = feedbacks.filter((fb) => fb.bayId === bayId);
    const allFlags: BadDataFlag[] = [];
    const seen = new Set<BadDataFlag>();
    for (const fb of bayFeedbacks) for (const flag of fb.badDataFlags) if (!seen.has(flag)) { seen.add(flag); allFlags.push(flag); }
    return allFlags;
  }, [feedbacks, bayId]);
}

function useBayMaxDuplicateOrder(bayId: string): number {
  const feedbacks = useBusBayStore((s) => s.feedbacks);
  return useMemo(() => {
    const bayFeedbacks = feedbacks.filter((fb) => fb.bayId === bayId);
    let max = 0;
    for (const fb of bayFeedbacks) if (fb.duplicateOrder && fb.duplicateOrder > max) max = fb.duplicateOrder;
    return max;
  }, [feedbacks, bayId]);
}

function TableRow({ bay, index, navigate }: { bay: BusBay; index: number; navigate: ReturnType<typeof useNavigate> }) {
  const badDataFlags = useBayBadDataFlags(bay.id);
  const maxDup = useBayMaxDuplicateOrder(bay.id);
  const hasBad = badDataFlags.length > 0;
  const hasDup = bay.duplicateCount > 0;
  const curRed = bay.currentCapacity < bay.designCapacity;
  const cellCls = 'px-4 py-3 whitespace-nowrap border-b border-slate-100';
  return (
    <tr className={cn('group transition-colors duration-150', index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white', 'hover:bg-prussia-50/60', hasDup && 'bg-diagonal-amber')}>
      <td className={cn(cellCls, 'text-sm text-slate-500 text-center')}>{index + 1}</td>
      <td className={cellCls}>
        <Link to={`/bays/${bay.id}`} className="text-sm text-prussia-600 font-medium underline decoration-prussia-300 decoration-1 underline-offset-2 hover:text-prussia-800 hover:decoration-prussia-500 transition-colors">
          {bay.name}
        </Link>
      </td>
      <td className={cn(cellCls, 'text-sm text-slate-700')}>{bay.road}</td>
      <td className={cellCls}><DistrictTag district={bay.district} /></td>
      <td className={cn(cellCls, 'text-sm text-slate-700 text-right')}><span className="font-mono tabular-nums">{bay.designCapacity}</span></td>
      <td className={cn(cellCls, 'text-sm text-right')}>
        <span className={cn('font-mono tabular-nums', curRed ? 'text-red-600 font-semibold' : 'text-slate-700')}>{bay.currentCapacity}</span>
      </td>
      <td className={cellCls}><StatusBadge status={bay.status} size="sm" /></td>
      <td className={cn(cellCls, hasDup && 'bg-diagonal-amber')}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-700 font-mono tabular-nums">{bay.feedbackCount}</span>
          {maxDup >= 2 && <DuplicateBadge count={maxDup} size="sm" showIcon={false} />}
        </div>
      </td>
      <td className={cn(cellCls, 'relative')}>{hasBad && <BadDataIndicator flags={badDataFlags} size="md" />}</td>
      <td className={cellCls}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/bays/${bay.id}`)} className="text-sm text-prussia-600 hover:text-prussia-800 hover:underline underline-offset-2 transition-colors">详情</button>
          <button onClick={() => navigate(`/bays/${bay.id}?action=supplement`)} className="text-sm text-amber-600 hover:text-amber-800 hover:underline underline-offset-2 transition-colors">补录</button>
        </div>
      </td>
    </tr>
  );
}

export default function BayList() {
  const navigate = useNavigate();
  const createExportBatch = useBusBayStore((s) => s.createExportBatch);
  const filters = useBusBayStore((s) => s.filters);
  const bays = useBusBayStore((s) => s.bays);
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMapView, setIsMapView] = useState(false);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const filteredBays = useMemo(() => {
    const { districts, roads, statuses, hasDuplicate, hasBadData, dateFrom, dateTo, keyword } = filters;
    return bays.filter((bay) => {
      if (districts.length > 0 && !districts.includes(bay.district)) return false;
      if (roads.length > 0 && !roads.includes(bay.road)) return false;
      if (statuses.length > 0 && !statuses.includes(bay.status)) return false;
      if (hasDuplicate !== null) {
        if (hasDuplicate && bay.duplicateCount === 0) return false;
        if (!hasDuplicate && bay.duplicateCount > 0) return false;
      }
      if (hasBadData !== null) {
        if (hasBadData && bay.badDataCount === 0) return false;
        if (!hasBadData && bay.badDataCount > 0) return false;
      }
      if (dateFrom) {
        if (new Date(bay.updatedAt) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(bay.updatedAt) > to) return false;
      }
      if (keyword && keyword.trim()) {
        const kw = keyword.trim();
        if (!bay.name.includes(kw) && !bay.road.includes(kw)) return false;
      }
      return true;
    });
  }, [bays, filters]);

  const total = filteredBays.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filteredBays.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const addToast = (message: string, type: ToastItem['type'] = 'success') => {
    setToasts((prev) => [...prev, { id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, message, type }]);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleExport = () => {
    try {
      const batch = createExportBatch('站点列表导出', '张工');
      addToast(`导出成功！\n批次号：${batch.id}\n哈希值：${batch.snapshotHash}\n共 ${batch.statistics.total} 条站点`, 'success');
    } catch { addToast('导出失败，请稍后重试', 'error'); }
  };

  const handleToggleMap = () => {
    setIsMapView((p) => !p);
    if (!isMapView) addToast('地图视图功能开发中', 'success');
  };

  const thCls = 'sticky top-0 z-10 px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap bg-slate-50 border-b border-slate-200';
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast items={toasts} onRemove={removeToast} />
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-serif font-semibold text-prussia-900">公交港湾站点列表</h1>
            <p className="text-sm text-slate-500 mt-1">共 <span className="font-mono font-semibold text-prussia-700">{total}</span> 个站点</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-prussia-700 text-white hover:bg-prussia-800 transition-all duration-200 active:scale-[0.98] shadow-sm">
              <Download className="w-4 h-4" />导出当前结果
            </button>
            <button onClick={handleToggleMap} className={cn('inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200 active:scale-[0.98]',
              isMapView ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'bg-white border-slate-300 text-slate-700 hover:border-prussia-400 hover:text-prussia-700 hover:bg-prussia-50')}>
              <Map className="w-4 h-4" />切换地图视图
            </button>
          </div>
        </div>
        <FilterPanel showExportButton={false} />
        <div className="bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden">
          {total === 0 ? <EmptyState /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className={cn(thCls, 'text-center')}>序号</th>
                      <th className={cn(thCls, 'text-left')}>站名</th>
                      <th className={cn(thCls, 'text-left')}>道路</th>
                      <th className={cn(thCls, 'text-left')}>行政区</th>
                      <th className={cn(thCls, 'text-right')}>设计容量</th>
                      <th className={cn(thCls, 'text-right')}>当前容量</th>
                      <th className={cn(thCls, 'text-left')}>状态</th>
                      <th className={cn(thCls, 'text-left')}>关联投诉数</th>
                      <th className={cn(thCls, 'text-left')}>坏数据</th>
                      <th className={cn(thCls, 'text-left')}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((bay, li) => (
                      <TableRow key={bay.id} bay={bay} index={(currentPage - 1) * PAGE_SIZE + li} navigate={navigate} />
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginator currentPage={currentPage} totalPages={totalPages} total={total} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
