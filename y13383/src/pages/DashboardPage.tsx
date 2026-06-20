import { CheckCircle2, Clock, Scale, AlertOctagon, ChevronRight, ListChecks, TrendingUp, Activity } from 'lucide-react';
import { CURRENT_BATCH, ACCURACY_TREND } from '@/data/mockData';
import { countByStatus } from '@/utils/statusCalc';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function DashboardPage() {
  const nav = useNavigate();
  const { setStatusFilter, setActiveView, activeView } = useAppStore();
  const { processed, pending, manual, pollution } = countByStatus(CURRENT_BATCH.samples);
  const total = CURRENT_BATCH.samples.length;
  const batch = CURRENT_BATCH;

  const cards = [
    {
      key: 'processed', label: '已处理', sub: '口径对齐 · 已归档',
      count: processed, total, color: 'emerald', Icon: CheckCircle2,
      grad: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      ring: 'ring-emerald-400/40',
      text: 'text-emerald-300',
      onClick: () => { setStatusFilter('processed'); nav('/queue'); },
    },
    {
      key: 'pending', label: '待补材料', sub: '业务方归档中',
      count: pending, total: pending + 1, color: 'amber', Icon: Clock,
      grad: 'from-amber-500/20 via-amber-500/5 to-transparent',
      ring: 'ring-amber-400/40',
      text: 'text-amber-300',
      onClick: () => { setStatusFilter('pending_material'); nav('/queue'); },
    },
    {
      key: 'manual', label: '人工改判', sub: '边界样本 · 标注争议',
      count: manual, total, color: 'violet', Icon: Scale,
      grad: 'from-violet-500/20 via-violet-500/5 to-transparent',
      ring: 'ring-violet-400/40',
      text: 'text-violet-300',
      onClick: () => { setStatusFilter('manual_review'); nav('/queue'); },
    },
    {
      key: 'pollution', label: '验证集污染', sub: '不纳入通过率统计',
      count: pollution, total, color: 'rose', Icon: AlertOctagon,
      grad: 'from-rose-500/15 via-rose-500/5 to-transparent pollution-stripe',
      ring: 'ring-rose-400/50',
      text: 'text-rose-300',
      onClick: () => { setStatusFilter('all'); nav('/queue'); },
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <section className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Compression Batch · {batch.version}</div>
          <h1 className="serif text-3xl md:text-4xl font-semibold text-slate-100 mt-1">交付摘要</h1>
          <p className="mt-2 text-[13px] text-slate-400 serif italic">{batch.name} · 共 {total} 条样本</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900/60 p-1.5">
            <button onClick={() => setActiveView('teacher')}
              className={`px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2
                ${activeView === 'teacher' ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}>
              <ListChecks size={13} /> 现场老师视图
            </button>
            <button onClick={() => nav('/handover')}
              className={`px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2
                ${activeView === 'engineer' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}>
              <ChevronRight size={13} /> 前往工程师交接
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map(c => (
          <button key={c.key} onClick={c.onClick}
            className={`group relative overflow-hidden text-left rounded-2xl border border-ink-800 bg-gradient-to-br ${c.grad} p-6
              hover:ring-2 hover:${c.ring} transition-all hover:-translate-y-0.5 duration-200`}>
            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition">
              <c.Icon size={72} strokeWidth={1} />
            </div>
            <div className={`w-11 h-11 rounded-xl grid place-items-center bg-white/5 border border-white/10 ${c.text}`}>
              <c.Icon size={20} />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <div className="serif text-5xl font-bold text-slate-50 leading-none">{c.count}</div>
              <div className="text-slate-500 text-sm">/ {c.total}</div>
            </div>
            <div className="mt-3">
              <div className="serif text-lg font-medium text-slate-100">{c.label}</div>
              <div className="text-[11.5px] text-slate-400 mt-0.5">{c.sub}</div>
            </div>
            <div className="mt-5 h-1 rounded-full bg-ink-800/70 overflow-hidden">
              <div className={`h-full rounded-full bg-current ${c.text}`}
                style={{ width: `${Math.min(100, (c.count / c.total) * 100)}%`, opacity: 0.7 }} />
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500">
                <TrendingUp size={12} /> 离线 / 线上 双口径通过率趋势
              </div>
              <h2 className="serif text-xl text-slate-100 mt-1">近 5 个压缩版本</h2>
            </div>
            <div className="flex items-center gap-4 text-[12px]">
              <LegendItem color="#8B5CF6" label="离线（虚线）" dashed />
              <LegendItem color="#10B981" label="线上（实线）" />
              <LegendItem color="#EC4899" label="口径差异点" dot pulse />
            </div>
          </div>
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACCURACY_TREND} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="version" stroke="#64748B" fontSize={11} fontFamily="Geist Mono" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} fontFamily="Geist Mono" domain={[82, 95]} tickLine={false} axisLine={false} tickFormatter={(v) => v + '%'} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#CBD5E1', fontFamily: 'Newsreader', marginBottom: 6 }}
                  formatter={(v: number, n: string) => [`${v}%`, n]}
                />
                <Line type="monotone" dataKey="offline" name="离线通过率" stroke="#8B5CF6" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 5, fill: '#8B5CF6', stroke: '#0F172A', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="online" name="线上通过率" stroke="#10B981" strokeWidth={2.5} dot={{ r: 5, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11.5px] text-slate-400 border-t border-ink-800 pt-3">
            <Activity size={13} className="text-rose-400" />
            <span>
              当前版本 v1.3 离线 <b className="text-violet-300">{batch.overallMetrics.offlineAccuracy}%</b> vs 线上{' '}
              <b className="text-emerald-300">{batch.overallMetrics.onlineAccuracy}%</b>，差值{' '}
              <b className="text-rose-300">{(batch.overallMetrics.offlineAccuracy - batch.overallMetrics.onlineAccuracy).toFixed(1)}pp</b>
              {' '}— 已在失败队列 s001/s003 中标注口径差异说明。
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-6 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
            <ListChecks size={12} /> 交接要点速览
          </div>
          <h2 className="serif text-xl text-slate-100 mb-5">给现场老师的说明</h2>
          <ul className="space-y-3 text-[13px] flex-1">
            <li className="flex gap-3"><CheckDot color="#10B981" /><span>全部 8 条失败样本已完成分类，无遗漏记录</span></li>
            <li className="flex gap-3"><CheckDot color="#10B981" /><span>s001、s003 存在离线/线上口径差异，点击任意分数可查看差异说明</span></li>
            <li className="flex gap-3"><CheckDot color="#F59E0B" /><span>s005 为边界样本（score差0.004），已提交三人复核组</span></li>
            <li className="flex gap-3"><CheckDot color="#EC4899" /><span>s006 为验证集污染，<b>未计入通过率</b>，已反馈数据侧清洗</span></li>
            <li className="flex gap-3"><CheckDot color="#8B5CF6" /><span>灰度结果已拆为 3 项因素，见「灰度拆解」页面</span></li>
          </ul>
          <button onClick={() => nav('/handover')}
            className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/30 transition flex items-center justify-center gap-2">
            <ChevronRight size={15} /> 进入工程师交接视图
          </button>
        </div>
      </section>
    </div>
  );
}

function LegendItem({ color, label, dashed, dot, pulse }: { color: string; label: string; dashed?: boolean; dot?: boolean; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-300">
      {dot ? (
        <span className={`w-2.5 h-2.5 rounded-full ${pulse ? 'animate-pulse-dot' : ''}`} style={{ background: color }} />
      ) : (
        <span className={`w-5 h-0.5 rounded ${dashed ? 'border-t-2 border-dashed' : ''}`} style={{ background: dashed ? 'transparent' : color, borderColor: dashed ? color : 'transparent' }} />
      )}
      <span>{label}</span>
    </div>
  );
}

function CheckDot({ color }: { color: string }) {
  return <span className="w-5 h-5 mt-0.5 shrink-0 rounded-full grid place-items-center" style={{ background: color + '22', border: `1px solid ${color}66` }}>
    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
  </span>;
}
