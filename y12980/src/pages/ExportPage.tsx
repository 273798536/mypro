import { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  Tag,
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  CheckCircle2,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { exportApi, importApi, ledgerApi } from '../services/api.js';
import type { ExportRequest, ExportResult, ImportBatch, RecordStatus } from '../../shared/types.js';
import { STATUS_LABELS } from '../../shared/types.js';

export default function ExportPage() {
  const [format, setFormat] = useState<'EXCEL' | 'CSV'>('EXCEL');
  const [scope, setScope] = useState<ExportRequest['scope']>('ALL');
  const [status, setStatus] = useState<RecordStatus | undefined>();
  const [batchId, setBatchId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<RecordStatus, number>>({
    AVAILABLE: 0,
    NEEDS_REVIEW: 0,
    UNAVAILABLE: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchList, counts] = await Promise.all([
        importApi.getBatches(),
        ledgerApi.getStatusCounts(),
      ]);
      setBatches(batchList);
      setStatusCounts(counts as Record<RecordStatus, number>);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const estimatedCount = () => {
    switch (scope) {
      case 'BY_STATUS':
        return status ? statusCounts[status] : statusCounts.AVAILABLE + statusCounts.NEEDS_REVIEW + statusCounts.UNAVAILABLE;
      case 'BY_BATCH':
        return batches.find(b => b.id === batchId)?.totalRecords || 0;
      default:
        return statusCounts.AVAILABLE + statusCounts.NEEDS_REVIEW + statusCounts.UNAVAILABLE;
    }
  };

  const canExport = () => {
    if (scope === 'BY_BATCH' && !batchId) return false;
    if (scope === 'BY_DATE' && (!startDate || !endDate)) return false;
    return true;
  };

  const handleExport = async () => {
    if (!canExport()) return;

    setExporting(true);
    setError(null);
    setLastExport(null);

    try {
      const request: ExportRequest = {
        format,
        scope,
        ...(scope === 'BY_STATUS' && status ? { status } : {}),
        ...(scope === 'BY_BATCH' && batchId ? { batchId } : {}),
        ...(scope === 'BY_DATE' && startDate && endDate ? { startDate, endDate } : {}),
      };

      const result = await exportApi.generate(request);
      setLastExport(result);

      window.open(exportApi.getDownloadUrl(result.exportId), '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const getScopeDescription = () => {
    switch (scope) {
      case 'ALL':
        return '全部台账记录';
      case 'BY_STATUS':
        return status ? STATUS_LABELS[status] + '记录' : '全部状态';
      case 'BY_BATCH':
        const batch = batches.find(b => b.id === batchId);
        return batch ? `批次: ${batch.fileName}` : '请选择批次';
      case 'BY_DATE':
        return startDate && endDate ? `${startDate} 至 ${endDate}` : '请选择日期范围';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">报告导出</h2>
          <p className="text-sm text-slate-400 mt-1">按条件筛选并导出台账报告，附带来源材料引用</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">导出失败</p>
            <p className="text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {lastExport && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-emerald-400">导出成功</p>
            <p className="text-emerald-300/80 text-sm mt-1">
              文件: {lastExport.fileName} · {lastExport.recordCount.toLocaleString()} 条记录
            </p>
          </div>
          <a
            href={exportApi.getDownloadUrl(lastExport.exportId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            下载
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">导出格式</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('EXCEL')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    format === 'EXCEL'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 mb-3 ${format === 'EXCEL' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <p className={`font-semibold ${format === 'EXCEL' ? 'text-white' : 'text-slate-300'}`}>Excel (.xlsx)</p>
                  <p className="text-xs text-slate-500 mt-1">多Sheet格式，包含汇总和明细</p>
                </button>
                <button
                  onClick={() => setFormat('CSV')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    format === 'CSV'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <FileText className={`w-8 h-8 mb-3 ${format === 'CSV' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <p className={`font-semibold ${format === 'CSV' ? 'text-white' : 'text-slate-300'}`}>CSV (.csv)</p>
                  <p className="text-xs text-slate-500 mt-1">纯文本格式，适合系统导入</p>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white">导出范围</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'ALL', label: '全部', icon: Database },
                  { value: 'BY_STATUS', label: '按状态', icon: Tag },
                  { value: 'BY_BATCH', label: '按批次', icon: CheckCircle },
                  { value: 'BY_DATE', label: '按日期', icon: Calendar },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => setScope(item.value as ExportRequest['scope'])}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      scope === item.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>

              {scope === 'BY_STATUS' && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">选择状态</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setStatus(status === 'AVAILABLE' ? undefined : 'AVAILABLE')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        status === 'AVAILABLE'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                      可用
                      <p className="text-xs font-mono mt-1">{statusCounts.AVAILABLE}</p>
                    </button>
                    <button
                      onClick={() => setStatus(status === 'NEEDS_REVIEW' ? undefined : 'NEEDS_REVIEW')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        status === 'NEEDS_REVIEW'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                      需复核
                      <p className="text-xs font-mono mt-1">{statusCounts.NEEDS_REVIEW}</p>
                    </button>
                    <button
                      onClick={() => setStatus(status === 'UNAVAILABLE' ? undefined : 'UNAVAILABLE')}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        status === 'UNAVAILABLE'
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <XCircle className="w-5 h-5 mx-auto mb-1" />
                      不可用
                      <p className="text-xs font-mono mt-1">{statusCounts.UNAVAILABLE}</p>
                    </button>
                  </div>
                </div>
              )}

              {scope === 'BY_BATCH' && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">选择导入批次</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-4 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="text-center py-4 text-slate-500">暂无批次</div>
                    ) : (
                      batches.map(batch => (
                        <button
                          key={batch.id}
                          onClick={() => setBatchId(batchId === batch.id ? undefined : batch.id)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            batchId === batch.id
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-sm ${batchId === batch.id ? 'text-white' : 'text-slate-300'}`}>
                              {batch.fileName}
                            </span>
                            <ChevronRight className={`w-4 h-4 ${batchId === batch.id ? 'text-indigo-400' : 'text-slate-600'}`} />
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>共 {batch.totalRecords} 条</span>
                            <span className="text-emerald-500">+{batch.newRecords} 新增</span>
                            <span className="text-amber-500">!{batch.anomalyCount} 异常</span>
                            <span>{new Date(batch.importedAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {scope === 'BY_DATE' && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">选择日期范围</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500">至</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
              <h3 className="font-semibold text-white">导出预览</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">格式</span>
                  <span className="text-white font-medium">{format === 'EXCEL' ? 'Excel' : 'CSV'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">范围</span>
                  <span className="text-white font-medium text-right">{getScopeDescription()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">预计记录数</span>
                  <span className="text-indigo-400 font-mono font-bold">{estimatedCount().toLocaleString()}</span>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-400">
                    <p className="text-indigo-300 font-medium mb-1">报告包含内容</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>台账记录明细表</li>
                      <li>不可用记录清单（带红标）</li>
                      <li>导出汇总统计</li>
                      <li>来源文件和行号追溯</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-300/80">
                    <p className="text-amber-300 font-medium mb-1">业务同事使用说明</p>
                    <p>红色标记的记录不可直接使用，请联系DBA复核后再使用。</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={!canExport() || exporting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  !canExport() || exporting
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    导出报告
                  </>
                )}
              </button>

              {!canExport() && (
                <p className="text-xs text-red-400 text-center">
                  {scope === 'BY_BATCH' && !batchId && '请选择一个批次'}
                  {scope === 'BY_DATE' && (!startDate || !endDate) && '请选择完整的日期范围'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
