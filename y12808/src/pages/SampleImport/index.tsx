import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  ArrowRight,
  FileText,
  Database
} from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { parseExcelFile, parseCSVFile, detectFileType } from '@/utils/excelParser';
import { cleanData, getIssueCountBySeverity } from '@/utils/dataCleaner';
import { deduplicateSamples, generateDedupSummary } from '@/utils/dedup';
import type { RawSampleRow, CleanIssue, Sample, SourceTrace, ImportBatch } from '@/types';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'preview' | 'confirm' | 'success';

export default function SampleImport() {
  const navigate = useNavigate();
  const { samples, addSamples, addImportBatch, userRole } = useSampleStore();
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<RawSampleRow[]>([]);
  const [cleanedSamples, setCleanedSamples] = useState<Sample[]>([]);
  const [issues, setIssues] = useState<CleanIssue[]>([]);
  const [originalRowMap, setOriginalRowMap] = useState<Map<number, string>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dedupResult, setDedupResult] = useState<ReturnType<typeof deduplicateSamples> | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const fileType = detectFileType(file);

    if (fileType === 'unknown') {
      alert('请上传 Excel (.xlsx, .xls) 或 CSV 文件');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      let rows: RawSampleRow[];

      if (fileType === 'excel') {
        rows = await parseExcelFile(file);
      } else {
        rows = await parseCSVFile(file);
      }

      setRawRows(rows);

      const result = cleanData(rows);
      setCleanedSamples(result.cleaned);
      setIssues(result.issues);
      setOriginalRowMap(result.originalRowMap);

      const dedup = deduplicateSamples(result.cleaned, samples, [], {
        id: '',
        fileName: file.name,
        totalCount: rows.length,
        cleanedCount: result.cleaned.length,
        duplicateCount: 0,
        importTime: new Date().toISOString(),
        operator: '当前用户',
        isReimport: false
      });

      setDedupResult(dedup);
      setStep('preview');
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [samples]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleConfirmImport = () => {
    const batchId = `batch_${Date.now()}`;
    const now = new Date().toISOString();

    const newSourceTraces: SourceTrace[] = [];
    const allSamples = [...(dedupResult?.newSamples || []), ...(dedupResult?.updatedSamples || [])];

    allSamples.forEach((sample) => {
      let originalRow = 2;
      originalRowMap.forEach((id, row) => {
        if (id === sample.id || sample.barcode) {
          originalRow = row;
        }
      });

      const rawRow = rawRows.find(
        (r) => r.barcode?.trim() === sample.barcode && r.batchNo?.trim() === sample.batchNo
      );

      newSourceTraces.push({
        id: `st_${Date.now()}_${sample.barcode}`,
        sampleId: sample.id,
        originalRow: rawRows.indexOf(rawRow!) + 2 || 2,
        sourceFile: fileName,
        sourceRemark: rawRow?.remark || undefined,
        importBatchId: batchId
      });
    });

    const batch: ImportBatch = {
      id: batchId,
      fileName,
      totalCount: rawRows.length,
      cleanedCount: cleanedSamples.length,
      duplicateCount: dedupResult?.duplicateCount || 0,
      importTime: now,
      operator: '当前用户',
      isReimport: (dedupResult?.duplicateCount || 0) > 0
    };

    const newSamples = dedupResult?.newSamples || [];
    const updatedSamples = dedupResult?.updatedSamples || [];
    const allSamplesToAdd = [...newSamples, ...updatedSamples];

    addSamples(allSamplesToAdd, newSourceTraces, batch);
    setStep('success');
  };

  const issueCounts = getIssueCountBySeverity(issues);

  const severityConfig = {
    error: { label: '错误', icon: AlertCircle, color: 'rose', count: issueCounts.error },
    warning: { label: '警告', icon: AlertCircle, color: 'amber', count: issueCounts.warning },
    info: { label: '提示', icon: Info, color: 'blue', count: issueCounts.info }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['上传文件', '数据预览', '确认导入', '完成'].map((label, index) => {
            const stepOrder = ['upload', 'preview', 'confirm', 'success'];
            const currentIndex = stepOrder.indexOf(step);
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {isActive && index < currentIndex ? (
                    <CheckCircle size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'ml-2 text-sm',
                    isCurrent ? 'font-medium text-slate-800' : 'text-slate-400'
                  )}
                >
                  {label}
                </span>
                {index < 3 && <div className="w-12 h-px bg-slate-200 mx-3" />}
              </div>
            );
          })}
        </div>
      </div>

      {step === 'upload' && (
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-16 text-center transition-all',
            isDragging
              ? 'border-cyan-400 bg-cyan-50'
              : 'border-slate-300 hover:border-cyan-300 hover:bg-slate-50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-cyan-100 rounded-2xl flex items-center justify-center">
            <Upload size={40} className="text-cyan-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">上传样本清单</h3>
          <p className="text-slate-500 mb-6">
            拖拽文件到此处，或点击选择文件
            <br />
            支持 Excel (.xlsx, .xls) 和 CSV 格式
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 cursor-pointer transition-colors">
            <FileSpreadsheet size={20} />
            选择文件
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          {isLoading && (
            <div className="mt-6 text-slate-500">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2" />
              正在解析文件...
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{fileName}</h3>
                  <p className="text-sm text-slate-500">
                    共 {rawRows.length} 条原始记录
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep('upload')}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <X size={14} />
                重新选择
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <p className="text-sm text-emerald-600">有效记录</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {cleanedSamples.length}
                </p>
              </div>
              <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                <p className="text-sm text-rose-600">问题记录</p>
                <p className="text-2xl font-bold text-rose-700">
                  {rawRows.length - cleanedSamples.length}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-amber-600">重复条码</p>
                <p className="text-2xl font-bold text-amber-700">
                  {dedupResult?.duplicateCount || 0}
                </p>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-700 mb-3">数据问题摘要</h4>
                <div className="flex gap-4">
                  {Object.entries(severityConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <div
                        key={key}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg',
                          config.color === 'rose' && 'bg-rose-50 text-rose-600',
                          config.color === 'amber' && 'bg-amber-50 text-amber-600',
                          config.color === 'blue' && 'bg-blue-50 text-blue-600'
                        )}
                      >
                        <Icon size={16} />
                        <span className="text-sm">
                          {config.label}: {config.count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 max-h-40 overflow-auto bg-slate-50 rounded-lg p-3">
                  {issues.slice(0, 10).map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 py-1.5 text-sm"
                    >
                      <span className="text-slate-400 w-16">第{issue.row}行</span>
                      <span
                        className={cn(
                          'w-16',
                          issue.severity === 'error' && 'text-rose-600',
                          issue.severity === 'warning' && 'text-amber-600',
                          issue.severity === 'info' && 'text-blue-600'
                        )}
                      >
                        [{issue.field}]
                      </span>
                      <span className="text-slate-600">{issue.issue}</span>
                    </div>
                  ))}
                  {issues.length > 10 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      ...还有 {issues.length - 10} 条问题
                    </p>
                  )}
                </div>
              </div>
            )}

            {dedupResult && dedupResult.mergeDetails.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  重复条码处理说明
                </h4>
                <p className="text-sm text-amber-600 mb-3">
                  本次导入发现 {dedupResult.duplicateCount} 条重复条码，采用"合并补充"策略：
                  已有数据保留，新数据补充空字段，不会覆盖原有记录。
                </p>
                <div className="max-h-32 overflow-auto space-y-1">
                  {dedupResult.mergeDetails.slice(0, 5).map((detail, index) => (
                    <div
                      key={index}
                      className="text-xs text-amber-700 bg-white/50 rounded px-2 py-1"
                    >
                      条码 {detail.barcode}：补充{' '}
                      {detail.mergedFields.length > 0
                        ? detail.mergedFields.join('、')
                        : '无新信息'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={cleanedSamples.length === 0}
                className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                确认导入
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-medium text-slate-700">数据预览（前10条）</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      行号
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      条码
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      批次
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      类型
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cleanedSamples.slice(0, 10).map((sample, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">{index + 2}</td>
                      <td className="px-4 py-2 font-mono text-slate-700">
                        {sample.barcode}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{sample.batchNo}</td>
                      <td className="px-4 py-2 text-slate-600">{sample.sampleType}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          待检测
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle size={48} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">导入成功！</h3>
          <p className="text-slate-500 mb-8">
            {fileName} 已成功导入
            <br />
            新增 {dedupResult?.newSamples.length || 0} 条样本，合并补充{' '}
            {dedupResult?.updatedSamples.length || 0} 条已有样本
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              继续导入
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
            >
              <Database size={16} />
              查看样本列表
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
