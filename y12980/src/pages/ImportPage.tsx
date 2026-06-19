import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FileUp, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Database,
  FileText,
  Play,
  Clock,
  X,
  List,
  RefreshCw
} from 'lucide-react';
import { importApi } from '../services/api.js';
import type { ImportResult, SourceType, ImportBatch } from '../../shared/types.js';
import { SOURCE_TYPE_LABELS } from '../../shared/types.js';

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('SLOW_QUERY_LOG');
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; result: ImportResult } | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [showBatches, setShowBatches] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const data = await importApi.getBatches();
      setBatches(data);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setImportResult(null);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setImportResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await importApi.uploadFile(selectedFile, sourceType);
      setImportResult(result);
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDuplicateTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await importApi.runDuplicateTest();
      setTestResult(result);
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败');
    } finally {
      setIsRunningTest(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">数据导入</h2>
          <p className="text-sm text-slate-400 mt-1">支持慢查询日志和表结构快照导入，自动检测异常并保留原始行号</p>
        </div>
        <button
          onClick={() => setShowBatches(!showBatches)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
        >
          <List className="w-4 h-4" />
          {showBatches ? '隐藏批次' : '查看导入批次'}
        </button>
      </div>

      {showBatches && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden animate-fade-in-up">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">历史导入批次</h3>
            <button
              onClick={loadBatches}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">文件名</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">类型</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400">总记录</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400">新增</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400">重复</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400">异常</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">导入时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{batch.fileName}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{SOURCE_TYPE_LABELS[batch.sourceType]}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-center font-mono">{batch.totalRecords}</td>
                    <td className="px-4 py-3 text-sm text-emerald-400 text-center font-mono">{batch.newRecords}</td>
                    <td className="px-4 py-3 text-sm text-amber-400 text-center font-mono">{batch.duplicateRecords}</td>
                    <td className="px-4 py-3 text-sm text-red-400 text-center font-mono">{batch.anomalyCount}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(batch.importedAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-indigo-400" />
              选择文件类型
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSourceType('SLOW_QUERY_LOG')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === 'SLOW_QUERY_LOG'
                    ? 'bg-purple-500/10 border-purple-500/50'
                    : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/30'
                }`}
              >
                <Database className={`w-8 h-8 mb-2 ${sourceType === 'SLOW_QUERY_LOG' ? 'text-purple-400' : 'text-slate-500'}`} />
                <p className={`font-medium ${sourceType === 'SLOW_QUERY_LOG' ? 'text-purple-300' : 'text-slate-300'}`}>
                  慢查询日志
                </p>
                <p className="text-xs text-slate-500 mt-1">.log, .txt 格式</p>
              </button>
              <button
                onClick={() => setSourceType('SCHEMA_SNAPSHOT')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  sourceType === 'SCHEMA_SNAPSHOT'
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-slate-900/50 border-slate-700 hover:border-blue-500/30'
                }`}
              >
                <FileText className={`w-8 h-8 mb-2 ${sourceType === 'SCHEMA_SNAPSHOT' ? 'text-blue-400' : 'text-slate-500'}`} />
                <p className={`font-medium ${sourceType === 'SCHEMA_SNAPSHOT' ? 'text-blue-300' : 'text-slate-300'}`}>
                  表结构快照
                </p>
                <p className="text-xs text-slate-500 mt-1">.sql, .txt 格式</p>
              </button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".log,.sql,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); clearSelectedFile(); }}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  移除文件
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">拖拽文件到此处或点击选择</p>
                  <p className="text-sm text-slate-500 mt-1">
                    支持 {sourceType === 'SLOW_QUERY_LOG' ? '.log, .txt' : '.sql, .txt'} 格式
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  正在导入...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  开始导入
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">导入失败</p>
                  <p className="text-sm text-red-300/80 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {importResult && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">导入完成</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-200">{importResult.totalRecords}</p>
                  <p className="text-xs text-slate-500">总记录数</p>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{importResult.newRecords}</p>
                  <p className="text-xs text-slate-500">新增记录</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{importResult.duplicateRecords}</p>
                  <p className="text-xs text-slate-500">跳过重复</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{importResult.anomalyCount}</p>
                  <p className="text-xs text-slate-500">检测到异常</p>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                批次号: <span className="font-mono text-slate-300">{importResult.batchId}</span>
              </p>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-200">重复导入测试</h3>
            </div>
            <p className="text-sm text-amber-200/80 mb-4">
              运行专项测试，验证相同文件重复导入时的幂等性。系统应自动识别并跳过重复记录，避免数据混乱。
            </p>
            <button
              onClick={handleDuplicateTest}
              disabled={isRunningTest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isRunningTest ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  测试进行中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  运行重复导入测试
                </>
              )}
            </button>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className={`font-medium ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? '测试通过' : '测试失败'}
                </p>
                <p className="text-sm text-slate-400 mt-1">{testResult.message}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-amber-400">新增: {testResult.result.newRecords}</span>
                  <span className="text-emerald-400">跳过重复: {testResult.result.duplicateRecords}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">导入说明</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                自动保留原始行号和来源文件名，确保可追溯
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                智能识别慢查询冲突、表结构冲突、备份缺口等异常
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                重复导入自动幂等校验，相同记录不会重复入库
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                异常记录自动标记为"需DBA复核"，等待人工处理
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
