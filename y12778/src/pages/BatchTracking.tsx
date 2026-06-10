import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ChevronRight, Package, Clock, FlaskConical, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { BatchStatusBadge } from '../components/ErrorAlert';
import { cn } from '../lib/utils';
import type { BatchInfo, Calculation } from '../../shared/types';

export function BatchTrackingPage() {
  const navigate = useNavigate();
  const { batches, fetchBatches, fetchCalculations, calculations, currentBatch, fetchBatchDetail, loading } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchCalculations();
  }, [fetchBatches, fetchCalculations]);

  useEffect(() => {
    if (batches.length > 0 && !selected) {
      const firstAnomaly = batches.find((b) => b.status === 'anomaly');
      setSelected(firstAnomaly?.batchNo ?? batches[0].batchNo);
    }
  }, [batches, selected]);

  useEffect(() => {
    if (selected) fetchBatchDetail(selected);
  }, [selected, fetchBatchDetail]);

  const filtered = batches.filter((b) =>
    search ? b.batchNo.toLowerCase().includes(search.toLowerCase()) : true
  );
  const batchCalcs = calculations.filter((c) => c.reagentBatchNo === selected);
  const display = currentBatch;

  return (
    <div className="space-y-6">
      <section className="animate-slide-up stagger-1">
        <div className="bg-slate-900 rounded shadow-card overflow-hidden">
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-slate-400" strokeWidth={1.8} />
              <h2 className="text-slate-400 text-xs font-medium uppercase tracking-[0.15em]">
                批次追踪 · 月底/课前入口
              </h2>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">
              试剂批次全生命周期追踪
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              按批次聚合查看所有录入、补录、试算与复核操作，核查变更是否可解释
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-slate-800">
            {[
              { label: '总批次', val: batches.length, sub: '覆盖试剂' },
              { label: '异常批次', val: batches.filter(b => b.status === 'anomaly').length, sub: '需重点核查', accent: 'text-status-anomaly' },
              { label: '关注批次', val: batches.filter(b => b.status === 'attention').length, sub: '提醒关注', accent: 'text-status-attention' },
            ].map((s, i) => (
              <div key={s.label} className="bg-slate-900 px-6 py-4 animate-slide-up" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
                <div className="text-slate-500 text-xs">{s.label}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn('font-mono text-3xl font-bold text-white leading-none', s.accent)}>
                    {s.val}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 animate-slide-up stagger-2">
          <div className="bg-white border border-slate-200 rounded shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="text"
                  placeholder="搜索批次号..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                />
              </div>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filtered.map((b, idx) => (
                <li
                  key={b.batchNo}
                  className={cn(
                    'p-4 cursor-pointer transition-colors animate-slide-up',
                    selected === b.batchNo
                      ? 'bg-navy-50 border-l-4 border-navy-600'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => setSelected(b.batchNo)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'font-mono text-sm font-bold',
                          selected === b.batchNo ? 'text-navy-700' : 'text-slate-800'
                        )}>
                          {b.batchNo}
                        </span>
                        <BatchStatusBadge status={b.status} />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5">
                          <Package className="w-3 h-3" strokeWidth={1.8} />
                          {b.reagentCount} 试剂
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <FlaskConical className="w-3 h-3" strokeWidth={1.8} />
                          {b.calculationCount} 试算
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" strokeWidth={1.8} />
                        最近 {formatDate(b.latestActivityAt)}
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 shrink-0 mt-1 transition-transform',
                      selected === b.batchNo ? 'text-navy-600 translate-x-0.5' : 'text-slate-300'
                    )} strokeWidth={2} />
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-12 text-center text-sm text-slate-400">无匹配批次</li>
              )}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6 animate-slide-up stagger-3">
          {loading && !display ? (
            <div className="bg-white border border-slate-200 rounded shadow-card p-12 text-center text-slate-400">
              加载中...
            </div>
          ) : display ? (
            <>
              <BatchHeader batch={display} />
              <BatchCalculations calcs={batchCalcs} onOpenCalc={(id) => navigate(`/calculation/${id}`)} />
              <BatchTimeline batch={display} onOpenCalc={(id) => navigate(`/calculation/${id}`)} />
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded shadow-card p-12 text-center text-slate-400">
              请从左侧选择批次
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BatchHeader({ batch }: { batch: BatchInfo }) {
  return (
    <div className="bg-white border border-slate-200 rounded shadow-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-serif text-2xl font-bold text-slate-800 font-mono">{batch.batchNo}</h2>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-slate-500">
            共 {batch.reagentCount} 条试剂记录，{batch.calculationCount} 次浓度试算
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500 mb-1">最近活动时间</div>
          <div className="font-mono text-sm text-slate-700">{formatDate(batch.latestActivityAt)}</div>
        </div>
      </div>
    </div>
  );
}

function BatchCalculations({ calcs, onOpenCalc }: { calcs: Calculation[]; onOpenCalc: (id: string) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-slate-800 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
          关联试算记录（{calcs.length}）
        </h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {calcs.map((c, idx) => {
          const devColor = Math.abs(c.deviation) <= 10 ? 'text-status-passed' : Math.abs(c.deviation) <= 20 ? 'text-status-attention' : 'text-status-anomaly';
          return (
            <li
              key={c.id}
              className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 animate-slide-up"
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => onOpenCalc(c.id)}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className="font-mono text-xs text-slate-400 shrink-0 w-20">{formatTime(c.createdAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-700 truncate">{c.explanation.summary}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-800 leading-none">{c.calculatedConcentration.toFixed(1)}</div>
                  <div className={cn('text-[10px] font-mono mt-0.5', devColor)}>
                    {c.deviation > 0 ? '+' : ''}{c.deviation.toFixed(1)}%
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={2} />
              </div>
            </li>
          );
        })}
        {calcs.length === 0 && (
          <li className="p-12 text-center text-sm text-slate-400">暂无试算记录</li>
        )}
      </ul>
    </div>
  );
}

function BatchTimeline({ batch, onOpenCalc }: { batch: BatchInfo; onOpenCalc: (id: string) => void }) {
  const timeline = batch.timeline;
  return (
    <div className="bg-white border border-slate-200 rounded shadow-card p-6">
      <h3 className="font-serif text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
        <Clock className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
        批次时间线（全链路操作记录）
      </h3>
      <ol className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
        {timeline.map((t, idx) => {
          const color =
            t.type === 'supplement' ? 'bg-accent-500' :
            t.type === 'audit' ? 'bg-slate-500' :
            t.type === 'result' ? 'bg-navy-600' :
            'bg-slate-400';
          return (
            <li key={t.id} className="relative pl-12 pb-5 last:pb-0 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className={`absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ${color} text-white text-xs font-semibold shadow-sm`}>
                {t.type[0].toUpperCase()}
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn(
                    'text-[10px] font-medium uppercase px-1.5 py-0.5 rounded tracking-wider',
                    t.type === 'supplement' ? 'bg-accent-500/10 text-accent-600' :
                    t.type === 'audit' ? 'bg-slate-200 text-slate-600' :
                    t.type === 'result' ? 'bg-navy-600/10 text-navy-700' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {typeLabel(t.type)}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(t.timestamp)}</span>
                  {t.operator && <span className="text-[11px] text-slate-500">· {t.operator}</span>}
                </div>
                <div className="font-medium text-sm text-slate-800 mb-0.5">{t.title}</div>
                <div className="text-xs text-slate-600">{t.description}</div>
                {t.type === 'calculation' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const id = t.id.replace(/^bt_calc_/, '');
                      onOpenCalc(id);
                    }}
                    className="mt-2 text-[11px] text-navy-600 hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    查看试算详情 →
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {timeline.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">暂无时间线记录</div>
        )}
      </ol>
    </div>
  );
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    result: '结果', calculation: '试算', 'raw-data': '原始数据', 'reagent-entry': '录入', supplement: '补录', audit: '审计',
  };
  return map[type] ?? type;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }
