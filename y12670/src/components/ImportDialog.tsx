import React, { useRef, useState } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileJson,
  Download,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { parseImportFile, validateMeasurement, checkDuplicate, computeImportHash } from '@/utils/validation';
import { generateSampleImportJSON } from '@/utils/mockData';
import { MeasurementRecord, ImportResult, ValidationError } from '@/types';

const ImportDialog: React.FC = () => {
  const {
    records,
    importDialogVisible,
    lastImportResult,
    addRecord,
    setStatusMessage,
    setImportDialogVisible,
    setLastImportResult,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeDialog = () => {
    setImportDialogVisible(false);
    setLastImportResult(null);
  };

  const handleFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    const files = Array.from(fileList);
    const allRecords: MeasurementRecord[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const allErrors: ValidationError[] = [];

    for (const file of files) {
      const parsed = await parseImportFile(file);
      if (!parsed.success) {
        allErrors.push(...parsed.errors);
        skipped.push({ name: file.name, reason: '解析失败，请检查文件格式' });
        continue;
      }

      for (const partial of parsed.data || []) {
        const hash = computeImportHash(partial);
        
        const tempRecord: MeasurementRecord = {
          id: partial.id || `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: partial.name || '未命名记录',
          timestamp: partial.timestamp || new Date().toISOString(),
          status: 'valid',
          errors: [],
          slices: partial.slices || [],
          unit: partial.unit || 'm',
          expectedValueRange: partial.expectedValueRange,
          metadata: partial.metadata || {},
          importHash: hash,
        };

        const duplicate = checkDuplicate(tempRecord, [...records, ...allRecords]);
        if (duplicate.isDuplicate) {
          skipped.push({
            name: tempRecord.name,
            reason: duplicate.reason || '疑似重复记录',
          });
          continue;
        }

        const validation = validateMeasurement(tempRecord);
        if (!validation.valid) {
          tempRecord.errors = validation.errors.filter((e) => e.severity === 'error');
          tempRecord.status = 'invalid';
        } else if (validation.errors.length > 0) {
          tempRecord.errors = validation.errors;
          tempRecord.status = 'review';
        }

        allRecords.push(tempRecord);
      }
    }

    const result: ImportResult = {
      success: allRecords.length > 0,
      records: allRecords,
      skipped,
      errors: allErrors,
    };

    allRecords.forEach((r) => addRecord(r));
    setLastImportResult(result);
    setIsProcessing(false);

    if (allRecords.length > 0) {
      setStatusMessage(`成功导入 ${allRecords.length} 条记录${skipped.length > 0 ? `，跳过 ${skipped.length} 条重复或无效数据` : ''}`);
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      setStatusMessage('导入失败，没有有效的记录可添加');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const downloadSample = () => {
    const json = generateSampleImportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmr-sample-import.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('已下载示例 JSON 模板');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  if (!importDialogVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[560px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">导入测量记录</h2>
              <p className="text-xs text-slate-400">支持 JSON 格式的核磁共振切片数据</p>
            </div>
          </div>
          <button
            onClick={closeDialog}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!lastImportResult && (
            <>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {isProcessing ? (
                  <RefreshCw className="w-12 h-12 mx-auto mb-3 text-blue-400 animate-spin" />
                ) : (
                  <FileJson className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                )}
                <p className="text-sm text-slate-300 mb-1">
                  {isProcessing ? '正在解析文件...' : '拖拽 JSON 文件到此处，或点击选择'}
                </p>
                <p className="text-xs text-slate-500">支持批量导入，自动跳过重复数据</p>
              </div>

              <div className="mt-5 p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <h4 className="text-sm font-medium text-white">数据格式说明</h4>
                </div>
                <ul className="text-xs text-slate-400 space-y-1.5 ml-6">
                  <li>• 每条记录需包含 <code className="text-slate-300">name</code>、<code className="text-slate-300">timestamp</code>、<code className="text-slate-300">slices</code> 字段</li>
                  <li>• <code className="text-slate-300">slices</code> 为切片数组，每个切片需含 <code className="text-slate-300">depth</code> 和 <code className="text-slate-300">data</code>（二维数值矩阵）</li>
                  <li>• 深度单位支持：m、cm、mm、ft、in</li>
                  <li>• 数值默认范围 [0, 1]，超出范围会给出越界提示</li>
                </ul>
                <button
                  onClick={downloadSample}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载示例 JSON 模板
                </button>
              </div>

              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400">重复导入防护</h4>
                    <p className="text-xs text-yellow-200/70 mt-1">
                      系统会根据记录名称、时间和数据内容自动检测重复记录，重复数据将被跳过，不会造成数据混乱。
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {lastImportResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  lastImportResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
                )}>
                  {lastImportResult.success ? (
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {lastImportResult.success ? '导入完成' : '导入失败'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    成功导入 {lastImportResult.records.length} 条记录
                    {lastImportResult.skipped.length > 0 && `，跳过 ${lastImportResult.skipped.length} 条`}
                    {lastImportResult.errors.length > 0 && `，${lastImportResult.errors.length} 条错误`}
                  </p>
                </div>
              </div>

              {lastImportResult.records.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    已成功导入
                  </h4>
                  <ul className="space-y-1.5">
                    {lastImportResult.records.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate">{r.name}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded',
                          r.status === 'valid' && 'bg-green-900/50 text-green-400',
                          r.status === 'review' && 'bg-yellow-900/50 text-yellow-400',
                          r.status === 'invalid' && 'bg-red-900/50 text-red-400',
                        )}>
                          {r.status === 'valid' ? '可用' : r.status === 'review' ? '需复核' : '不可用'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lastImportResult.skipped.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    已跳过（{lastImportResult.skipped.length} 条）
                  </h4>
                  <ul className="space-y-1.5">
                    {lastImportResult.skipped.map((s, i) => (
                      <li key={i} className="text-xs">
                        <span className="text-slate-300">{s.name}</span>
                        <span className="text-yellow-300/70 ml-2">— {s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lastImportResult.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    错误详情（{lastImportResult.errors.length}）
                  </h4>
                  <ul className="space-y-2">
                    {lastImportResult.errors.map((e, i) => (
                      <li key={i} className="text-xs">
                        <div className="text-red-300">{e.message}</div>
                        {e.suggestion && (
                          <div className="text-red-300/60 mt-0.5 flex items-start gap-1">
                            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{e.suggestion}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setLastImportResult(null)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                继续导入
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={downloadSample}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button
            onClick={closeDialog}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
