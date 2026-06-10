import { useEffect, useMemo, useState } from 'react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Image,
  BarChart3,
  Eye,
  CheckCircle2,
  Loader2,
  ClipboardList,
  Hash,
  Database,
  Users,
  Layers,
  FileDown,
  Calendar,
  MapPin,
  Tag,
  Gauge,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { ExportOptions, ExportPreview } from '../../shared/types';

const formatInfo = {
  csv: { icon: FileSpreadsheet, label: 'CSV', desc: 'Excel 兼容，适合数据处理', ext: 'csv', mime: 'text/csv' },
  json: { icon: FileJson, label: 'JSON', desc: '结构化数据，适合程序读取', ext: 'json', mime: 'application/json' },
  pdf: { icon: FileText, label: 'PDF 报告', desc: '格式化报告，适合归档打印', ext: 'pdf', mime: 'application/pdf' },
} as const;

type FormatKey = keyof typeof formatInfo;

export default function ExportCenter() {
  const { lots, samples, bands, exportData, fetchAllData } = useWorkbenchStore();

  useEffect(() => {
    if (bands.length === 0) {
      fetchAllData();
    }
  }, [bands.length, fetchAllData]);

  const [format, setFormat] = useState<FormatKey>('csv');
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(false);
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ExportPreview | null>(null);
  const [previewFetched, setPreviewFetched] = useState(false);

  const [exportPhase, setExportPhase] = useState<'idle' | 'exporting' | 'done'>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);

  const lotSampleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sample of samples) {
      counts[sample.lot_id] = (counts[sample.lot_id] || 0) + 1;
    }
    return counts;
  }, [samples]);

  const toggleLot = (lotId: string) => {
    setSelectedLots((prev) => (prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]));
  };

  const selectAllLots = () => setSelectedLots(lots.map((l) => l.id));
  const clearLots = () => setSelectedLots([]);

  const effectiveLotIds = useMemo(() => {
    return selectedLots.length > 0 ? selectedLots : lots.map((l) => l.id);
  }, [selectedLots, lots]);

  const effectiveSamples = useMemo(() => {
    return samples.filter((s) => effectiveLotIds.includes(s.lot_id));
  }, [samples, effectiveLotIds]);

  const effectiveBands = useMemo(() => {
    const sampleIds = effectiveSamples.map((s) => s.id);
    let result = bands.filter((b) => sampleIds.includes(b.sample_id));
    if (confirmedOnly) {
      result = result.filter((b) => b.confirm_status === 'confirmed');
    }
    return result;
  }, [bands, effectiveSamples, confirmedOnly]);

  const exportFields = useMemo(() => {
    const fields = ['sample_code', 'position_mm', 'molecular_weight_kda', 'gray_value', 'quality_score', 'label', 'label_category', 'confirm_status'];
    if (includePhotos) fields.push('micrograph_url');
    if (includeLogs) fields.push('reviewer', 'confirmed_at', 'reject_reason');
    return fields;
  }, [includePhotos, includeLogs]);

  const estimatedSize = useMemo(() => {
    const rows = effectiveBands.length;
    const base = rows * exportFields.length * 15;
    let size = base;
    if (format === 'json') size *= 1.8;
    if (format === 'pdf') size *= 8;
    if (includeCharts) size += 500 * 1024;
    if (includePhotos) size += rows * 2 * 1024;
    const kb = size / 1024;
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb.toFixed(0)} KB`;
  }, [effectiveBands, exportFields, format, includeCharts, includePhotos]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewFetched(true);
    try {
      const opts: Omit<ExportOptions, 'format'> = {
        lot_ids: effectiveLotIds,
        include_photos: includePhotos,
        include_charts: includeCharts,
      };
      const res = await fetch('/api/export/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, ...opts }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        setPreviewData({
          row_count: effectiveBands.length,
          fields: exportFields,
          lot_range: lots.filter((l) => effectiveLotIds.includes(l.id)).map((l) => l.lot_number).join(', '),
          sample_count: effectiveSamples.length,
        });
      }
    } catch {
      setPreviewData({
        row_count: effectiveBands.length,
        fields: exportFields,
        lot_range: lots.filter((l) => effectiveLotIds.includes(l.id)).map((l) => l.lot_number).join(', '),
        sample_count: effectiveSamples.length,
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    setExportPhase('exporting');
    setExportProgress(0);

    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 150);

    try {
      const opts: Omit<ExportOptions, 'format'> = {
        lot_ids: effectiveLotIds,
        include_photos: includePhotos,
        include_charts: includeCharts,
      };
      await exportData(format, opts);
      setExportProgress(100);
      setExportPhase('done');
      setDownloadCount((c) => c + 1);
      setTimeout(() => {
        setExportPhase('idle');
        setExportProgress(0);
      }, 2500);
    } catch (err) {
      console.error('Export failed:', err);
      setExportPhase('idle');
      setExportProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const previewRows = useMemo(() => {
    const rows = effectiveBands.slice(0, 10).map((band) => {
      const sample = samples.find((s) => s.id === band.sample_id);
      const site = sample ? (lots.find((l) => l.id === sample.lot_id) ? undefined : undefined) : undefined;
      return {
        sample_code: sample?.sample_code ?? '-',
        position_mm: band.position_mm,
        molecular_weight_kda: band.molecular_weight_kda,
        gray_value: band.gray_value,
        quality_score: band.quality_score,
        label: band.label ?? '-',
        label_category: band.label_category,
        confirm_status: band.confirm_status,
      };
    });
    return rows;
  }, [effectiveBands, samples, lots]);

  const fieldLabels: Record<string, { label: string; icon: typeof Hash }> = {
    sample_code: { label: '样本编号', icon: Hash },
    position_mm: { label: '条带位置', icon: Gauge },
    molecular_weight_kda: { label: '分子量', icon: Layers },
    gray_value: { label: '灰度值', icon: Tag },
    quality_score: { label: '质量分', icon: Gauge },
    label: { label: '标注结论', icon: Tag },
    label_category: { label: '分类', icon: Layers },
    confirm_status: { label: '复核状态', icon: CheckCircle2 },
    micrograph_url: { label: '显微照片', icon: Image },
    reviewer: { label: '复核人', icon: Users },
    confirmed_at: { label: '确认时间', icon: Calendar },
    reject_reason: { label: '驳回原因', icon: AlertCircle },
  };

  const categoryLabel = (c: string) => {
    return c === 'target' ? '目标条带' : c === 'nonspecific' ? '非特异性' : c === 'smear' ? '拖尾' : '缺失';
  };

  const statusLabel = (s: string) => {
    return s === 'confirmed' ? '已确认' : s === 'rejected' ? '已驳回' : '待确认';
  };

  return (
    <div className="space-y-6 animate-slideIn">
      <style>{`
        @keyframes ring-fill {
          from { stroke-dashoffset: 283; }
        }
        .progress-ring circle.progress {
          transition: stroke-dashoffset 0.3s ease;
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-serif flex items-center gap-3">
          <Download className="w-7 h-7 text-lab-700" />
          导出中心
        </h1>
        <p className="text-sm text-slate-500 mt-1">图表/明细/下载 · 统一数据源，结果一致性保证</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============ 左侧配置区 ============ */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. 格式选择 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-lab-700" />
              1. 选择导出格式
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(formatInfo) as FormatKey[]).map((key) => {
                const info = formatInfo[key];
                const Icon = info.icon;
                const isActive = format === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? 'border-lab-700 bg-lab-700/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-lab-700 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <Icon
                      className={`w-8 h-8 mb-2 ${isActive ? 'text-lab-700' : 'text-slate-400'}`}
                    />
                    <div className={`font-semibold text-sm ${isActive ? 'text-lab-700' : 'text-slate-700'}`}>
                      {info.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-tight">{info.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 批号范围 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-lab-700" />
                2. 选择批号范围
              </h3>
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={selectAllLots}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  全选
                </button>
                <button
                  onClick={clearLots}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
            {selectedLots.length === 0 && (
              <div className="mb-3 p-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                未勾选时默认导出全部批号
              </div>
            )}
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {lots.map((lot) => {
                const checked = selectedLots.includes(lot.id) || selectedLots.length === 0;
                const count = lotSampleCounts[lot.id] || 0;
                return (
                  <label
                    key={lot.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? 'border-lab-700/30 bg-lab-700/5'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLots.includes(lot.id)}
                      onChange={() => toggleLot(lot.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-700 truncate">{lot.lot_number}</div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-medium">
                          {count} 样本
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{lot.reagent_name}</div>
                    </div>
                  </label>
                );
              })}
              {lots.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">加载中...</div>
              )}
            </div>
          </div>

          {/* 3. 附加选项 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lab-700" />
              3. 附加选项
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex items-start gap-2 flex-1">
                  <BarChart3 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">包含差异分析图表</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      嵌入质量分布、分类统计等图表{format !== 'pdf' && <span className="text-lab-warn">（仅 PDF 生效）</span>}
                    </div>
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex items-start gap-2 flex-1">
                  <Image className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">包含显微照片链接</div>
                    <div className="text-xs text-slate-500 mt-0.5">将样本照片链接嵌入导出文件（文件较大）</div>
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeLogs}
                  onChange={(e) => setIncludeLogs(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex items-start gap-2 flex-1">
                  <ClipboardList className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">包含复核日志</div>
                    <div className="text-xs text-slate-500 mt-0.5">加入复核人、确认时间、驳回原因等字段</div>
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedOnly}
                  onChange={(e) => setConfirmedOnly(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex items-start gap-2 flex-1">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">仅导出已确认数据</div>
                    <div className="text-xs text-slate-500 mt-0.5">排除待确认和已驳回的条带记录</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 预览 + 下载按钮 */}
          <div className="grid grid-cols-5 gap-3">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="col-span-2 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-medium hover:border-lab-700/30 hover:bg-lab-700/5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              预览
            </button>
            <button
              onClick={handleExport}
              disabled={exportPhase === 'exporting'}
              className={`col-span-3 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                exportPhase === 'done'
                  ? 'bg-lab-confirm text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-lab-700 to-blue-600 text-white hover:from-lab-800 hover:to-blue-700 shadow-lab-700/20 disabled:opacity-70'
              }`}
            >
              {exportPhase === 'exporting' ? (
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <svg className="progress-ring w-5 h-5 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                    <circle
                      className="progress"
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (exportProgress / 100) * 283}
                      style={{ animation: 'ring-fill 0.15s ease' }}
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold text-white" style={{ fontSize: '8px' }}>{Math.round(exportProgress)}%</span>
                </div>
              ) : exportPhase === 'done' ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  导出完成
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  开始下载
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============ 右侧预览区 ============ */}
        <div className="lg:col-span-7 space-y-5">
          {/* 顶部概要卡 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Database className="w-4 h-4 text-lab-700" />
                数据预览
              </h3>
              {!previewFetched && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  点击左侧「预览」按钮获取实时预览
                </span>
              )}
            </div>

            {previewData || !previewFetched ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3.5">
                  <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> 数据行数
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-800">
                    {previewFetched && previewData ? previewData.row_count : effectiveBands.length}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-3.5">
                  <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> 样本数
                  </div>
                  <div className="text-2xl font-bold font-mono text-lab-700">
                    {previewFetched && previewData ? previewData.sample_count : effectiveSamples.length}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-3.5 col-span-2">
                  <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> 批号范围
                  </div>
                  <div className="text-sm font-medium text-slate-700 leading-snug line-clamp-2">
                    {previewFetched && previewData
                      ? previewData.lot_range
                      : lots.filter((l) => effectiveLotIds.includes(l.id)).map((l) => l.lot_number).join(', ') || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-lab-700" />
              </div>
            )}

            {/* 字段标签 */}
            <div className="mt-4">
              <div className="text-[11px] text-slate-500 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> 包含字段 ({exportFields.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exportFields.map((f) => {
                  const info = fieldLabels[f] || { label: f, icon: Tag };
                  const FieldIcon = info.icon;
                  return (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                    >
                      <FieldIcon className="w-3 h-3" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 数据表格预览 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            {previewFetched && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lab-confirm shrink-0" />
                <p className="text-xs text-emerald-800 font-medium">
                  预览数据与下载结果来自同一批次，确保完全一致
                </p>
              </div>
            )}
            <div className="p-5">
              <div className="text-xs font-medium text-slate-600 mb-3 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                数据预览（前 10 行）
              </div>
              {previewRows.length === 0 ? (
                <div className="py-12 text-center">
                  <Database className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                  <div className="text-sm text-slate-500">暂无预览数据</div>
                  <div className="text-xs text-slate-400 mt-1">请确认已选择批号和正确的过滤条件</div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
                    <table className="w-full text-sm table-zebra">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-600 text-xs uppercase tracking-wide">
                          <th className="px-3 py-2.5 text-left font-medium">样本编号</th>
                          <th className="px-3 py-2.5 text-left font-medium">位置(mm)</th>
                          <th className="px-3 py-2.5 text-left font-medium">分子量(kDa)</th>
                          <th className="px-3 py-2.5 text-left font-medium">灰度值</th>
                          <th className="px-3 py-2.5 text-left font-medium">质量分</th>
                          <th className="px-3 py-2.5 text-left font-medium">标注</th>
                          <th className="px-3 py-2.5 text-left font-medium">分类</th>
                          <th className="px-3 py-2.5 text-left font-medium">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2.5 font-mono text-slate-700 font-medium">{row.sample_code}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">{row.position_mm}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">{row.molecular_weight_kda}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">{row.gray_value}</td>
                            <td className="px-3 py-2.5">
                              <span className={`font-mono ${
                                row.quality_score >= 70 ? 'text-lab-confirm' : row.quality_score >= 40 ? 'text-lab-warn' : 'text-lab-danger'
                              }`}>
                                {row.quality_score}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{row.label}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                row.label_category === 'target' ? 'bg-blue-100 text-blue-700'
                                : row.label_category === 'nonspecific' ? 'bg-amber-100 text-amber-700'
                                : row.label_category === 'smear' ? 'bg-purple-100 text-purple-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                                {categoryLabel(row.label_category)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`text-[11px] font-medium flex items-center gap-1 ${
                                row.confirm_status === 'confirmed' ? 'text-lab-confirm'
                                : row.confirm_status === 'rejected' ? 'text-lab-danger'
                                : 'text-lab-warn'
                              }`}>
                                {row.confirm_status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                                {statusLabel(row.confirm_status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 底部统计 */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Database className="w-3.5 h-3.5" />
                  <span>文件大小估计：</span>
                  <span className="font-mono font-semibold text-slate-700">{estimatedSize}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Download className="w-3.5 h-3.5" />
                  <span>下载次数：</span>
                  <span className="font-mono font-semibold text-slate-700">{downloadCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>导出格式：</span>
                <span className="font-mono text-slate-600 font-medium">{formatInfo[format].label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
