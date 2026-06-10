import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Dna,
  Upload,
  BookOpen,
  Info,
  FileCheck,
  Search,
  Microscope,
  FlaskConical,
  ArrowRightLeft,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { SequencingRun } from '@/types';
import { cn, formatDateTime } from '@/utils';

export default function SequencingPage() {
  const store = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const runs = store.sequencingRuns;

  const filteredRuns = useMemo(() => {
    if (!search) return runs;
    const q = search.toLowerCase();
    return runs.filter(
      (r) =>
        r.sampleId.toLowerCase().includes(q) ||
        r.geneLocus.toLowerCase().includes(q) ||
        r.matchedSpecies.toLowerCase().includes(q) ||
        r.batchNo.toLowerCase().includes(q)
    );
  }, [runs, search]);

  useEffect(() => {
    if (!selectedId && filteredRuns.length > 0) {
      setSelectedId(filteredRuns[0].id);
    }
  }, [filteredRuns, selectedId]);

  const selectedRun: SequencingRun | undefined = useMemo(
    () => filteredRuns.find((r) => r.id === selectedId),
    [filteredRuns, selectedId]
  );

  const chartData = useMemo(
    () =>
      filteredRuns.map((r) => ({
        id: r.id,
        sampleId: r.sampleId.slice(-7),
        geneLocus: r.geneLocus.split(' ')[0].slice(0, 10),
        depth: r.sequencingDepth,
        quality: r.qualityScore,
        gc: r.gcContent,
        fullGene: r.geneLocus,
      })),
    [filteredRuns]
  );

  const radarData = useMemo(() => {
    if (!selectedRun) return [];
    const maxDepth = Math.max(...filteredRuns.map((r) => r.sequencingDepth), 1);
    const maxQ = Math.max(...filteredRuns.map((r) => r.qualityScore), 1);
    return [
      { subject: '测序深度', A: Math.round((selectedRun.sequencingDepth / maxDepth) * 100), fullMark: 100 },
      { subject: '质量值Q', A: Math.round((selectedRun.qualityScore / maxQ) * 100), fullMark: 100 },
      { subject: 'GC含量合理性', A: Math.round(100 - Math.abs(selectedRun.gcContent - 48) * 3), fullMark: 100 },
      { subject: '物种匹配度', A: selectedRun.matchedSpecies.includes(' ') ? 98 : 88, fullMark: 100 },
      { subject: '说明完整度', A: Math.min(100, selectedRun.description.length / 3), fullMark: 100 },
    ];
  }, [selectedRun, filteredRuns]);

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const id = payload.id;
      setSelectedId(id);
      requestAnimationFrame(() => {
        const el = rowRefs.current[id];
        if (el && tableRef.current) {
          const tableRect = tableRef.current.getBoundingClientRect();
          const rowRect = el.getBoundingClientRect();
          tableRef.current.scrollTop += rowRect.top - tableRect.top - 60;
        }
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">测序结果 / 整理归档</div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
            🧬 测序结果整理工作台
            <span className="ml-3 px-2 py-0.5 rounded bg-deep-ocean/10 text-deep-ocean text-xs font-normal border border-deep-ocean/20">
              图 · 表 · 文 三者联动
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            点击表格行、图表柱均可联动定位；文字说明实时同步对应样本
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索样本/基因/批次"
              className="pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean focus:ring-2 focus:ring-deep-ocean/10 w-56"
            />
          </div>
          <button className="btn-primary text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            导入新测序文件
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-deep-ocean/5 border border-deep-ocean/15 text-deep-ocean">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          提示：点击图表柱可定位表格行，点击表格行可切换图表高亮和说明
        </div>
      </div>

      <div className="grid grid-cols-[560px_1fr] gap-5">
        <div
          ref={tableRef}
          className="card !p-0 overflow-hidden flex flex-col max-h-[calc(100vh-180px)]"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn">
              <FileCheck className="w-4 h-4 text-deep-ocean" />
              测序结果明细
              <span className="font-normal text-xs text-slate-400">
                共 {filteredRuns.length} 条
              </span>
            </div>
          </div>
          <div className="overflow-y-auto scrollbar-thin flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="table-header text-left">
                  <th className="px-3 py-2.5 font-semibold">样本</th>
                  <th className="px-3 py-2.5 font-semibold">基因位点</th>
                  <th className="px-3 py-2.5 font-semibold text-right">深度</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Q值</th>
                  <th className="px-3 py-2.5 font-semibold text-right">GC%</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((r) => {
                  const active = selectedId === r.id;
                  return (
                    <tr
                      key={r.id}
                      ref={(el) => (rowRefs.current[r.id] = el)}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'border-t border-slate-100 transition-all cursor-pointer',
                        active
                          ? 'bg-deep-ocean/10 border-l-4 border-l-deep-ocean shadow-inner'
                          : 'hover:bg-deep-ocean/[0.04]'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-mono-data font-semibold text-[12px] text-slate-800">
                          {r.sampleId.slice(-11)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-data">
                          {r.batchNo.slice(-6)} · {r.importOperator}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] text-slate-700 font-medium line-clamp-2 leading-snug">
                          {r.geneLocus}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-data text-[12px]">
                        <span className={cn(
                          r.sequencingDepth >= 40 ? 'text-tundra-green-dark' :
                          r.sequencingDepth >= 30 ? 'text-deep-ocean' : 'text-amber-warning'
                        )}>
                          {r.sequencingDepth}×
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-data text-[12px]">
                        <span className={cn(
                          r.qualityScore >= 38 ? 'text-tundra-green-dark' :
                          r.qualityScore >= 30 ? 'text-deep-ocean' : 'text-amber-warning'
                        )}>
                          Q{r.qualityScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-data text-[12px] text-slate-600">
                        {r.gcContent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 font-serif-cn flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-tundra-green-dark" />
                质量分布图
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {selectedRun ? `当前选中: ${selectedRun.id}` : ''}
                </span>
              </h3>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                点击柱状图可定位表格
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/60 rounded-lg p-3 border border-slate-100">
                <div className="text-xs text-slate-500 mb-2 font-semibold flex items-center gap-1">
                  <Dna className="w-3 h-3" />
                  测序深度直方图 (× coverage)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 10, left: -10, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="sampleId" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-25} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(30,58,95,0.05)' }}
                      contentStyle={{ borderRadius: 6, fontSize: 11, border: '1px solid #e2e8f0' }}
                      formatter={(v: any, n, props) => [`${v}×`, n]}
                      labelFormatter={(l) => `样本: ${l}`}
                    />
                    <ReferenceLine y={30} stroke="#e07b39" strokeDasharray="5 3" label={{ value: '阈值线', fontSize: 9, fill: '#e07b39' }} />
                    <Bar dataKey="depth" radius={[4, 4, 0, 0]} barSize={22}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.id === selectedId ? '#1e3a5f' : entry.depth >= 40 ? '#3d8b6b' : entry.depth >= 30 ? '#52a884' : '#e07b39'}
                          opacity={selectedId && entry.id !== selectedId ? 0.45 : 1}
                          stroke={entry.id === selectedId ? '#152a45' : 'none'}
                          strokeWidth={entry.id === selectedId ? 2 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50/60 rounded-lg p-3 border border-slate-100">
                <div className="text-xs text-slate-500 mb-2 font-semibold flex items-center gap-1">
                  <Microscope className="w-3 h-3" />
                  GC含量 & 质量值 (双轴折线)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 10, left: -10, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="sampleId" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-25} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[20, 60]} />
                    <Tooltip
                      cursor={{ stroke: '#1e3a5f', strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: 6, fontSize: 11, border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                    <Line
                      type="monotone"
                      dataKey="gc"
                      name="GC%"
                      stroke="#1e3a5f"
                      strokeWidth={2}
                      dot={(props: any) => (
                        <Cell
                          r={props.payload.id === selectedId ? 6 : 3.5}
                          fill={props.payload.id === selectedId ? '#1e3a5f' : '#1e3a5f'}
                          stroke="white"
                          strokeWidth={props.payload.id === selectedId ? 2 : 1}
                        />
                      )}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="quality"
                      name="Q值"
                      stroke="#3d8b6b"
                      strokeWidth={2}
                      dot={(props: any) => (
                        <Cell
                          r={props.payload.id === selectedId ? 6 : 3.5}
                          fill={props.payload.id === selectedId ? '#3d8b6b' : '#3d8b6b'}
                          stroke="white"
                          strokeWidth={props.payload.id === selectedId ? 2 : 1}
                        />
                      )}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <h3 className="font-bold text-slate-800 font-serif-cn flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-deep-ocean" />
                综合质量雷达图
                {selectedRun && (
                  <span className="text-[10px] font-normal text-slate-400 font-mono-data ml-1">
                    {selectedRun.id}
                  </span>
                )}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0, 100]} />
                  <Radar
                    name="质量评分"
                    dataKey="A"
                    stroke="#1e3a5f"
                    fill="#3d8b6b"
                    fillOpacity={0.45}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 11, border: '1px solid #e2e8f0' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="card flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 font-serif-cn flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-tundra-green-dark" />
                  实验分析说明
                </h3>
                {selectedRun && (
                  <span className="text-[10px] text-slate-400 font-mono-data">
                    与表格、图表联动同步
                  </span>
                )}
              </div>
              {!selectedRun ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  请选择表格行或点击图表以查看说明
                </div>
              ) : (
                <div className="text-[12.5px] text-slate-700 space-y-3 overflow-y-auto scrollbar-thin flex-1 pr-1">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 mb-0.5">样本编号</div>
                      <div className="font-mono-data font-semibold text-deep-ocean">{selectedRun.sampleId}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 mb-0.5">测序批次</div>
                      <div className="font-mono-data font-semibold text-slate-700">{selectedRun.batchNo}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 mb-0.5">数据MD5</div>
                      <div className="font-mono-data text-[10px] text-slate-600 break-all">{selectedRun.dataMd5}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 mb-0.5">导入时间 / 操作人</div>
                      <div className="text-[11px] text-slate-700">
                        {formatDateTime(selectedRun.importTime)}
                        <div className="font-medium mt-0.5">{selectedRun.importOperator}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      匹配物种 / 基因型分析
                    </div>
                    <div className="p-3 rounded bg-gradient-to-r from-deep-ocean/[0.04] to-transparent border-l-2 border-deep-ocean">
                      <div className="font-mono-data text-deep-ocean font-semibold text-xs mb-1.5">
                        检测位点: {selectedRun.geneLocus}
                      </div>
                      <div className="text-[12px] leading-relaxed text-slate-700">
                        {selectedRun.description}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>测序深度</span>
                      <span className={cn('font-mono-data font-semibold',
                        selectedRun.sequencingDepth >= 40 ? 'text-tundra-green-dark' :
                        selectedRun.sequencingDepth >= 30 ? 'text-deep-ocean' : 'text-amber-warning'
                      )}>
                        {selectedRun.sequencingDepth}× {selectedRun.sequencingDepth >= 40 ? '(优)' : selectedRun.sequencingDepth >= 30 ? '(良)' : '(临界)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>质量值</span>
                      <span className={cn('font-mono-data font-semibold',
                        selectedRun.qualityScore >= 38 ? 'text-tundra-green-dark' :
                        selectedRun.qualityScore >= 30 ? 'text-deep-ocean' : 'text-amber-warning'
                      )}>
                        Q{selectedRun.qualityScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>GC含量</span>
                      <span className="font-mono-data font-semibold text-slate-700">{selectedRun.gcContent}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>匹配物种</span>
                      <span className="font-semibold text-tundra-green-dark italic">
                        {selectedRun.matchedSpecies}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
