import { useState } from 'react';
import {
  AlertTriangle,
  ImageOff,
  RotateCcw,
  GitCompare,
  Ban,
  CheckCircle2,
  Circle,
  ArrowRight,
  Search,
  FilterX,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import type { AnomalyType } from '../types';
import Toolbar from '../components/Toolbar';

const ANOMALY_META: Record<AnomalyType, {
  label: string;
  icon: any;
  cls: string;
  badgeCls: string;
  defaultResult: string;
}> = {
  screenshot_missing: {
    label: '截图条件丢失',
    icon: ImageOff,
    cls: 'bg-amber-950/40 border-amber-800/60',
    badgeCls: 'bg-amber-600/30 text-amber-200 border-amber-600/60',
    defaultResult: '处理结果：待补材料，非正常通过',
  },
  withdrawn: {
    label: '撤回记录',
    icon: RotateCcw,
    cls: 'bg-gray-800/60 border-gray-600/50',
    badgeCls: 'bg-gray-600/40 text-gray-200 border-gray-500/60',
    defaultResult: '处理结果：已撤回，结论不纳入当前版本',
  },
  conflict: {
    label: '坐标冲突',
    icon: GitCompare,
    cls: 'bg-red-950/50 border-red-900/70',
    badgeCls: 'bg-red-700/40 text-red-200 border-red-600/60',
    defaultResult: '处理结果：待现场协调，暂缓通过',
  },
  old_version: {
    label: '旧版坐标遗留',
    icon: Ban,
    cls: 'bg-orange-950/40 border-orange-900/60',
    badgeCls: 'bg-orange-700/40 text-orange-200 border-orange-600/60',
    defaultResult: '处理结果：已在后续版本修正，此版本结论权重降低',
  },
};

export default function AnomaliesPage() {
  const store = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const anomalies = store.anomalies.filter((a) => {
    if (typeFilter !== 'all' && a.anomalyType !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (keyword.trim()) {
      const k = keyword.toLowerCase();
      const version = store.versions.find(v => v.id === a.versionId);
      const point = a.pointId ? store.getPointById(a.pointId) : null;
      return (
        a.description.toLowerCase().includes(k) ||
        version?.label.toLowerCase().includes(k) ||
        point?.rigNo.toLowerCase().includes(k) ||
        false
      );
    }
    return true;
  });

  const grouped: Record<string, typeof anomalies> = {};
  anomalies.forEach((a) => {
    const key = a.versionId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  const stats = {
    total: store.anomalies.length,
    open: store.anomalies.filter(a => a.status === 'open').length,
    processing: store.anomalies.filter(a => a.status === 'processing').length,
    closed: store.anomalies.filter(a => a.status === 'closed').length,
    screenshot: store.anomalies.filter(a => a.anomalyType === 'screenshot_missing').length,
  };

  const hasAnyFilter = keyword.trim() || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="min-h-screen bg-[#07111F] flex flex-col">
      <Toolbar />

      <div className="flex-1 px-6 py-5">
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] text-brass-100 font-semibold flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <AlertTriangle className="text-red-400" size={20} />
              异常看板
            </h2>
            <p className="text-[11.5px] text-slate-400 mt-1">
              所有异常记录 · 异常项不可标记为正常通过 · 处理结果需保留实际操作痕迹
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {[
              { label: '总记录', value: stats.total, cls: 'bg-slate-800/60 border-slate-700/60 text-slate-200' },
              { label: '待处理', value: stats.open, cls: 'bg-red-950/50 border-red-900/60 text-red-300' },
              { label: '处理中', value: stats.processing, cls: 'bg-amber-950/50 border-amber-900/60 text-amber-300' },
              { label: '已关闭', value: stats.closed, cls: 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' },
              { label: '截图丢失', value: stats.screenshot, cls: 'bg-orange-950/50 border-orange-900/60 text-orange-300' },
            ].map(s => (
              <div key={s.label} className={cn('px-3 py-2 rounded-xl border min-w-[88px]')}>
                <div className="text-[18px] font-semibold tabular-nums">{s.value}</div>
                <div className="text-[10px] mt-0.5 opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索描述 / 版本 / 吊杆编号..."
              className="w-72 h-8 pl-8 pr-3 rounded-lg bg-[#0F2038] border border-slate-700/60 text-[12px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brass-600 transition-colors"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-8 px-3 rounded-lg bg-[#0F2038] border border-slate-700/60 text-[11.5px] text-slate-200 focus:outline-none focus:border-brass-600"
          >
            <option value="all">全部类型</option>
            <option value="screenshot_missing">截图条件丢失</option>
            <option value="withdrawn">撤回记录</option>
            <option value="conflict">坐标冲突</option>
            <option value="old_version">旧版遗留</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 rounded-lg bg-[#0F2038] border border-slate-700/60 text-[11.5px] text-slate-200 focus:outline-none focus:border-brass-600"
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="processing">处理中</option>
            <option value="closed">已关闭</option>
          </select>

          {hasAnyFilter && (
            <button
              onClick={() => { setKeyword(''); setTypeFilter('all'); setStatusFilter('all'); }}
              className="h-8 px-2.5 rounded-lg border border-dashed border-red-500/50 text-red-300 text-[11px] hover:bg-red-500/10 flex items-center gap-1 transition-all"
            >
              <FilterX size={12} />
              清除筛选
            </button>
          )}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-12 text-center">
            <CheckCircle2 size={48} className="text-emerald-600/50 mx-auto mb-3" />
            <p className="text-slate-300 text-[13px] mb-1">当前筛选条件下没有异常记录</p>
            <p className="text-slate-500 text-[11px]">尝试调整筛选条件或清除所有筛选</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([verId, list]) => {
              const version = store.versions.find(v => v.id === verId);
              return (
                <div key={verId} className="rounded-2xl border border-slate-800/70 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/70 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded-md border',
                        version?.isWithdrawn
                          ? 'bg-gray-600/30 text-gray-300 border-gray-500/60 line-through'
                          : version?.isActive
                            ? 'bg-brass-600/20 text-brass-300 border-brass-600/60'
                            : 'bg-slate-700/40 text-slate-300 border-slate-600/60',
                      )}>
                        V{version?.versionNo}
                      </span>
                      <h3 className="text-[13px] text-slate-200 font-medium">{version?.label}</h3>
                      <span className="text-[10.5px] text-slate-500">
                        {dayjs(version?.timestamp).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      {['open', 'processing', 'closed'].map(st => {
                        const n = list.filter(l => l.status === st).length;
                        if (!n) return null;
                        return (
                          <span key={st} className={cn(
                            'px-1.5 py-0.5 rounded',
                            st === 'open' && 'bg-red-900/50 text-red-300',
                            st === 'processing' && 'bg-amber-900/50 text-amber-300',
                            st === 'closed' && 'bg-emerald-900/50 text-emerald-300',
                          )}>
                            {st === 'open' && '待处理'}
                            {st === 'processing' && '处理中'}
                            {st === 'closed' && '已关闭'}
                            {n}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {list.map(a => {
                      const meta = ANOMALY_META[a.anomalyType];
                      const Icon = meta.icon;
                      const point = a.pointId ? store.getPointById(a.pointId) : null;
                      return (
                        <div
                          key={a.id}
                          className={cn('p-4 transition-colors hover:bg-slate-900/30', meta.cls, 'border-l-4')}
                          style={{
                            borderLeftColor:
                              a.anomalyType === 'screenshot_missing' ? '#D97706' :
                              a.anomalyType === 'withdrawn' ? '#6B7280' :
                              a.anomalyType === 'conflict' ? '#B91C1C' : '#EA580C',
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                              meta.badgeCls,
                              'border',
                            )}>
                              <Icon size={16} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={cn(
                                  'text-[10px] px-2 py-0.5 rounded border',
                                  meta.badgeCls,
                                )}>
                                  {meta.label}
                                </span>
                                {point && (
                                  <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50 font-mono">
                                    {point.rigNo}
                                  </span>
                                )}
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1',
                                  a.status === 'open' && 'bg-red-700/40 text-red-200 border-red-600/60',
                                  a.status === 'processing' && 'bg-amber-700/40 text-amber-200 border-amber-600/60',
                                  a.status === 'closed' && 'bg-emerald-700/40 text-emerald-200 border-emerald-600/60',
                                )}>
                                  {a.status === 'open' && <Circle size={9} className="animate-pulse" />}
                                  {a.status === 'processing' && <Circle size={9} />}
                                  {a.status === 'closed' && <CheckCircle2 size={9} />}
                                  {a.status === 'open' && '待处理'}
                                  {a.status === 'processing' && '处理中'}
                                  {a.status === 'closed' && '已关闭'}
                                </span>
                                <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
                                  创建：{dayjs(a.createdAt).format('MM-DD HH:mm')}
                                </span>
                              </div>

                              <p className="text-[12px] text-slate-200 leading-relaxed">
                                {a.description}
                              </p>

                              <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
                                <div className={cn(
                                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border-dashed border text-[10.5px]',
                                  a.anomalyType === 'screenshot_missing' && 'border-amber-600/60 text-amber-300 bg-amber-950/30',
                                  a.anomalyType === 'withdrawn' && 'border-gray-500/60 text-gray-300 bg-gray-800/40',
                                  a.anomalyType === 'conflict' && 'border-red-700/60 text-red-200 bg-red-950/30',
                                  a.anomalyType === 'old_version' && 'border-orange-700/60 text-orange-200 bg-orange-950/30',
                                )}>
                                  <Ban size={11} />
                                  {meta.defaultResult}
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5 text-[10.5px] text-slate-500 select-none">
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      disabled
                                      className="opacity-40 cursor-not-allowed"
                                    />
                                    标记为正常通过（
                                    <span className="text-red-400">禁止</span>
                                    ）
                                  </label>
                                  {point && (
                                    <button
                                      onClick={() => {
                                        store.switchVersion(verId);
                                        store.setViewState({ selectedPointIds: [point.id] });
                                        window.location.hash = '#/';
                                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                                      }}
                                      className="h-6 px-2 rounded-md bg-brass-600/30 border border-brass-700/60 text-[10.5px] text-brass-200 hover:bg-brass-600/50 flex items-center gap-1 transition-colors"
                                    >
                                      跳转至3D工作台
                                      <ArrowRight size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
