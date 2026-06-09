import { useState, useMemo } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { useAnomalyStore } from '@/store/useAnomalyStore';
import { useCalculationStore } from '@/store/useCalculationStore';
import ExplanationCard from '@/components/ExplanationCard';
import AnomalyBadge from '@/components/AnomalyBadge';
import { formatDateTime, generateReportFileName } from '@/utils/export/fileNaming';
import {
  exportHtmlReport,
  exportCsvReport,
  exportJsonReport,
} from '@/utils/export/reportGenerator';
import type { BatchStatus } from '@/types';
import {
  FileText,
  FlaskConical,
  AlertTriangle,
  FileCode,
  FileSpreadsheet,
  Download,
  Eye,
  ChevronDown,
  Check,
  User,
  Clock,
  Layers,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ExportFormat = 'html' | 'csv' | 'json';

const statusConfig: Record<BatchStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  calculating: { label: '计算中', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-teal-600', bg: 'bg-teal-100' },
  has_anomaly: { label: '存在异常', color: 'text-red-600', bg: 'bg-red-100' },
};

const formatOptions: { value: ExportFormat; label: string; icon: typeof FileText; desc: string }[] = [
  { value: 'html', label: 'HTML 报告', icon: FileText, desc: '完整可视化报告，可直接在浏览器查看' },
  { value: 'csv', label: 'CSV 表格', icon: FileSpreadsheet, desc: '数据表格格式，可用 Excel 打开' },
  { value: 'json', label: 'JSON 数据', icon: FileCode, desc: '结构化数据，适合程序处理' },
];

export default function ResultReport() {
  const { batches, currentBatchId, currentBatch, setCurrentBatch } = useBatchStore();
  const { anomalies } = useAnomalyStore();
  const { results, runAllCalculations } = useCalculationStore();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [usePlainLanguage, setUsePlainLanguage] = useState(true);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);

  const batchAnomalies = useMemo(() => {
    if (!currentBatch) return [];
    const reagentIds = currentBatch.reagents.map((r) => r.id);
    return anomalies.filter((a) => reagentIds.includes(a.reagentId));
  }, [currentBatch, anomalies]);

  const batchResults = useMemo(() => {
    if (!currentBatch) return [];
    return results.filter(
      (r) => currentBatch.reagents.some((reagent) => r.rawData?.reagentName === reagent.name)
    );
  }, [currentBatch, results]);

  const handleRunCalculations = () => {
    if (!currentBatch) return;
    runAllCalculations(currentBatch);
  };

  const handleExport = () => {
    if (!currentBatch) return;
    if (exportFormat === 'html') {
      exportHtmlReport(currentBatch, batchAnomalies, batchResults, usePlainLanguage);
    } else if (exportFormat === 'csv') {
      exportCsvReport(currentBatch, batchAnomalies);
    } else {
      exportJsonReport(currentBatch, batchAnomalies, batchResults);
    }
  };

  const previewFileName = currentBatch ? generateReportFileName(currentBatch.id, exportFormat) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">结果与报告</h1>
          <p className="text-gray-500 mt-1">查看计算结果、异常数据并导出报告</p>
        </div>
        <div className="relative min-w-[280px]">
          <label className="block text-sm font-medium text-gray-600 mb-1.5">选择批次</label>
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 bg-white"
            onClick={() => setBatchDropdownOpen(!batchDropdownOpen)}
          >
            <span className="text-gray-800 flex items-center gap-2">
              <Layers size={16} className="text-[#0d9488]" />
              {currentBatch ? currentBatch.name : '请选择批次'}
            </span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
          {batchDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  className={cn(
                    'w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between',
                    currentBatchId === batch.id && 'bg-teal-50 text-[#0d9488]'
                  )}
                  onClick={() => {
                    setCurrentBatch(batch.id);
                    setBatchDropdownOpen(false);
                  }}
                >
                  <span>{batch.name}</span>
                  {currentBatchId === batch.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!currentBatch ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center text-gray-400">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请选择一个批次查看报告</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Layers size={18} className="text-[#1e3a5f]" />
                批次信息概览
              </h2>
              <span
                className={cn(
                  'text-xs px-3 py-1 rounded-full font-medium',
                  statusConfig[currentBatch.status].bg,
                  statusConfig[currentBatch.status].color
                )}
              >
                {statusConfig[currentBatch.status].label}
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User size={18} className="text-[#1e3a5f]" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">操作人员</div>
                  <div className="font-medium text-gray-800 mt-0.5">{currentBatch.operator}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <FlaskConical size={18} className="text-[#0d9488]" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">试剂数量</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {currentBatch.reagents.length} 个
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock size={18} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">创建时间</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {formatDateTime(currentBatch.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock size={18} className="text-gray-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">最后更新</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {formatDateTime(currentBatch.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
            {currentBatch.reagents.length > 0 && (
              <div className="px-5 pb-5">
                <div className="text-sm font-medium text-gray-600 mb-2">试剂清单</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-600">
                        <th className="px-3 py-2 font-medium">名称</th>
                        <th className="px-3 py-2 font-medium">浓度</th>
                        <th className="px-3 py-2 font-medium">温度</th>
                        <th className="px-3 py-2 font-medium">pH值</th>
                        <th className="px-3 py-2 font-medium">称量单号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBatch.reagents.map((r) => (
                        <tr key={r.id} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-800">
                            {r.name}
                            {r.formula && (
                              <span className="text-gray-400 ml-1">({r.formula})</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {r.concentration} {r.concentrationUnit}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{r.temperature}°C</td>
                          <td className="px-3 py-2 text-gray-600">{r.phValue}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {r.weighingRecord?.recordNumber || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText size={18} className="text-[#0d9488]" />
                  计算结果列表
                </h2>
                <button
                  className="text-sm text-[#0d9488] hover:text-[#0f766e] font-medium"
                  onClick={handleRunCalculations}
                >
                  运行全部计算
                </button>
              </div>
              <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
                {batchResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText size={36} className="mx-auto mb-3 text-gray-300" />
                    <p>暂无计算结果，点击上方按钮运行计算</p>
                  </div>
                ) : (
                  batchResults.map((result) => (
                    <ExplanationCard key={result.id} result={result} />
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  异常列表
                  <span className="text-sm font-normal text-gray-500">
                    （共 {batchAnomalies.length} 条）
                  </span>
                </h2>
              </div>
              <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
                {batchAnomalies.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Check size={36} className="mx-auto mb-3 text-teal-400" />
                    <p>本批次未检测到数据异常</p>
                  </div>
                ) : (
                  batchAnomalies.map((anomaly) => (
                    <AnomalyBadge key={anomaly.id} anomaly={anomaly} showDetail />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Shield size={18} className="text-[#1e3a5f]" />
                安全备注列表
              </h2>
            </div>
            <div className="p-5">
              {currentBatch.safetyNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Shield size={36} className="mx-auto mb-3 text-gray-300" />
                  <p>暂无安全备注</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentBatch.safetyNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
                    >
                      <p className="text-gray-700 leading-relaxed">{note.content}</p>
                      <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {note.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Download size={18} className="text-[#0d9488]" />
                导出报告
              </h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择导出格式
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'p-4 border rounded-xl text-left transition-all',
                        exportFormat === opt.value
                          ? 'border-[#0d9488] bg-teal-50 ring-2 ring-[#0d9488]/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                      onClick={() => setExportFormat(opt.value)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            exportFormat === opt.value ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          <opt.icon size={18} />
                        </div>
                        <div>
                          <div
                            className={cn(
                              'font-medium',
                              exportFormat === opt.value ? 'text-[#0d9488]' : 'text-gray-800'
                            )}
                          >
                            {opt.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {exportFormat === 'html' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePlainLanguage}
                      onChange={(e) => setUsePlainLanguage(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    <span className="text-sm text-gray-700">使用通俗语言描述</span>
                  </label>
                  <span className="text-xs text-gray-400">
                    （关闭后将使用技术术语输出）
                  </span>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
                <Eye size={18} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">文件名预览</div>
                  <div className="text-sm font-mono text-gray-700 truncate">
                    {previewFileName}
                  </div>
                </div>
              </div>

              <button
                className="w-full md:w-auto px-8 py-3 bg-[#0d9488] text-white rounded-xl hover:bg-[#0f766e] transition-colors font-medium flex items-center justify-center gap-2"
                onClick={handleExport}
              >
                <Download size={18} />
                导出报告
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
