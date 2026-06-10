import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Plus,
  Edit3,
  Thermometer,
  AlertTriangle,
  Info,
  FlaskConical,
  Clock,
  Package,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import type { Reagent } from '../../shared/types';

export function ReagentLedgerPage() {
  const navigate = useNavigate();
  const { reagents, fetchReagents, fetchCalculations, calculations } = useAppStore();
  const [search, setSearch] = useState('');
  const [showSupplementedOnly, setShowSupplementedOnly] = useState(false);

  useEffect(() => {
    fetchReagents();
    fetchCalculations();
  }, [fetchReagents, fetchCalculations]);

  const activeReagents = reagents.filter((r) => r.status === 'active');
  const filtered = activeReagents
    .filter((r) => (showSupplementedOnly ? r.isSupplemented : true))
    .filter((r) =>
      search
        ? r.batchNo.toLowerCase().includes(search.toLowerCase()) ||
          r.name.toLowerCase().includes(search.toLowerCase())
        : true
    );

  return (
    <div className="space-y-6">
      <section className="animate-slide-up stagger-1">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded shadow-card overflow-hidden">
          <div className="px-6 py-5 flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-slate-400" strokeWidth={1.8} />
                <h2 className="text-slate-400 text-xs font-medium uppercase tracking-[0.15em]">
                  试剂台账管理
                </h2>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">
                试剂浓度与温度曲线台账
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                支持录入、补录修正，自动检测同批次重复记录并合并，避免同一件事产生多份结论
              </p>
            </div>
            <button
              onClick={() => navigate('/reagent-ledger/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-semibold text-sm rounded hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              新增试剂
            </button>
          </div>
          <div className="grid grid-cols-3 gap-px bg-slate-700/30">
            {[
              { label: '试剂总数', val: activeReagents.length, icon: Package },
              { label: '有补录记录', val: activeReagents.filter(r => r.isSupplemented).length, icon: Edit3, accent: 'text-accent-400' },
              { label: '曲线缺失', val: activeReagents.filter(r => r.temperatureCurves.length < 2).length, icon: Thermometer, accent: 'text-status-attention' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-slate-900/50 px-6 py-4 animate-slide-up" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-xs">{s.label}</span>
                    <Icon className={cn('w-3.5 h-3.5', s.accent ?? 'text-slate-400')} strokeWidth={2} />
                  </div>
                  <span className="font-mono text-3xl font-bold text-white leading-none">{s.val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="animate-slide-up stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h3 className="font-serif text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
            试剂列表
          </h3>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-500 px-3 py-2 bg-slate-100 rounded cursor-pointer hover:bg-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={showSupplementedOnly}
                onChange={(e) => setShowSupplementedOnly(e.target.checked)}
                className="rounded text-accent-500 focus:ring-accent-500/20"
              />
              仅显示有补录记录
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="搜索批次号或试剂名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.map((r, idx) => (
            <ReagentCard
              key={r.id}
              reagent={r}
              calculationCount={calculations.filter((c) => c.reagentId === r.id).length}
              idx={idx}
              onSupplement={() => navigate(`/reagent-ledger/${r.id}/supplement`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded shadow-card p-16 text-center text-sm text-slate-400">
              暂无匹配的试剂记录
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReagentCard({
  reagent,
  calculationCount,
  idx,
  onSupplement,
}: {
  reagent: Reagent;
  calculationCount: number;
  idx: number;
  onSupplement: () => void;
}) {
  const missingTemps = [20, 25, 30].filter(
    (t) => !reagent.temperatureCurves.some((c) => c.temperature === t)
  );
  const hasConflict = reagent.status === 'superseded';

  return (
    <div
      className={cn(
        'bg-white border rounded shadow-card overflow-hidden animate-slide-up transition-all hover:shadow-card-hover',
        hasConflict ? 'border-status-anomaly/30' : 'border-slate-200'
      )}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      {reagent.isSupplemented && (
        <div className="px-5 py-2 bg-accent-500/10 border-b border-accent-500/20 text-xs text-accent-700 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" strokeWidth={2} />
          <span>该批次有 {reagent.supplementHistory.length} 条补录修正记录，系统已自动合并，旧值标注为「已修正」</span>
        </div>
      )}
      {hasConflict && (
        <div className="px-5 py-2 bg-status-anomaly/5 border-b border-status-anomaly/20 text-xs text-status-anomaly flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
          <span>检测到同批次多份记录冲突，已自动合并，当前为最新结论</span>
        </div>
      )}

      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-mono text-lg font-bold text-navy-700">{reagent.batchNo}</span>
            {reagent.isSupplemented && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-accent-500/10 text-accent-600 border border-accent-500/20 rounded">
                <Edit3 className="w-3 h-3" strokeWidth={2} />
                已补录修正
              </span>
            )}
            {missingTemps.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-status-attention/10 text-status-attention border border-status-attention/20 rounded">
                <Thermometer className="w-3 h-3" strokeWidth={2} />
                缺 {missingTemps.map(t => `${t}℃`).join('/')} 曲线
              </span>
            )}
          </div>
          <h3 className="font-serif text-base font-semibold text-slate-800 mb-2">
            {reagent.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
            <div>
              <div className="text-slate-400 mb-0.5">标称浓度</div>
              <div className={cn(
                'font-mono font-semibold text-sm',
                reagent.isSupplemented ? 'text-accent-600' : 'text-slate-700'
              )}>
                {reagent.nominalConcentration} mg/L
                {reagent.isSupplemented && reagent.supplementHistory.find(s => s.fieldName === 'nominalConcentration') && (
                  <span className="text-[10px] text-slate-400 line-through ml-1 font-normal">
                    旧: {reagent.supplementHistory.find(s => s.fieldName === 'nominalConcentration')?.oldValue}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">实测浓度</div>
              <div className="font-mono font-semibold text-sm text-slate-700">
                {reagent.actualConcentration ? `${reagent.actualConcentration} mg/L` : '-'}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">温度曲线</div>
              <div className="font-mono text-sm text-slate-700">
                {reagent.temperatureCurves.map(c => `${c.temperature}℃`).join(' / ')}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">关联试算</div>
              <div className="font-mono text-sm text-slate-700">{calculationCount} 次</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={1.8} />
              {reagent.createdBy} 录入于 {formatShort(reagent.createdAt)}
            </span>
            {reagent.supplier && (
              <span className="truncate max-w-xs">供应商：{reagent.supplier}</span>
            )}
          </div>
        </div>

        <div className="flex lg:flex-col gap-2 shrink-0">
          <button
            onClick={onSupplement}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-navy-700 bg-navy-50 border border-navy-200 rounded hover:bg-navy-100 transition-colors"
          >
            <Edit3 className="w-4 h-4" strokeWidth={1.8} />
            补录 / 修正
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()}`;
}
