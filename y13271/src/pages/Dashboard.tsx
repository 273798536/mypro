import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  AlertTriangle,
  CheckCircle,
  Repeat,
  Clock,
  Lightbulb,
  X,
  ArrowRight,
  Upload,
  Search,
  Database,
} from 'lucide-react';
import { FilterPanel } from '@/components/FilterPanel';
import { StatCard } from '@/components/StatCard';
import { useBusBayStore } from '@/store';
import type { ChangedBy, VersionHistory } from '@/types';
import { cn } from '@/lib/utils';

const CHANGED_BY_LABEL: Record<ChangedBy, { label: string; color: string }> = {
  resident: { label: '居民反馈', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  field: { label: '现场', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  planner: { label: '规划师', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Dashboard() {
  const [showTip, setShowTip] = useState(true);
  const setFilters = useBusBayStore((s) => s.setFilters);
  const resetFilters = useBusBayStore((s) => s.resetFilters);
  const versions = useBusBayStore((s) => s.versions);
  const bays = useBusBayStore((s) => s.bays);
  const filters = useBusBayStore((s) => s.filters);

  const stats = useMemo(() => {
    const { districts, roads, statuses, hasDuplicate, hasBadData, dateFrom, dateTo, keyword } = filters;
    // 诊断：如果没有任何筛选条件，直接使用全部 bays，避免因筛选逻辑 bug 导致全为 0
    const hasAnyFilter =
      districts.length > 0 ||
      roads.length > 0 ||
      statuses.length > 0 ||
      hasDuplicate !== null ||
      hasBadData !== null ||
      !!dateFrom ||
      !!dateTo ||
      (!!keyword && keyword.trim().length > 0);
    const filtered = hasAnyFilter
      ? bays.filter((bay) => {
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
        })
      : bays;
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
  }, [bays, filters]);

  const recentVersions = useMemo(() => {
    const sorted = [...versions].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
    return sorted.slice(0, 20);
  }, [versions]);

  const bayMap = useMemo(() => {
    const map = new Map<string, string>();
    bays.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [bays]);

  const handleStatClick = (filter: {
    statuses?: ('normal' | 'abnormal' | 'pending')[];
    hasDuplicate?: boolean | null;
  }) => {
    resetFilters();
    setFilters(filter);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {showTip && (
        <div className="bg-sky-50 border-b border-sky-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sky-800">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-sm font-medium">
              小赵，月底导出前记得先把筛选条件保存为批次哦
            </span>
          </div>
          <button
            onClick={() => setShowTip(false)}
            className="p-1.5 rounded-md text-sky-600 hover:bg-sky-100 hover:text-sky-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 font-serif">数据总览</h1>

        <FilterPanel showExportButton={false} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Building2}
            label="总站点数"
            value={stats.total}
            color="prussia"
            onClick={() => resetFilters()}
          />
          <StatCard
            icon={AlertTriangle}
            label="异常数"
            value={stats.abnormal}
            color="red"
            onClick={() => handleStatClick({ statuses: ['abnormal'] })}
          />
          <StatCard
            icon={CheckCircle}
            label="正常数"
            value={stats.normal}
            color="green"
            onClick={() => handleStatClick({ statuses: ['normal'] })}
          />
          <StatCard
            icon={Repeat}
            label="重复投诉站点数"
            value={stats.duplicates}
            color="purple"
            onClick={() => handleStatClick({ hasDuplicate: true })}
          />
          <StatCard
            icon={Clock}
            label="待复核数"
            value={stats.pending}
            color="amber"
            onClick={() => handleStatClick({ statuses: ['pending'] })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/upload"
            className={cn(
              'group relative overflow-hidden rounded-xl p-6 text-white',
              'bg-gradient-to-br from-blue-500 to-blue-700',
              'shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
            )}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">① 哪里放材料</p>
              <h3 className="text-lg font-bold mb-2">居民反馈/现场照片导入</h3>
              <p className="text-sm opacity-85 mb-6 leading-relaxed">
                上传 Excel 表格或现场采集照片，自动识别匹配站点并检测坏数据和重复投诉
              </p>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium group-hover:bg-white/30 transition-colors">
                  <Upload className="w-4 h-4" />
                  去上传
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/anomalies"
            className={cn(
              'group relative overflow-hidden rounded-xl p-6 text-white',
              'bg-gradient-to-br from-orange-500 to-orange-700',
              'shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
            )}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">② 哪里看异常</p>
              <h3 className="text-lg font-bold mb-2">坏数据/重复投诉/待复核</h3>
              <p className="text-sm opacity-85 mb-6 leading-relaxed">
                统一查看异常清单，一键定位问题站点，支持人工复核并标注处理状态
              </p>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium group-hover:bg-white/30 transition-colors">
                  <Search className="w-4 h-4" />
                  去排查
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/export"
            className={cn(
              'group relative overflow-hidden rounded-xl p-6 text-white',
              'bg-gradient-to-br from-emerald-500 to-emerald-700',
              'shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
            )}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-sm font-medium opacity-90 mb-1">③ 哪里重新导出</p>
              <h3 className="text-lg font-bold mb-2">追溯历史批次/一键重导</h3>
              <p className="text-sm opacity-85 mb-6 leading-relaxed">
                按时间线浏览历史导出批次，一键恢复筛选条件并重新生成最新数据报表
              </p>
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium group-hover:bg-white/30 transition-colors">
                  <Database className="w-4 h-4" />
                  去导出
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 font-serif">最近7天变更记录</h2>
            <span className="text-xs text-slate-400">共 {recentVersions.length} 条</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentVersions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">暂无变更记录</div>
            ) : (
              recentVersions.map((v: VersionHistory) => {
                const by = CHANGED_BY_LABEL[v.changedBy];
                const bayName = bayMap.get(v.bayId) ?? '未知站点';
                const thumbs = (v.attachments ?? []).slice(0, 2);
                return (
                  <div key={v.id} className="flex gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-3 h-3 rounded-full bg-prussia-500 ring-4 ring-prussia-100 shrink-0" />
                      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDateTime(v.changedAt)}
                        </span>
                        <Link
                          to={`/bays/${v.bayId}`}
                          className="text-sm font-semibold text-prussia-700 hover:text-prussia-900 hover:underline transition-colors truncate max-w-[200px]"
                        >
                          {bayName}
                        </Link>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                            by.color
                          )}
                        >
                          {by.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {v.changeSummary || v.remark || '字段更新'}
                      </p>
                      {thumbs.length > 0 && (
                        <div className="mt-2.5 flex gap-2">
                          {thumbs.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt="附件截图"
                              className="w-16 h-16 object-cover rounded-md border border-slate-200 hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
