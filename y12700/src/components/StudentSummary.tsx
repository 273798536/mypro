import { CheckCircle2, Clock, AlertTriangle, GraduationCap, FileText, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { AVAILABILITY_META } from '@/utils/diagnosis';
import AvailabilityBadge from './AvailabilityBadge';
import { DEGRADATION_LABEL } from '@/utils/math/rank';
import { Link } from 'react-router-dom';

export default function StudentSummary() {
  const matrix = useStore(s => s.currentMatrix);
  const rankResult = useStore(s => s.rankResult);
  const rowAvailability = useStore(s => s.rowAvailability);

  if (!matrix) return null;

  const groups = {
    available: rowAvailability.filter(r => r.availability === 'available'),
    pending: rowAvailability.filter(r => r.availability === 'pending'),
    recollect: rowAvailability.filter(r => r.availability === 'recollect'),
  };

  const counts = {
    available: groups.available.length,
    pending: groups.pending.length,
    recollect: groups.recollect.length,
    total: rowAvailability.length,
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-ink-800 via-ink-700 to-ink-800 text-white p-6 relative">
          <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-gold-400" />
                <span className="text-[12px] uppercase tracking-wider text-gold-400 font-semibold">
                  学生视图 · 结果摘要
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold">{matrix.title}</h2>
              {rankResult && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="bg-white/10 backdrop-blur px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-gold-400 text-[11px] uppercase tracking-wider">矩阵秩</span>
                    <span className="ml-2 font-mono text-xl font-bold">{rankResult.rank} / {rankResult.maxRank}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-gold-400 text-[11px] uppercase tracking-wider">退化程度</span>
                    <span className="ml-2 font-medium">{DEGRADATION_LABEL[rankResult.degradationLevel]}</span>
                  </div>
                </div>
              )}
            </div>
            <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              返回投研助理视图
            </Link>
          </div>
        </div>

        <div className="p-5 grid grid-cols-3 gap-3">
          {(['available', 'pending', 'recollect'] as const).map(k => {
            const meta = AVAILABILITY_META[k];
            const Icon = k === 'available' ? CheckCircle2 : k === 'pending' ? Clock : AlertTriangle;
            return (
              <div
                key={k}
                className={`rounded-xl p-4 border ${meta.border} ${meta.bg} relative overflow-hidden`}
              >
                <div className={`absolute -right-2 -top-2 w-14 h-14 rounded-full ${meta.dot} opacity-10`} />
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`font-serif text-3xl font-bold ${meta.color}`}>{counts[k]}</span>
                  <span className="text-xs text-ink-400">/ {counts.total} 行</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink-600" />
            <h3 className="font-serif text-ink-800 font-semibold">按可用性分组</h3>
          </div>
          <span className="label">可直接引用绿色行；黄色请先找投研助理复核；红色数据暂不可用</span>
        </div>
        <div className="divider-gold mb-4" />

        <div className="space-y-4">
          {groups.available.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-500" />
                <span className="text-sm font-semibold text-forest-700">
                  🟢 可直接使用（{groups.available.length}）
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {groups.available.map(r => (
                  <div key={r.rowIndex} className="p-3 rounded-lg bg-forest-50/60 border border-forest-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AvailabilityBadge availability={r.availability} size="sm" />
                      <span className="font-mono text-ink-500 text-xs">
                        原始行号 {matrix.cells[r.rowIndex]?.[0]?.sourceRow ?? r.rowIndex + 1}
                      </span>
                    </div>
                    <div className="text-ink-600 text-[12.5px]">{r.reason}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {groups.pending.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  🟡 需投研复核（{groups.pending.length}）
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {groups.pending.map(r => (
                  <div key={r.rowIndex} className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AvailabilityBadge availability={r.availability} size="sm" />
                      <span className="font-mono text-ink-500 text-xs">
                        原始行号 {matrix.cells[r.rowIndex]?.[0]?.sourceRow ?? r.rowIndex + 1}
                      </span>
                    </div>
                    <div className="text-ink-600 text-[12.5px]">{r.reason}</div>
                    <div className="mt-1 text-[11.5px] text-amber-700">
                      → 请联系投研助理补充材料或确认口径后再引用
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {groups.recollect.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-sm font-semibold text-rose-700">
                  🔴 需重新采集（{groups.recollect.length}）
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {groups.recollect.map(r => (
                  <div key={r.rowIndex} className="p-3 rounded-lg bg-rose-50/60 border border-rose-100 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <AvailabilityBadge availability={r.availability} size="sm" />
                      <span className="font-mono text-ink-500 text-xs">
                        原始行号 {matrix.cells[r.rowIndex]?.[0]?.sourceRow ?? r.rowIndex + 1}
                      </span>
                    </div>
                    <div className="text-ink-600 text-[12.5px]">{r.reason}</div>
                    <div className="mt-1 text-[11.5px] text-rose-700">
                      → 该行数据不可用于当前结论，需重采后再分析
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
