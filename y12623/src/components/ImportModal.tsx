import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFile, importSample, importResult, loading, clearImportResult } = useStore();

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      clearImportResult();
      await importFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      clearImportResult();
      await importFile(file);
    }
  };

  const handleSampleImport = async () => {
    clearImportResult();
    await importSample();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-mono text-lg font-semibold text-slate-900">导入标注草稿</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {!importResult ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? 'border-industrial-500 bg-industrial-50' : 'border-slate-300 hover:border-industrial-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-industrial-600' : 'text-slate-400'}`} />
                <p className="text-slate-600 mb-2">拖拽文件到此处或点击选择</p>
                <p className="text-sm text-slate-400">支持 .xlsx, .xls, .csv 格式</p>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">或</span>
                  </div>
                </div>

                <button
                  onClick={handleSampleImport}
                  disabled={loading}
                  className="w-full mt-4 btn"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  导入样例数据（快速体验）
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-600">
                <p className="font-medium mb-1">Excel 列名要求：</p>
                <p>批次号、月台号、车牌号、草图、来源、评分、评分说明、评分人</p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                <Check className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800">导入完成</p>
                  <p className="text-sm text-emerald-600">共处理 {importResult.total} 条记录</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded">
                  <p className="text-2xl font-mono font-semibold text-emerald-600">{importResult.success}</p>
                  <p className="text-xs text-slate-500">新增</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded">
                  <p className="text-2xl font-mono font-semibold text-industrial-600">{importResult.duplicates}</p>
                  <p className="text-xs text-slate-500">补录合并</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded">
                  <p className="text-2xl font-mono font-semibold text-amber-600">{importResult.anomalies}</p>
                  <p className="text-xs text-slate-500">异常</p>
                </div>
              </div>

              {importResult.anomalies > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">检测到异常记录</p>
                    <p className="text-xs text-amber-600">请前往异常筛选页处理</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={clearImportResult} className="flex-1 btn">
                  继续导入
                </button>
                <button onClick={onClose} className="flex-1 btn btn-primary">
                  完成
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-4">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-industrial-600 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">正在处理数据...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
