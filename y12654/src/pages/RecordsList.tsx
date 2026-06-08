import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Filter, ChevronDown, X, Box, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import AnomalySummaryCard from '@/components/AnomalySummaryCard';
import AnomalyTag from '@/components/AnomalyTag';
import StatusTag from '@/components/StatusTag';
import {
  ANOMALY_TYPE_LABEL,
  PROCESS_STATUS_LABEL,
  type AnomalyType,
  type ProcessStatus,
} from '@/types';
import { generateReportPDF, downloadBlob, getReportFileName } from '@/services/exportService';

export default function RecordsList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    versions,
    currentRunId,
    filterAnomalyType,
    filterProcessStatus,
    setCurrentRunId,
    setFilterAnomalyType,
    setFilterProcessStatus,
    getFilteredRecords,
    getAnomalySummary,
    records,
    interceptionRules,
    importRecords,
  } = useAppStore();

  const [versionOpen, setVersionOpen] = useState(false);
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const filteredRecords = useMemo(() => getFilteredRecords(), [getFilteredRecords, currentRunId, filterAnomalyType, filterProcessStatus]);
  const summary = useMemo(() => getAnomalySummary(), [getAnomalySummary, currentRunId]);

  const currentVersion = versions.find((v) => v.id === currentRunId);

  const anomalyTypes: AnomalyType[] = ['coordinate_mismatch', 'timing_desync', 'precision_overrun', 'data_missing'];
  const statusTypes: ProcessStatus[] = ['need_material', 'need_calibration', 'resolved'];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = importRecords();
    setImportMsg(`导入完成：新增 ${result.inserted} 条记录，检测到 ${result.anomalies} 个异常`);
    setTimeout(() => setImportMsg(null), 4000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async () => {
    if (!currentVersion) return;
    setExporting(true);
    try {
      const runRecords = records.filter((r) => r.runId === currentRunId);
      const blob = await generateReportPDF(currentVersion, runRecords, interceptionRules);
      downloadBlob(blob, getReportFileName(currentVersion));
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-800 text-surface-100 flex flex-col">
      {/* Header */}
      <header className="bg-surface-900 border-b border-surface-600 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Box className="text-primary-400" size={22} />
          <div>
            <h1 className="font-mono text-lg font-bold text-surface-50 tracking-tight">细胞器三维拼装</h1>
            <p className="text-[11px] text-surface-400">测量记录复核工具</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Version Selector */}
          <div className="relative">
            <button
              onClick={() => setVersionOpen(!versionOpen)}
              className="btn-secondary flex items-center gap-2 min-w-[180px] justify-between"
            >
              <div className="text-left">
                <div className="text-xs text-surface-300">{currentVersion?.label}</div>
                <div className="text-[10px] font-mono text-surface-400">{currentVersion?.timestamp}</div>
              </div>
              <ChevronDown size={14} className={`transition-transform ${versionOpen ? 'rotate-180' : ''}`} />
            </button>
            {versionOpen && (
              <div className="absolute top-full right-0 mt-1 bg-surface-700 border border-surface-500 rounded-sm shadow-panel w-full min-w-[200px] z-20">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setCurrentRunId(v.id);
                      setVersionOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-600 transition-colors ${
                      v.id === currentRunId ? 'bg-primary-500/20 text-primary-300' : ''
                    }`}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-[10px] font-mono text-surface-400">{v.timestamp} · {v.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-surface-600" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary flex items-center gap-1.5"
          >
            <Upload size={15} />
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={handleImport}
          />

          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Download size={15} />
            {exporting ? '导出中...' : '下载报告'}
          </button>
        </div>
      </header>

      {importMsg && (
        <div className="bg-success-500/20 border-b border-success-500/50 px-6 py-2 text-sm text-success-300 flex items-center gap-2">
          <FileText size={14} />
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <main className="flex-1 flex flex-col gap-5 p-6 overflow-auto">
        {/* Summary Cards */}
        <section>
          <h2 className="label-text mb-3">异常概览 · 点击按类型筛选</h2>
          <div className="grid grid-cols-4 gap-4">
            {anomalyTypes.map((t) => (
              <AnomalySummaryCard
                key={t}
                type={t}
                count={summary[t].count}
                active={filterAnomalyType === t}
                onClick={() => setFilterAnomalyType(filterAnomalyType === t ? null : t)}
              />
            ))}
          </div>
        </section>

        {/* Filters & Table */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="label-text flex items-center gap-1.5">
              <Filter size={12} />
              测量记录 · {filteredRecords.length} 条
            </h2>

            <div className="flex items-center gap-2">
              {/* Anomaly Type Filter */}
              <div className="relative">
                <button
                  onClick={() => setAnomalyOpen(!anomalyOpen)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  {filterAnomalyType ? ANOMALY_TYPE_LABEL[filterAnomalyType] : '异常类型'}
                  <ChevronDown size={12} className={`transition-transform ${anomalyOpen ? 'rotate-180' : ''}`} />
                  {filterAnomalyType && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setFilterAnomalyType(null); }}
                      className="ml-1"
                    >
                      <X size={10} />
                    </span>
                  )}
                </button>
                {anomalyOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-700 border border-surface-500 rounded-sm shadow-panel w-40 z-20">
                    {anomalyTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setFilterAnomalyType(t); setAnomalyOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-600 transition-colors ${
                          filterAnomalyType === t ? 'bg-primary-500/20 text-primary-300' : ''
                        }`}
                      >
                        {ANOMALY_TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  {filterProcessStatus ? PROCESS_STATUS_LABEL[filterProcessStatus] : '处理状态'}
                  <ChevronDown size={12} className={`transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                  {filterProcessStatus && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setFilterProcessStatus(null); }}
                      className="ml-1"
                    >
                      <X size={10} />
                    </span>
                  )}
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-700 border border-surface-500 rounded-sm shadow-panel w-40 z-20">
                    {statusTypes.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setFilterProcessStatus(s); setStatusOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-600 transition-colors ${
                          filterProcessStatus === s ? 'bg-primary-500/20 text-primary-300' : ''
                        }`}
                      >
                        {PROCESS_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(filterAnomalyType || filterProcessStatus) && (
                <button
                  onClick={() => { setFilterAnomalyType(null); setFilterProcessStatus(null); }}
                  className="text-xs text-surface-400 hover:text-surface-200"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          <div className="card overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-surface-800 sticky top-0 z-10">
                  <tr className="text-left text-xs text-surface-300 border-b border-surface-600">
                    <th className="px-4 py-3 font-medium">记录 ID</th>
                    <th className="px-4 py-3 font-medium">时间戳</th>
                    <th className="px-4 py-3 font-medium">异常类型</th>
                    <th className="px-4 py-3 font-medium">处理状态</th>
                    <th className="px-4 py-3 font-medium">来源 · 设备 · 操作员</th>
                    <th className="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-surface-400 text-sm">
                        暂无符合条件的记录
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`border-b border-surface-600/70 hover:bg-surface-600/30 transition-colors ${
                          idx % 2 === 0 ? 'bg-surface-700/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary-300">{r.id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-surface-300">{r.timestamp}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.anomalies.map((a) => (
                              <AnomalyTag key={a.id} type={a.type} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.opinion.decision && <StatusTag status={r.opinion.decision} />}
                        </td>
                        <td className="px-4 py-3 text-xs text-surface-300">
                          <div className="font-mono">{r.source.upstreamId}</div>
                          <div className="text-surface-400">
                            {r.source.device} · {r.source.operator} · {r.source.location}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/records/${r.id}`)}
                            className="btn-ghost text-xs text-primary-300 hover:text-primary-200"
                          >
                            查看详情 →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
