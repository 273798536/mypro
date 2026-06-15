import { useState, useMemo } from 'react';
import { useBusBayStore } from '@/store';
import type { ExportBatch, FilterCriteria, ExportStatistics, BusBay } from '@/types';
import {
  CheckCircle2, Download, Eye, RefreshCw, Search, X,
  CheckSquare, BarChart3, FileSpreadsheet, Clock, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { idx: 1, title: '确认筛选条件', icon: Search },
  { idx: 2, title: '核对统计数字', icon: BarChart3 },
  { idx: 3, title: '生成导出批次', icon: FileSpreadsheet },
  { idx: 4, title: '下载文件/追溯重导', icon: Download },
];

const STAT_LABELS: { key: keyof ExportStatistics; label: string; color: string; bg: string }[] = [
  { key: 'total', label: '站点总数', color: 'text-prussia-700', bg: 'bg-prussia-50' },
  { key: 'normal', label: '正常', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'abnormal', label: '异常', color: 'text-red-700', bg: 'bg-red-50' },
  { key: 'pending', label: '待复核', color: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'duplicates', label: '重复数据', color: 'text-purple-700', bg: 'bg-purple-50' },
  { key: 'badData', label: '坏数据', color: 'text-rose-700', bg: 'bg-rose-50' },
];

const STATUS_LABELS: Record<string, string> = { normal: '正常', abnormal: '异常', pending: '待复核' };

function FiltersTags({ f }: { f: FilterCriteria }) {
  const tags: { label: string; color: string }[] = [];
  f.districts?.length && tags.push({ label: `行政区:${f.districts.join('、')}`, color: 'bg-blue-100 text-blue-700' });
  f.roads?.length && tags.push({ label: `道路:${f.roads.join('、')}`, color: 'bg-indigo-100 text-indigo-700' });
  f.statuses?.length && tags.push({ label: `状态:${f.statuses.map(s => STATUS_LABELS[s]).join('、')}`, color: 'bg-emerald-100 text-emerald-700' });
  if (f.hasDuplicate === true) tags.push({ label: '有重复投诉', color: 'bg-purple-100 text-purple-700' });
  if (f.hasDuplicate === false) tags.push({ label: '无重复投诉', color: 'bg-purple-50 text-purple-600' });
  if (f.hasBadData === true) tags.push({ label: '有坏数据', color: 'bg-rose-100 text-rose-700' });
  if (f.hasBadData === false) tags.push({ label: '无坏数据', color: 'bg-rose-50 text-rose-600' });
  if (f.dateFrom || f.dateTo) tags.push({ label: `日期:${f.dateFrom || '—'}~${f.dateTo || '—'}`, color: 'bg-amber-100 text-amber-700' });
  f.keyword && tags.push({ label: `关键词:${f.keyword}`, color: 'bg-slate-100 text-slate-700' });
  if (tags.length === 0) tags.push({ label: '全量导出（无筛选）', color: 'bg-slate-50 text-slate-500' });
  return <div className="flex gap-1.5 flex-wrap">
    {tags.map((t, i) => <span key={i} className={cn('tag', t.color)}><Hash className="w-3 h-3" />{t.label}</span>)}
  </div>;
}

export default function ExportCenter() {
  const [detailBatch, setDetailBatch] = useState<ExportBatch | null>(null);
  const [reExportMode, setReExportMode] = useState<'snapshot' | 'current' | null>(null);

  const exportBatches = useBusBayStore(s => s.exportBatches);
  const bays = useBusBayStore(s => s.bays);
  const currentFilters = useBusBayStore(s => s.filters);
  const createBatch = useBusBayStore(s => s.createExportBatch);
  const reExport = useBusBayStore(s => s.reExportFromBatch);
  const applyFilters = useBusBayStore(s => s.setFilters);

  const currentStats = useMemo(() => {
    const { districts, roads, statuses, hasDuplicate, hasBadData, dateFrom, dateTo, keyword } = currentFilters;
    const filtered = bays.filter((bay) => {
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
    const s = { total: filtered.length, abnormal: 0, normal: 0, pending: 0, duplicates: 0, badData: 0 };
    for (const bay of filtered) {
      switch (bay.status) {
        case 'abnormal': s.abnormal++; break;
        case 'normal': s.normal++; break;
        case 'pending': s.pending++; break;
      }
      if (bay.duplicateCount > 0) s.duplicates++;
      if (bay.badDataCount > 0) s.badData++;
    }
    return s;
  }, [bays, currentFilters]);

  const sortedBatches = useMemo(() =>
    [...exportBatches].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
    [exportBatches]);

  const bayNameMap = useMemo(() => new Map(bays.map(b => [b.id, b.name])), [bays]);

  const getPreviewData = (batch: ExportBatch): BusBay[] => {
    const ids = batch.bayIdsSnapshot;
    return ids.slice(0, 5).map(id => bays.find(b => b.id === id)).filter(Boolean) as BusBay[];
  };

  const handleGenerateNew = () => {
    const batch = createBatch('手动生成导出批次', '张工');
    setDetailBatch(batch);
  };

  const handleDownload = (batch: ExportBatch) => {
    const content = [
      ['站点名', '道路', '行政区', '设计容量', '当前容量', '状态', '反馈数', '重复数', '坏数据'],
      ...batch.bayIdsSnapshot.map(id => {
        const b = bays.find(x => x.id === id);
        if (!b) return [];
        return [b.name, b.road, b.district, String(b.designCapacity), String(b.currentCapacity),
          STATUS_LABELS[b.status], String(b.feedbackCount), String(b.duplicateCount), String(b.badDataCount)];
      }),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公交港湾导出_${batch.snapshotHash}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReExport = (mode: 'snapshot' | 'current') => {
    if (!detailBatch) return;
    setReExportMode(mode);
    setTimeout(() => {
      if (mode === 'snapshot') {
        const fb = reExport(detailBatch.id);
        if (fb) {
          const newBatch = createBatch(`基于快照重导（原批次${detailBatch.snapshotHash}）`, '张工');
          setDetailBatch(newBatch);
        }
      } else {
        const newBatch = createBatch(`基于当前数据重导（原批次${detailBatch.snapshotHash}）`, '张工');
        setDetailBatch(newBatch);
      }
      setReExportMode(null);
    }, 800);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="page-title mb-1">导出中心</h2>
          <p className="text-sm text-slate-500">按流程生成数据批次，支持下载与追溯重导</p>
        </div>
        <button onClick={handleGenerateNew} className="btn-primary">
          <FileSpreadsheet className="w-4 h-4" />立即生成批次
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2"><CheckSquare className="w-4 h-4 text-prussia-600" />操作指引</h3>
          <div className="text-xs text-slate-400">当前筛选状态实时显示于首页「筛选面板」</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s.idx} className="relative flex items-start gap-3 p-4 bg-slate-50 rounded-md">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                i <= 1 ? 'bg-emerald-500 text-white' : i === 2 ? 'bg-prussia-600 text-white' : 'bg-slate-300 text-white')}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={cn('font-medium text-sm', i <= 1 ? 'text-emerald-700' : i === 2 ? 'text-prussia-700' : 'text-slate-500')}>
                  第{s.idx}步 · {s.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {i === 0 && `共 ${activeFilterCount(currentFilters)} 个筛选条件`}
                  {i === 1 && `统计：${currentStats.total}个站点，${currentStats.abnormal}异常`}
                  {i === 2 && `历史：${exportBatches.length}个批次`}
                  {i === 3 && '支持CSV/XLSX格式'}
                </p>
              </div>
              {i < STEPS.length - 1 && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 border-r-2 border-t-2 border-slate-300 rotate-45" />}
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-prussia-50/60 rounded-md border border-prussia-100">
          <p className="text-xs text-prussia-700 font-medium mb-2 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />当前筛选条件预览</p>
          <FiltersTags f={currentFilters} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="section-title flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-prussia-600" />导出批次列表</h3>
        {sortedBatches.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400 shadow-card">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>暂无导出批次，点击「立即生成批次」创建第一个</p>
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sortedBatches.map(batch => (
            <div key={batch.id} className="bg-white border border-slate-200 rounded-md shadow-card overflow-hidden">
              <div className="bg-emerald-500 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">导出成功</span>
                  <span className="text-xs text-emerald-100 font-mono">
                    {new Date(batch.generatedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <span className="font-mono text-xs text-emerald-100">#{batch.snapshotHash}</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Hash className="w-3 h-3" />筛选条件</p>
                  <FiltersTags f={batch.filterCriteria} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {STAT_LABELS.map(s => (
                    <div key={s.key} className={cn('rounded-md p-2 text-center', s.bg)}>
                      <p className={cn('font-mono font-bold text-xl', s.color)}>{batch.statistics[s.key]}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />操作人：{batch.generatedBy}</span>
                  {batch.remark && <span className="truncate max-w-[200px] text-slate-400">{batch.remark}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(batch)} className="flex-1 btn-primary text-xs py-2">
                    <Download className="w-3.5 h-3.5" />下载
                  </button>
                  <button onClick={() => setDetailBatch(batch)} className="flex-1 btn-secondary text-xs py-2">
                    <Eye className="w-3.5 h-3.5" />查看详情
                  </button>
                  <button onClick={() => { applyFilters(batch.filterCriteria); alert('已恢复该批次筛选条件到当前视图'); }}
                    className="flex-1 btn-secondary text-xs py-2">
                    <RefreshCw className="w-3.5 h-3.5" />重新导出
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setDetailBatch(null); setReExportMode(null); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="section-title">导出批次详情 <span className="text-xs text-slate-400 font-mono ml-2">#{detailBatch.snapshotHash}</span></h3>
              <button onClick={() => { setDetailBatch(null); setReExportMode(null); }} className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-auto">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Hash className="w-4 h-4 text-slate-400" />完整筛选条件</p>
                <div className="bg-slate-50 rounded-md p-3"><FiltersTags f={detailBatch.filterCriteria} /></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><BarChart3 className="w-4 h-4 text-slate-400" />统计数据</p>
                <div className="grid grid-cols-6 gap-2">
                  {STAT_LABELS.map(s => (
                    <div key={s.key} className={cn('rounded-md p-3 text-center', s.bg)}>
                      <p className={cn('font-mono font-bold text-2xl', s.color)}>{detailBatch.statistics[s.key]}</p>
                      <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">快照包含 <span className="font-mono font-medium text-prussia-600">{detailBatch.bayIdsSnapshot.length}</span> 个站点ID</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1"><Eye className="w-4 h-4 text-slate-400" />明细预览（前5行）</p>
                <div className="border border-slate-200 rounded-md overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50"><tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">站点名</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">道路</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">容量</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">状态</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">反馈</th>
                    </tr></thead>
                    <tbody>
                      {getPreviewData(detailBatch).map((b, i) => (
                        <tr key={b.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-prussia-700">{b.name}</td>
                          <td className="px-3 py-2 text-slate-600">{b.road}</td>
                          <td className="px-3 py-2 text-center font-mono">{b.currentCapacity}/{b.designCapacity}</td>
                          <td className="px-3 py-2 text-center">
                            {b.status === 'normal' && <span className="table-badge bg-emerald-100 text-emerald-700">正常</span>}
                            {b.status === 'abnormal' && <span className="table-badge bg-red-100 text-red-700">异常</span>}
                            {b.status === 'pending' && <span className="table-badge bg-amber-100 text-amber-700">待复核</span>}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{b.feedbackCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">* 预览基于当前数据库状态，可能与当时快照略有差异</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1"><RefreshCw className="w-4 h-4 text-slate-400" />追溯重导选项</p>
                <div className="grid grid-cols-2 gap-3">
                  <button disabled={reExportMode !== null} onClick={() => handleReExport('snapshot')}
                    className={cn('p-4 rounded-md border-2 border-dashed text-left transition-all',
                      reExportMode === 'snapshot' ? 'bg-prussia-50 border-prussia-400' : 'border-slate-200 hover:border-prussia-300 hover:bg-prussia-50/50')}>
                    <p className="font-medium text-slate-800 flex items-center gap-2">
                      {reExportMode === 'snapshot' && <RefreshCw className="w-4 h-4 text-prussia-600 animate-spin" />}
                      按当时快照重导
                    </p>
                    <p className="text-xs text-slate-500 mt-1">恢复该批次的筛选条件，生成新批次</p>
                  </button>
                  <button disabled={reExportMode !== null} onClick={() => handleReExport('current')}
                    className={cn('p-4 rounded-md border-2 border-dashed text-left transition-all',
                      reExportMode === 'current' ? 'bg-emerald-50 border-emerald-400' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50')}>
                    <p className="font-medium text-slate-800 flex items-center gap-2">
                      {reExportMode === 'current' && <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />}
                      按当前数据重导
                    </p>
                    <p className="text-xs text-slate-500 mt-1">用最新数据重新执行该批次筛选条件</p>
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => { setDetailBatch(null); setReExportMode(null); }} className="btn-secondary text-sm py-2">关闭</button>
              <button onClick={() => handleDownload(detailBatch)} className="btn-primary text-sm py-2">
                <Download className="w-4 h-4" />下载文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function activeFilterCount(f: FilterCriteria): number {
  let c = 0;
  if (f.districts?.length) c++;
  if (f.roads?.length) c++;
  if (f.statuses?.length) c++;
  if (f.hasDuplicate !== null) c++;
  if (f.hasBadData !== null) c++;
  if (f.dateFrom || f.dateTo) c++;
  if (f.keyword) c++;
  return c;
}
