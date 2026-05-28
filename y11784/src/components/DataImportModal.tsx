import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileJson, FileSpreadsheet, AlertCircle, CheckCircle, Info, ChevronRight } from 'lucide-react';
import { usePathStore } from '@/store/pathStore';
import { useRevisionStore } from '@/store/revisionStore';
import { parseJsonData, parseCsvData, readFileAsText } from '@/utils/import/dataParser';
import { resolveConflicts, mergeData, getConflictDescription, getStrategyLabel, getStrategyDescription } from '@/utils/import/conflictResolver';
import type { ImportResult, ConflictStrategy, VectorField, Path } from '@/types';
import { cn } from '@/lib/utils';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'upload' | 'preview' | 'conflict' | 'complete';

export function DataImportModal({ isOpen, onClose }: DataImportModalProps) {
  const { vectorFields, paths, setVectorFields, setPaths } = usePathStore();
  const { addEntries } = useRevisionStore();

  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStrategy, setImportStrategy] = useState<ConflictStrategy>('ignore');
  const [resolvedData, setResolvedData] = useState<{ vectorFields: VectorField[]; paths: Path[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setImportResult(null);
    setResolvedData(null);
    setImportStrategy('ignore');
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const processFile = useCallback(async (file: File) => {
    const isJson = file.name.endsWith('.json');
    const isCsv = file.name.endsWith('.csv');

    if (!isJson && !isCsv) {
      setImportResult({
        vectorFields: [],
        paths: [],
        conflicts: [],
        errors: ['仅支持 JSON 和 CSV 格式文件'],
      });
      setStep('preview');
      return;
    }

    try {
      const content = await readFileAsText(file);
      const existingVfs = usePathStore.getState().vectorFields;
      const existingPaths = usePathStore.getState().paths;

      const result = isJson
        ? parseJsonData(content, existingVfs, existingPaths)
        : parseCsvData(content, existingVfs, existingPaths);

      setImportResult(result);
      setStep('preview');
    } catch (error) {
      setImportResult({
        vectorFields: [],
        paths: [],
        conflicts: [],
        errors: [`文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`],
      });
      setStep('preview');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleConflictStrategyChange = useCallback((strategy: ConflictStrategy) => {
    setImportStrategy(strategy);
    if (importResult) {
      const existingVfs = usePathStore.getState().vectorFields;
      const existingPaths = usePathStore.getState().paths;
      const resolved = resolveConflicts(importResult, existingVfs, existingPaths, strategy);
      setResolvedData(resolved);
    }
  }, [importResult]);

  const handleNextStep = useCallback(() => {
    if (step === 'preview' && importResult) {
      if (importResult.conflicts.length > 0) {
        setStep('conflict');
        handleConflictStrategyChange(importStrategy);
      } else {
        handleConfirmImport();
      }
    } else if (step === 'conflict') {
      handleConfirmImport();
    }
  }, [step, importResult, importStrategy, handleConflictStrategyChange]);

  const handleConfirmImport = useCallback(() => {
    if (!importResult) return;

    const existingVfs = usePathStore.getState().vectorFields;
    const existingPaths = usePathStore.getState().paths;

    let finalVfs: VectorField[];
    let finalPaths: Path[];

    if (resolvedData) {
      const merged = mergeData(existingVfs, existingPaths, resolvedData.vectorFields, resolvedData.paths, importStrategy);
      finalVfs = merged.vectorFields;
      finalPaths = merged.paths;
    } else {
      const merged = mergeData(existingVfs, existingPaths, importResult.vectorFields, importResult.paths, importStrategy);
      finalVfs = merged.vectorFields;
      finalPaths = merged.paths;
    }

    setVectorFields(finalVfs);
    setPaths(finalPaths);

    const revisionEntries = [
      ...importResult.vectorFields.map((vf) => ({
        targetType: 'vectorField' as const,
        targetId: vf.id,
        action: 'import' as const,
        previousValue: null,
        newValue: vf,
        source: vf.source,
        correctionNote: `导入策略: ${getStrategyLabel(importStrategy)}`,
      })),
      ...importResult.paths.map((path) => ({
        targetType: 'path' as const,
        targetId: path.id,
        action: 'import' as const,
        previousValue: null,
        newValue: path,
        source: path.source,
        correctionNote: `导入策略: ${getStrategyLabel(importStrategy)}`,
      })),
    ];

    addEntries(revisionEntries);
    setStep('complete');
  }, [importResult, resolvedData, importStrategy, setVectorFields, setPaths, addEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">批量导入数据</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-sm">
            {(['upload', 'preview', 'conflict', 'complete'] as const).map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                  step === s ? 'bg-blue-600 text-white' :
                  ['upload', 'preview', 'conflict', 'complete'].indexOf(step) > idx ? 'bg-green-500 text-white' :
                  'bg-slate-200 text-slate-500'
                )}>
                  {idx + 1}
                </div>
                <span className={cn(
                  'ml-2 text-xs',
                  step === s ? 'text-blue-600 font-medium' : 'text-slate-500'
                )}>
                  {s === 'upload' ? '上传文件' : s === 'preview' ? '预览数据' : s === 'conflict' ? '处理冲突' : '完成'}
                </span>
                {idx < 3 && <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              )}
            >
              <Upload className={cn(
                'w-12 h-12 mx-auto mb-4 transition-colors',
                isDragging ? 'text-blue-500' : 'text-slate-400'
              )} />
              <p className="text-slate-700 font-medium mb-1">
                拖拽文件到此处，或点击选择
              </p>
              <p className="text-sm text-slate-500 mb-4">
                支持 JSON 和 CSV 格式
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <FileJson className="w-4 h-4" />
                  <span>.json</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>.csv</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {step === 'preview' && importResult && (
            <div className="space-y-6">
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">解析错误</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-slate-800">向量场</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {importResult.vectorFields.length}
                  </p>
                  {importResult.vectorFields.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      {importResult.vectorFields.slice(0, 3).map((vf) => (
                        <div key={vf.id} className="truncate">• {vf.name}</div>
                      ))}
                      {importResult.vectorFields.length > 3 && (
                        <div>... 还有 {importResult.vectorFields.length - 3} 个</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-slate-800">路径</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {importResult.paths.length}
                  </p>
                  {importResult.paths.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      {importResult.paths.slice(0, 3).map((p) => (
                        <div key={p.id} className="truncate">• {p.name} ({p.nodes.length} 节点)</div>
                      ))}
                      {importResult.paths.length > 3 && (
                        <div>... 还有 {importResult.paths.length - 3} 个</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {importResult.conflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">检测到冲突</h4>
                      <p className="text-sm text-amber-700">
                        发现 {importResult.conflicts.length} 个数据冲突，下一步将选择处理策略
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">数据来源追踪</p>
                    <p>所有导入的数据将保留来源信息，并记录到修订历史中。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'conflict' && importResult && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-3">冲突处理策略</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['ignore', 'overwrite', 'append'] as const).map((strategy) => (
                    <button
                      key={strategy}
                      onClick={() => handleConflictStrategyChange(strategy)}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-all',
                        importStrategy === strategy
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="font-medium text-slate-900 mb-1">
                        {getStrategyLabel(strategy)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {getStrategyDescription(strategy)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-3">冲突列表</h3>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {importResult.conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-slate-700">
                          {getConflictDescription(conflict)}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {getStrategyLabel(importStrategy)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {resolvedData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="font-medium text-green-800">处理结果预览</span>
                      <p className="text-sm text-green-700">
                        将导入 {resolvedData.vectorFields.length} 个向量场，{resolvedData.paths.length} 条路径
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">导入完成</h3>
              <p className="text-slate-600 mb-6">
                数据已成功导入，所有操作已记录到修订历史
              </p>
              <div className="inline-flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <FileJson className="w-4 h-4" />
                  <span>向量场: {vectorFields.length} 个</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>路径: {paths.length} 条</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            {step === 'complete' ? '关闭' : '取消'}
          </button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                重新选择
              </button>
            )}
            {step === 'conflict' && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                返回预览
              </button>
            )}
            {step !== 'upload' && step !== 'complete' && importResult && importResult.errors.length === 0 && (
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {step === 'preview' && importResult.conflicts.length > 0 ? '处理冲突' :
                 step === 'conflict' ? '确认导入' : '确认导入'}
              </button>
            )}
            {step === 'complete' && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
