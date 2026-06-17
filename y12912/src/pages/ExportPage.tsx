import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflowStore } from '../store';
import { exportToFile, buildExportData, generateExportFileName, formatDateTime } from '../utils';
import { ANOMALY_TYPE_MAPPING, ANOMALY_STATUS_MAPPING } from '../constants';
import { ExportFormat } from '../types';
import {
  ArrowLeft, Download, Eye, FileSpreadsheet, FileText, Users, Code,
  CheckCircle2, AlertTriangle, Info
} from 'lucide-react';

interface ExportPageProps {
  onNavigate: (path: string) => void;
}

export function ExportPage({ onNavigate }: ExportPageProps) {
  const { batchId } = useParams();
  const {
    batches,
    getCurrentRun,
    getRunClusters,
    getRunAnomalies,
    getRunSamples,
    corrections,
    selectRun,
    getBatchRuns
  } = useWorkflowStore();

  const batch = batches.find(b => b.id === batchId);
  const currentRun = getCurrentRun();
  const runs = getBatchRuns(batchId ?? '');

  const [format, setFormat] = useState<ExportFormat>({
    type: 'friendly',
    fileFormat: 'xlsx'
  });

  const clusters = currentRun ? getRunClusters(currentRun.id) : [];
  const anomalies = currentRun ? getRunAnomalies(currentRun.id) : [];
  const samples = currentRun ? getRunSamples(currentRun.id) : [];
  const runCorrections = currentRun ? corrections.filter(c => c.runId === currentRun.id) : [];

  const previewData = useMemo(() => {
    if (!currentRun) return [];
    return buildExportData(currentRun, clusters, anomalies, samples, runCorrections, format).data.slice(0, 8);
  }, [currentRun, clusters, anomalies, samples, runCorrections, format]);

  const previewColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  const handleExport = () => {
    if (!batch || !currentRun) return;
    exportToFile(batch, currentRun, clusters, anomalies, samples, runCorrections, format);
  };

  const fileName = batch && currentRun ? generateExportFileName(batch, currentRun, format) : '';

  if (!batch) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        未找到指定批次
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <button
          onClick={() => onNavigate(`/batch/${batchId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft size={14} />
          返回聚类工作台
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-mono text-xl font-bold text-slate-100">导出报告中心</h1>
            <div className="text-xs text-slate-500 font-mono mt-1">{batch.name}</div>
          </div>
          <button
            onClick={handleExport}
            disabled={!currentRun || anomalies.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded font-medium transition-all ${
              !currentRun || anomalies.length === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500'
            }`}
          >
            <Download size={15} />
            下载文件
          </button>
        </div>

        {runs.length > 0 && (
          <div className="mt-4">
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">选择运行版本</label>
            <div className="flex flex-wrap gap-2">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => selectRun(run.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
                    currentRun?.id === run.id
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  run v{run.version} · {run.promptVersion} · {formatDateTime(run.executedAt)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-mono text-sm font-semibold text-slate-200 mb-1">导出配置</h3>
              <p className="text-xs text-slate-500">文件名会自动区分运行版本与时间戳，避免多次运行的结果混淆</p>
            </div>
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded">
                <FileSpreadsheet size={14} className="text-cyan-400" />
                <span className="font-mono text-xs text-slate-300">{fileName}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs text-slate-400 block mb-2 font-medium">报告类型</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat(f => ({ ...f, type: 'friendly' }))}
                  className={`p-3 rounded border text-left transition-all ${
                    format.type === 'friendly'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Users size={16} className="mb-1.5" />
                  <div className="text-xs font-medium">友好格式</div>
                  <div className="text-[10px] mt-0.5 opacity-70">给非技术人员看，全中文说明</div>
                </button>
                <button
                  onClick={() => setFormat(f => ({ ...f, type: 'technical' }))}
                  className={`p-3 rounded border text-left transition-all ${
                    format.type === 'technical'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Code size={16} className="mb-1.5" />
                  <div className="text-xs font-medium">技术格式</div>
                  <div className="text-[10px] mt-0.5 opacity-70">给工程师看，原始字段和编码</div>
                </button>
              </div>

              {format.type === 'friendly' && (
                <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
                  <div className="flex items-start gap-2">
                    <Info size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-slate-300 leading-relaxed">
                      友好格式会将「训练验证泄漏」等异常名称和字段名翻译为自然语言描述，如「训练验证数据重叠」，
                      并附带易懂的原因说明与处理建议。不懂代码的同事也能看懂。
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-2 font-medium">文件格式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormat(f => ({ ...f, fileFormat: 'xlsx' }))}
                  className={`p-3 rounded border text-left transition-all ${
                    format.fileFormat === 'xlsx'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <FileSpreadsheet size={16} className="mb-1.5" />
                  <div className="text-xs font-medium">Excel (.xlsx)</div>
                  <div className="text-[10px] mt-0.5 opacity-70">推荐，兼容性好</div>
                </button>
                <button
                  onClick={() => setFormat(f => ({ ...f, fileFormat: 'csv' }))}
                  className={`p-3 rounded border text-left transition-all ${
                    format.fileFormat === 'csv'
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <FileText size={16} className="mb-1.5" />
                  <div className="text-xs font-medium">CSV (.csv)</div>
                  <div className="text-[10px] mt-0.5 opacity-70">纯文本，通用格式</div>
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">将导出异常数</span>
                  <span className="font-mono text-slate-200">{anomalies.length} 条</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">已处理</span>
                  <span className="font-mono text-emerald-400">
                    {anomalies.filter(a => a.status === 'fixed' || a.status === 'rejected').length} 条
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">待处理</span>
                  <span className="font-mono text-amber-400">
                    {anomalies.filter(a => a.status === 'pending').length} 条
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-mono text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Eye size={14} className="text-cyan-500" />
              导出预览（前 8 条）
            </h3>
            <span className="text-[11px] text-slate-500">
              实际文件包含全部 {anomalies.length} 条数据
            </span>
          </div>

          {previewData.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              暂无数据可预览
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/50">
                  <tr>
                    {previewColumns.map(col => (
                      <th key={col} className="text-left px-4 py-2.5 text-slate-400 font-medium border-b border-slate-800 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      {previewColumns.map(col => {
                        const val = row[col];
                        const displayVal = typeof val === 'boolean' ? (val ? '是' : '否') : String(val ?? '-');
                        return (
                          <td key={col} className="px-4 py-2.5 text-slate-300 max-w-xs truncate">
                            {format.type === 'friendly' && col === '异常类型' ? (
                              <span className="inline-flex items-center gap-1">
                                {val === '训练验证数据重叠' && <AlertTriangle size={11} className="text-rose-400" />}
                                {val === '重复样本' && <AlertTriangle size={11} className="text-amber-400" />}
                                {val === '标签噪声' && <AlertTriangle size={11} className="text-amber-400" />}
                                {val === '数据分布偏移' && <AlertTriangle size={11} className="text-cyan-400" />}
                                {val === '文本长度异常' && <AlertTriangle size={11} className="text-slate-400" />}
                                <span>{displayVal}</span>
                              </span>
                            ) : format.type === 'friendly' && col === '状态' ? (
                              <span>{displayVal}</span>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {format.type === 'friendly' && clusters.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded p-5">
            <h3 className="font-mono text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              异常类型说明摘要（友好格式附带）
            </h3>
            <div className="space-y-2">
              {Array.from(new Set(clusters.map(c => c.anomalyType))).map(type => {
                const info = ANOMALY_TYPE_MAPPING[type];
                const sampleCluster = clusters.find(c => c.anomalyType === type);
                return (
                  <div key={type} className={`p-3 rounded border ${info.bgColor}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${info.bgColor} ${info.color}`}>
                        {info.title}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        共 {clusters.filter(c => c.anomalyType === type).reduce((s, c) => s + c.size, 0)} 条样本
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">
                      {info.description}
                    </div>
                    <div className="text-xs text-emerald-400 mt-1.5">{info.suggestion}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
