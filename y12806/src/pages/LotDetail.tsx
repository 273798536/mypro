import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  Calendar,
  MapPin,
  AlertTriangle,
  PlayCircle,
  Download,
  ArrowLeftRight,
  FilePlus2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { Band, AnalysisRun, Sample } from '../../shared/types';

const CATEGORY_FILTERS: Array<{ key: string; label: string; classes: string }> = [
  { key: 'target', label: '目标', classes: 'bg-lab-700/10 text-lab-700 border-lab-700/30' },
  { key: 'nonspecific', label: '杂带', classes: 'bg-lab-warn/10 text-lab-warn border-lab-warn/30' },
  { key: 'smear', label: '拖尾', classes: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'missing', label: '缺失', classes: 'bg-lab-danger/10 text-lab-danger border-lab-danger/30' },
];

const LABEL_NAMES: Record<string, string> = {
  target: '目标条带',
  nonspecific: '杂带',
  smear: '拖尾',
  missing: '缺失',
};

function getQualityCellClass(score: number): string {
  if (score < 50) return 'bg-lab-danger/15 text-lab-danger font-semibold';
  if (score <= 75) return 'bg-lab-warn/15 text-lab-warn font-semibold';
  return 'bg-lab-confirm/15 text-lab-confirm font-semibold';
}

function getConfirmStatusClass(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-lab-confirm/10 text-lab-confirm';
    case 'rejected':
      return 'bg-lab-danger/10 text-lab-danger';
    default:
      return 'bg-lab-warn/10 text-lab-warn';
  }
}

function getConfirmStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return '已确认';
    case 'rejected':
      return '已驳回';
    default:
      return '待确认';
  }
}

export default function LotDetail() {
  const navigate = useNavigate();
  const { lotId } = useParams<{ lotId: string }>();
  const {
    lots,
    samples,
    bands,
    analysisRuns,
    samplingSites,
    fetchAllData,
    filters,
    updateFilters,
    supplementBand,
    confirmBand,
    triggerDiffRun,
    exportData,
  } = useWorkbenchStore();

  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (lots.length === 0) {
      fetchAllData();
    }
  }, [lots.length, fetchAllData]);

  const lot = lots.find((l) => l.id === lotId);
  const lotSamples = samples.filter((s) => s.lot_id === lotId);
  const lotSampleIds = lotSamples.map((s) => s.id);
  const allLotBands = bands.filter((b) => lotSampleIds.includes(b.sample_id));
  const lotRuns = analysisRuns
    .filter((r) => r.lot_id === lotId)
    .sort((a, b) => b.run_index - a.run_index);

  const nextLot = lots.find((l, idx) => {
    const currIdx = lots.findIndex((x) => x.id === lotId);
    return idx === currIdx + 1 || (currIdx === lots.length - 1 && idx === 0);
  });

  const stats = useMemo(() => {
    const pendingCount = allLotBands.filter((b) => b.confirm_status === 'pending').length;
    const abnormalCount = lotSamples.filter((s) => s.is_abnormal === true).length;
    return {
      sampleCount: lotSamples.length,
      bandCount: allLotBands.length,
      pendingCount,
      abnormalCount,
    };
  }, [lotSamples, allLotBands]);

  const filteredBands = useMemo(() => {
    let result = selectedRunId
      ? allLotBands.filter((b) => b.run_id === selectedRunId)
      : allLotBands;

    if (filters.labelCategory.length > 0) {
      result = result.filter((b) => filters.labelCategory.includes(b.label_category));
    }
    if (filters.qualityMin > 0) {
      result = result.filter((b) => b.quality_score >= filters.qualityMin);
    }
    return result;
  }, [allLotBands, selectedRunId, filters.labelCategory, filters.qualityMin]);

  const samplingSiteNames = useMemo(() => {
    const siteIds = [...new Set(lotSamples.map((s) => s.sampling_site_id))];
    return siteIds
      .map((id) => samplingSites.find((s) => s.id === id))
      .filter(Boolean) as Array<{ id: string; name: string }>;
  }, [lotSamples, samplingSites]);

  const micrographSamples = useMemo(() => lotSamples.slice(0, 4), [lotSamples]);

  const diffChartData = useMemo(() => {
    if (lotRuns.length < 2) return [];

    const currentRun = lotRuns[0];
    const prevRun = lotRuns[1];

    const currentBands = allLotBands.filter((b) => b.run_id === currentRun.id);
    const prevBands = allLotBands.filter((b) => b.run_id === prevRun.id);

    const countByCategory = (bandList: Band[]) => {
      const counts = { target: 0, nonspecific: 0, smear: 0, missing: 0 };
      bandList.forEach((b) => {
        counts[b.label_category]++;
      });
      return counts;
    };

    const current = countByCategory(currentBands);
    const prev = countByCategory(prevBands);
    const categories = ['target', 'nonspecific', 'smear', 'missing'];

    return categories.map((cat) => {
      const cur = current[cat as keyof typeof current];
      const prv = prev[cat as keyof typeof prev];
      const changePercent = prv > 0 ? Math.abs(cur - prv) / prv : cur > 0 ? 1 : 0;
      return {
        category: LABEL_NAMES[cat],
        current: cur,
        previous: -prv,
        blink: changePercent > 0.2,
      };
    });
  }, [lotRuns, allLotBands]);

  const handleCategoryToggle = (cat: string) => {
    const current = filters.labelCategory;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    updateFilters({ labelCategory: next });
  };

  const handleSupplement = async (bandId: string) => {
    try {
      await supplementBand(bandId, { note: '补录信息' });
    } catch (err) {
      console.error('Failed to supplement:', err);
    }
  };

  const handleConfirm = async (bandId: string, pass: boolean) => {
    try {
      await confirmBand(bandId, pass);
    } catch (err) {
      console.error('Failed to confirm:', err);
    }
  };

  const handleTriggerRun = async () => {
    if (lotId) {
      try {
        await triggerDiffRun(lotId, {});
      } catch (err) {
        console.error('Failed to trigger run:', err);
      }
    }
  };

  const handleExport = async () => {
    if (lotId) {
      try {
        await exportData('csv', { lot_ids: [lotId], include_photos: false, include_charts: false });
      } catch (err) {
        console.error('Failed to export:', err);
      }
    }
  };

  const toggleCategoryFilter = () => {
    const allKeys = CATEGORY_FILTERS.map((c) => c.key);
    const isAllSelected = allKeys.every((k) => filters.labelCategory.includes(k));
    updateFilters({ labelCategory: isAllSelected ? [] : allKeys });
  };

  if (!lot) {
    return (
      <div className="text-center py-16">
        <div className="text-slate-400 text-lg">批号不存在或未加载</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-serif font-bold text-3xl text-slate-800">
                  {lot.lot_number}
                </h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-lab-700/10 text-lab-700 text-sm font-medium">
                    {lot.reagent_name}
                  </span>
                  <span className="text-sm text-slate-500">{lot.manufacturer}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    生产 {lot.production_date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    有效期至 {lot.expiry_date}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() =>
                    navigate(
                      `/compare/${lotId}/${nextLot?.id ?? lotId}`
                    )
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  并排对比
                </button>
                <button
                  onClick={handleTriggerRun}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <PlayCircle className="w-4 h-4 text-lab-700" />
                  重复运行
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-lab-700 text-white text-sm font-medium hover:bg-lab-800 transition-colors shadow-sm shadow-lab-700/20"
                >
                  <Download className="w-4 h-4" />
                  导出该批号
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">样本数</div>
            <div className="text-2xl font-bold font-mono text-slate-800">{stats.sampleCount}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">条带数</div>
            <div className="text-2xl font-bold font-mono text-lab-700">{stats.bandCount}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">待确认</div>
            <div className="text-2xl font-bold font-mono text-lab-warn">{stats.pendingCount}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">异常</div>
            <div className="text-2xl font-bold font-mono text-lab-danger">{stats.abnormalCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">显微照片</h3>
              {micrographSamples.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">暂无照片</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {micrographSamples.map((sample: Sample, idx: number) => (
                    <div
                      key={sample.id}
                      className="relative aspect-square rounded-lg overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${
                          ['#dbeafe', '#fce7f3', '#d1fae5', '#fef3c7'][idx % 4]
                        } 0%, ${['#bfdbfe', '#fbcfe8', '#a7f3d0', '#fde68a'][idx % 4]} 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-xs font-mono font-bold text-slate-600">
                            {idx + 1}
                          </span>
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-[10px] font-mono bg-black/30 backdrop-blur-sm text-white px-1.5 py-0.5 rounded truncate">
                        {sample.sample_code}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">采样地点</h3>
              {samplingSiteNames.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">暂无数据</div>
              ) : (
                <div className="space-y-2">
                  {samplingSiteNames.map((site) => (
                    <div
                      key={site.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <MapPin className="w-4 h-4 text-lab-700 shrink-0" />
                      <span className="text-sm text-slate-700 truncate">{site.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">试剂信息</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">试剂名称</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5">{lot.reagent_name}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">生产厂商</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5">{lot.manufacturer}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide">批次号</div>
                  <div className="text-sm font-mono text-lab-700 mt-0.5">{lot.lot_number}</div>
                </div>
                {lot.notes && (
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wide">备注</div>
                    <div className="text-sm text-slate-600 mt-0.5">{lot.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">分析轮次时间线</h3>
            {lotRuns.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">暂无分析轮次</div>
            ) : (
              <div className="relative space-y-1 pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200 timeline-connector" />
                {lotRuns.map((run: AnalysisRun, idx: number) => {
                  const runBandCount = allLotBands.filter((b) => b.run_id === run.id).length;
                  const isExpanded = expandedRunId === run.id;
                  const isSelected = selectedRunId === run.id;
                  return (
                    <div key={run.id}>
                      <div
                        className={`relative p-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-lab-700/5 border border-lab-700/20' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedRunId(isSelected ? null : run.id);
                        }}
                      >
                        <div
                          className={`absolute -left-[18px] top-4 w-3 h-3 rounded-full ${
                            idx === 0 ? 'bg-lab-700 timeline-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-700">
                              第 {run.run_index} 轮分析
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {runBandCount} 条带 · {run.operator}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRunId(isExpanded ? null : run.id);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">算法版本</span>
                              <span className="font-mono text-slate-600">{run.algorithm_version}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">操作员</span>
                              <span className="text-slate-600">{run.operator}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">执行时间</span>
                              <span className="text-slate-600">
                                {new Date(run.executed_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">条带数</span>
                              <span className="font-mono text-lab-700">{runBandCount}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-lab-700" />
            条带标注表格
            {selectedRunId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-lab-700/10 text-lab-700 text-[10px] font-medium">
                已筛选轮次
              </span>
            )}
            <span className="text-xs text-slate-400 font-normal">共 {filteredBands.length} 条</span>
          </h3>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
              <button
                onClick={toggleCategoryFilter}
                className="px-2 py-1 text-xs rounded-md text-slate-500 hover:text-slate-700 hover:bg-white transition-colors"
              >
                全选
              </button>
              {CATEGORY_FILTERS.map((cat) => {
                const active = filters.labelCategory.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryToggle(cat.key)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      active
                        ? cat.classes
                        : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">质量分 ≥</span>
              <input
                type="range"
                min={0}
                max={100}
                value={filters.qualityMin}
                onChange={(e) => updateFilters({ qualityMin: Number(e.target.value) })}
                className="w-24 accent-lab-700"
              />
              <span className="text-xs font-mono text-lab-700 w-8 text-right">
                {filters.qualityMin}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar max-h-[520px] rounded-xl border border-slate-100">
          <table className="w-full text-sm table-zebra">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
              <tr className="text-slate-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">样本编号</th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">位置mm</th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">分子量kDa</th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">灰度值</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">质量分</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">标注结论</th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap">分类</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">需补录</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">确认状态</th>
                <th className="px-4 py-3 text-center font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBands.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                    暂无符合条件的条带数据
                  </td>
                </tr>
              ) : (
                filteredBands.map((band: Band) => {
                  const sample = samples.find((s) => s.id === band.sample_id);
                  const catBadge =
                    CATEGORY_FILTERS.find((c) => c.key === band.label_category) ??
                    CATEGORY_FILTERS[0];
                  return (
                    <tr
                      key={band.id}
                      className={
                        band.needs_supplement
                          ? '!bg-purple-50/60 border-l-4 border-l-lab-supplement'
                          : ''
                      }
                    >
                      <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {sample?.sample_code ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-right whitespace-nowrap">
                        {band.position_mm.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-right whitespace-nowrap">
                        {band.molecular_weight_kda.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-right whitespace-nowrap">
                        {band.gray_value}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center min-w-[48px] px-2 py-1 rounded-md text-xs font-mono ${getQualityCellClass(
                            band.quality_score
                          )}`}
                        >
                          {band.quality_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {band.label ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${catBadge.classes}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {band.needs_supplement && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-lab-supplement/10 text-lab-supplement text-[11px] font-medium border border-lab-supplement/20 needs_supplement badge">
                            需补录
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getConfirmStatusClass(
                            band.confirm_status
                          )}`}
                        >
                          {getConfirmStatusLabel(band.confirm_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSupplement(band.id)}
                            className="p-1.5 rounded-lg hover:bg-lab-supplement/10 text-lab-supplement transition-colors"
                            title="补录"
                          >
                            <FilePlus2 className="w-4 h-4" />
                          </button>
                          {band.confirm_status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleConfirm(band.id, true)}
                                className="p-1.5 rounded-lg hover:bg-lab-confirm/10 text-lab-confirm transition-colors"
                                title="确认"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleConfirm(band.id, false)}
                                className="p-1.5 rounded-lg hover:bg-lab-danger/10 text-lab-danger transition-colors"
                                title="驳回"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            band.confirm_status === 'confirmed' ? (
                              <CheckCircle2 className="w-4 h-4 text-lab-confirm/50" />
                            ) : (
                              <XCircle className="w-4 h-4 text-lab-danger/50" />
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">差异分组统计（当前轮 vs 上一轮）</h3>
        {diffChartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            至少需要 2 轮分析数据才能显示差异统计
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={diffChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => String(Math.abs(Number(v)))}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number, name: string) => [
                  Math.abs(value),
                  name === 'current' ? '当前轮' : '上一轮',
                ]}
              />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
              <Bar dataKey="current" name="current" radius={[6, 6, 0, 0]} maxBarSize={30}>
                {diffChartData.map((entry, index) => (
                  <Cell
                    key={`cur-${index}`}
                    fill="#2563eb"
                    className={entry.blink ? 'blink-category' : ''}
                  />
                ))}
              </Bar>
              <Bar dataKey="previous" name="previous" radius={[0, 0, 6, 6]} maxBarSize={30}>
                {diffChartData.map((entry, index) => (
                  <Cell
                    key={`prev-${index}`}
                    fill="#94a3b8"
                    className={entry.blink ? 'blink-category' : ''}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {diffChartData.length > 0 && (
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-lab-700 inline-block" />
              当前轮次
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" />
              上一轮次
            </span>
            <span className="flex items-center gap-1.5 text-lab-warn">
              <AlertTriangle className="w-3 h-3" />
              闪烁项 = 变化超过 20%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
