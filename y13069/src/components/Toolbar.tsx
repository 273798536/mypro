import {
  Box,
  Search,
  RefreshCw,
  AlertTriangle,
  Download,
  UserCog,
  Layers,
  FilterX,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import type { PointStatus, VersionScope } from '../types';
import { cn } from '../lib/utils';

const STATUS_OPTIONS: { value: PointStatus; label: string; color: string }[] = [
  { value: 'approved', label: '已通过', color: 'bg-emerald-600' },
  { value: 'pending', label: '待审核', color: 'bg-amber-600' },
  { value: 'conflict', label: '冲突', color: 'bg-red-700' },
  { value: 'withdrawn', label: '已撤回', color: 'bg-gray-500' },
  { value: 'rejected', label: '已驳回', color: 'bg-red-600' },
];

const ZONE_OPTIONS = ['后舞台区', '主舞台中区', '主舞台前区', '台口区', '侧台A', '侧台B'];
const VERSION_SCOPES: { value: VersionScope; label: string }[] = [
  { value: 'current', label: '仅当前版本' },
  { value: 'includeOld', label: '含旧版数据' },
  { value: 'onlyWithdrawn', label: '仅撤回版本' },
];

export default function Toolbar() {
  const loc = useLocation();
  const store = useAppStore();
  const getActiveVersion = store.getActiveVersion;
  const filters = useAppStore((s) => s.filters);
  const setF = useAppStore((s) => s.setFilters);
  const reset = useAppStore((s) => s.resetAll);
  const anomalies = useAppStore((s) => s.anomalies);
  const versions = useAppStore((s) => s.versions);
  const activeVersionId = useAppStore((s) => s.viewState.activeVersionId);
  const activeVersion = getActiveVersion();
  const openAnoms = anomalies.filter((a) => a.status !== 'closed').length;

  const toggleInArr = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const hasAnyFilter =
    filters.rigNos.length +
      filters.zones.length +
      filters.statuses.length +
      filters.keyword.trim().length >
    0 || filters.versionScope !== 'current';

  return (
    <div className="h-16 border-b border-brass-900/50 bg-[#0D1C33]/90 backdrop-blur-md px-5 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brass-500 to-brass-700 flex items-center justify-center shadow-[0_0_15px_rgba(201,169,98,0.25)]">
          <Box size={20} className="text-[#0A1628]" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1
            className="text-[15px] text-brass-200 font-semibold truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            剧院吊杆阵列方案比选
          </h1>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
            <span>{activeVersion?.label ?? '—'}</span>
            {activeVersion?.isWithdrawn && (
              <span className="bg-gray-600/80 text-gray-100 px-1.5 py-0.5 rounded text-[10px] line-through">
                已撤回
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide px-2">
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.keyword}
            onChange={(e) => setF({ keyword: e.target.value })}
            placeholder="搜索吊杆编号 / 区域..."
            className="w-56 h-8 pl-8 pr-3 rounded-lg bg-[#0F2038] border border-slate-700/60 text-[12px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brass-600 transition-colors"
          />
        </div>

        <div className="h-6 w-px bg-slate-700/60 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          <Layers size={13} className="text-slate-400 mr-1" />
          {VERSION_SCOPES.map((s) => (
            <button
              key={s.value}
              onClick={() => setF({ versionScope: s.value })}
              className={cn(
                'h-8 px-3 rounded-lg text-[11px] transition-all border',
                filters.versionScope === s.value
                  ? 'bg-brass-600/20 text-brass-300 border-brass-600/60'
                  : 'bg-[#0F2038] text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-300',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-700/60 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-500 mr-1">状态:</span>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.value}
              onClick={() => setF({ statuses: toggleInArr(filters.statuses, st.value) })}
              className={cn(
                'h-7 px-2 rounded-md text-[11px] transition-all flex items-center gap-1.5 border',
                filters.statuses.includes(st.value)
                  ? `${st.color}/20 border-${st.color.replace('bg-', '')}/60 text-white`
                  : 'bg-[#0F2038] border-slate-700/60 text-slate-400 hover:text-slate-200',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', st.color)} />
              {st.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-700/60 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-500 mr-1">区域:</span>
          {ZONE_OPTIONS.slice(0, 4).map((z) => (
            <button
              key={z}
              onClick={() => setF({ zones: toggleInArr(filters.zones, z) })}
              className={cn(
                'h-7 px-2 rounded-md text-[11px] transition-all border',
                filters.zones.includes(z)
                  ? 'bg-cyan-900/40 text-cyan-200 border-cyan-700/70'
                  : 'bg-[#0F2038] border-slate-700/60 text-slate-400 hover:text-slate-200',
              )}
            >
              {z}
            </button>
          ))}
        </div>

        {hasAnyFilter && (
          <button
            onClick={reset}
            className="shrink-0 ml-2 h-7 px-2 rounded-md text-[11px] border border-dashed border-red-500/50 text-red-300 hover:bg-red-500/10 flex items-center gap-1 transition-all"
            title="清除所有筛选与视图状态"
          >
            <FilterX size={12} />
            重置状态
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={reset}
          className="h-8 w-8 rounded-lg bg-[#0F2038] border border-slate-700/60 text-slate-400 hover:text-brass-300 hover:border-brass-600/60 flex items-center justify-center transition-all"
          title="刷新并还原"
        >
          <RefreshCw size={14} />
        </button>

        <Link
          to="/anomalies"
          className={cn(
            'relative h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] border',
            loc.pathname === '/anomalies'
              ? 'bg-red-900/40 text-red-200 border-red-700/70'
              : 'bg-[#0F2038] text-slate-400 border-slate-700/60 hover:text-red-300 hover:border-red-700/50',
          )}
        >
          <AlertTriangle size={14} />
          异常
          {openAnoms > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
              {openAnoms}
            </span>
          )}
        </Link>

        <Link
          to="/export"
          className={cn(
            'h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] border',
            loc.pathname === '/export'
              ? 'bg-emerald-900/40 text-emerald-200 border-emerald-700/70'
              : 'bg-[#0F2038] text-slate-400 border-slate-700/60 hover:text-emerald-300 hover:border-emerald-700/50',
          )}
        >
          <Download size={14} />
          导出
        </Link>

        <Link
          to="/console"
          className={cn(
            'h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] border',
            loc.pathname === '/console'
              ? 'bg-brass-600/20 text-brass-300 border-brass-600/70'
              : 'bg-[#0F2038] text-slate-400 border-slate-700/60 hover:text-brass-300 hover:border-brass-600/50',
          )}
        >
          <UserCog size={14} />
          控制台
        </Link>
      </div>
    </div>
  );
}
