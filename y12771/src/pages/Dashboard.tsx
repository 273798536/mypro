import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, ArrowRight, Play, History, Filter, PieChart as PieIcon, BarChart3, AlertTriangle, ArrowUpDown, FileDown } from 'lucide-react';
import { useBatchStore } from '../store/batchStore';
import type { ConcentrationPoint, SpectrumRow, FunctionalGroup } from '../../shared/types';

const PIE_COLORS = ['#1e3a5f', '#458450', '#f59e0b', '#6f87ad', '#d97706', '#9cc5a2', '#293d5c', '#ffbb70'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function SpectrumChart({ data, annotations }: { data: SpectrumRow[]; annotations: FunctionalGroup[] }) {
  const chartData = useMemo(
    () => data.filter((d) => d.wavenumber !== null && d.absorbance !== null).map((d) => ({ wn: d.wavenumber, abs: Number(d.absorbance!.toFixed(4)) })),
    [data]
  );
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
          <XAxis dataKey="wn" type="number" reversed stroke="#6f87ad" fontSize={11} label={{ value: '波数 (cm⁻¹)', position: 'insideBottom', offset: -4, fill: '#4a648c', fontSize: 12 }} />
          <YAxis stroke="#6f87ad" fontSize={11} label={{ value: '吸光度', angle: -90, position: 'insideLeft', fill: '#4a648c', fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #d9e1ee', fontSize: 12 }} labelFormatter={(v) => `波数 ${v} cm⁻¹`} formatter={(v: number) => [v.toFixed(4), '吸光度']} />
          <Line type="monotone" dataKey="abs" stroke="url(#lineGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
          {annotations.slice(0, 8).map((a) => (
            <ReferenceLine key={a.id} x={a.peakWavenumber} stroke={a.confirmed ? '#458450' : '#f59e0b'} strokeDasharray="4 3" strokeWidth={1.2} label={{ value: a.nameCn, position: 'top', fill: a.confirmed ? '#458450' : '#d97706', fontSize: 10 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GroupPie({ annotations }: { annotations: FunctionalGroup[] }) {
  const data = useMemo(() => {
    const groups: Record<string, number> = {};
    annotations.forEach((a) => {
      const cat = a.nameCn.includes('碳氢') ? '碳氢振动' : a.nameCn.includes('羰基') ? '羰基类' : a.nameCn.includes('羟基') || a.nameCn.includes('氨基') ? '氢基类' : a.nameCn.includes('碳氧') ? '碳氧类' : a.nameCn.includes('芳环') ? '芳环类' : '其他';
      groups[cat] = (groups[cat] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [annotations]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonRow({ c }: { c: ConcentrationPoint }) {
  return (
    <div className={`rounded-lg border p-3 transition-all ${c.changed ? 'border-amber-200 bg-amber-50/60' : 'border-ink-100 bg-ink-50/30'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-800">{c.label}</span>
        {c.changed && <span className="chip-amber"><ArrowUpDown size={12} /> 判断有变化</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-md bg-white p-2 text-center">
          <div className="text-lg font-semibold text-ink-800 font-mono">{c.before.value ?? '未检出'}</div>
          <div className="text-[10px] text-ink-500">{c.before.unit}</div>
          <div className="mt-0.5 text-xs text-ink-600">{c.before.judgment}</div>
        </div>
        <ArrowRight size={20} className={c.changed ? 'text-amber-600' : 'text-ink-300'} />
        <div className={`flex-1 rounded-md p-2 text-center ${c.changed ? 'bg-white ring-2 ring-amber-300' : 'bg-white'}`}>
          <div className={`text-lg font-semibold font-mono ${c.changed ? 'text-amber-700' : 'text-ink-800'}`}>{c.after.value ?? '未检出'}</div>
          <div className="text-[10px] text-ink-500">{c.after.unit}</div>
          <div className={`mt-0.5 text-xs ${c.changed ? 'text-amber-700 font-medium' : 'text-ink-600'}`}>{c.after.judgment}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const batch = useBatchStore((s) => s.currentBatch);
  const runAnalysis = useBatchStore((s) => s.runAnalysis);
  const isLoading = useBatchStore((s) => s.isLoading);

  const confirmed = batch.annotations.filter((a) => a.confirmed).length;
  const progress = batch.annotations.length ? (confirmed / batch.annotations.length) * 100 : 0;
  const changedCount = batch.concentrationComparisons.filter((c) => c.changed).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-1.5">Step 2 · 批次报告看板</div>
          <h1 className="font-serif text-3xl font-semibold text-ink-900">{batch.batchName}</h1>
          <div className="mt-1.5 text-sm text-ink-500">
            创建 {formatDate(batch.createdAt)} · 最后更新 {formatDate(batch.updatedAt)} · 所有图表和明细来自同一批数据
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runAnalysis('人工触发重跑 / 当前参数', '当前用户')} disabled={isLoading} className="btn-secondary">
            {isLoading ? <History size={16} className="animate-spin" /> : <Play size={16} />} {isLoading ? '分析中…' : '重复运行分析'}
          </button>
          <button onClick={() => navigate('/annotation')} className="btn-primary">前往官能团标注 →</button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5 card-hover">
          <div className="mb-1 text-xs text-ink-500">数据点数</div>
          <div className="font-serif text-3xl font-semibold text-ink-900">{batch.spectrumData.length}</div>
          <div className="mt-1 text-xs text-ink-500">解析成功 {batch.spectrumData.filter((r) => r.parseStatus !== 'error').length} 个</div>
        </div>
        <div className="card p-5 card-hover">
          <div className="mb-1 text-xs text-ink-500">识别官能团</div>
          <div className="font-serif text-3xl font-semibold text-ink-900">{batch.annotations.length}</div>
          <div className="mt-1 text-xs text-moss-600">已确认 {confirmed} / {batch.annotations.length}</div>
        </div>
        <div className="card p-5 card-hover">
          <div className="mb-1 text-xs text-ink-500">浓度换算变化</div>
          <div className="font-serif text-3xl font-semibold text-amber-600">{changedCount}</div>
          <div className="mt-1 text-xs text-ink-500">共 {batch.concentrationComparisons.length} 项对比</div>
        </div>
        <div className="card p-5 card-hover">
          <div className="mb-1 text-xs text-ink-500">运行历史</div>
          <div className="font-serif text-3xl font-semibold text-ink-900">{batch.runHistory.length}</div>
          <div className="mt-1 text-xs text-ink-500">最近：{formatDate(batch.runHistory[batch.runHistory.length - 1].runAt)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-ink-700" />
              <h2 className="sub-title">红外吸收谱图曲线</h2>
            </div>
            <span className="text-xs text-ink-500">虚线为已识别特征峰位置</span>
          </div>
          <SpectrumChart data={batch.spectrumData} annotations={batch.annotations} />
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <PieIcon size={18} className="text-ink-700" />
            <h2 className="sub-title">官能团类别分布</h2>
          </div>
          <GroupPie annotations={batch.annotations} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-ink-700" />
              <h2 className="sub-title">浓度换算前后对比</h2>
            </div>
            {changedCount > 0 && <span className="chip-amber"><AlertTriangle size={12} /> {changedCount} 项判断发生变化</span>}
          </div>
          <div className="space-y-2">
            {batch.concentrationComparisons.map((c, i) => (
              <ComparisonRow key={i} c={c} />
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <History size={18} className="text-ink-700" />
            <h2 className="sub-title">运行历史</h2>
          </div>
          <div className="space-y-2">
            {[...batch.runHistory].reverse().map((r) => (
              <div key={r.runId} className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-800">#{r.runId} · {r.triggeredBy}</span>
                  <span className={r.status === 'success' ? 'chip-green' : r.status === 'warning' ? 'chip-amber' : 'chip-rose'}>{r.status === 'success' ? '成功' : r.status === 'warning' ? '有告警' : '失败'}</span>
                </div>
                <div className="mt-1 text-xs text-ink-500">{formatDate(r.runAt)} · {r.parameters}</div>
                {r.note && <div className="mt-1 text-xs text-amber-700">备注：{r.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-ink-700" />
            <h2 className="sub-title">明细数据（与图表同源）</h2>
          </div>
          <button onClick={() => navigate('/export')} className="btn-ghost"><FileDown size={16} /> 导出明细</button>
        </div>
        <div className="max-h-80 overflow-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-ink-50/95 backdrop-blur">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">波数 (cm⁻¹)</th>
                <th className="table-th">吸光度</th>
                <th className="table-th">单位</th>
                <th className="table-th">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {batch.spectrumData.slice(0, 50).map((r) => (
                <tr key={r.rowIndex} className={r.parseStatus === 'supplemented' ? 'bg-amber-50/40' : r.parseStatus === 'missing' ? 'bg-rose-50/40' : 'hover:bg-ink-50/50'}>
                  <td className="table-td font-mono text-xs">{r.rowIndex + 1}</td>
                  <td className="table-td font-mono">{r.wavenumber}</td>
                  <td className="table-td font-mono">{r.absorbance?.toFixed(4)}</td>
                  <td className="table-td">{r.rawUnit || '-'}</td>
                  <td className="table-td text-xs text-ink-600">{r.remark || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
        <span className="font-medium text-ink-700">标注进度：</span>
        <span className="mx-1">{confirmed} / {batch.annotations.length} 条已确认</span>
        <span className="mx-2">·</span>
        <div className="inline-block h-2 w-48 align-middle overflow-hidden rounded-full bg-ink-200">
          <div className="h-full rounded-full bg-gradient-to-r from-moss-400 to-moss-600" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={() => navigate('/annotation')} className="ml-3 font-medium text-ink-800 underline hover:text-ink-900">去标注确认 →</button>
      </div>
    </div>
  );
}
