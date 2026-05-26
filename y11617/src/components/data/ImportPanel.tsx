import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import { parseCSV, parseJSON } from '../../utils/csvParser';
import type { ImportStrategy, CashflowEntry } from '../../types';

interface ImportPanelProps {
  onComplete?: () => void;
}

export default function ImportPanel({ onComplete }: ImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>('append');
  const [preview, setPreview] = useState<Omit<CashflowEntry, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; ignored: number; overwritten: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const importEntries = useCashflowStore(state => state.importEntries);

  const handleFile = useCallback((file: File) => {
    setFile(file);
    setImportResult(null);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();

      let result;
      if (extension === 'csv') {
        result = parseCSV(content);
      } else if (extension === 'json') {
        result = parseJSON(content);
      } else {
        setErrors(['不支持的文件格式，请使用CSV或JSON文件']);
        return;
      }

      setPreview(result.entries);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      }
    };
    reader.readAsText(file);
  }, []);

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
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleImport = useCallback(() => {
    if (preview.length === 0) return;

    const result = importEntries(preview, strategy);
    setImportResult(result);

    if (result.errors.length > 0) {
      setErrors(prev => [...prev, ...result.errors]);
    }

    setFile(null);
    setPreview([]);
    onComplete?.();
  }, [preview, strategy, importEntries, onComplete]);

  const strategyLabels: Record<ImportStrategy, { title: string; desc: string; icon: React.ReactNode }> = {
    ignore: {
      title: '忽略重复',
      desc: '跳过已存在的相同数据',
      icon: <XCircle size={16} className="text-gray-400" />
    },
    overwrite: {
      title: '覆盖重复',
      desc: '用新数据替换已存在的数据',
      icon: <AlertCircle size={16} className="text-yellow-500" />
    },
    append: {
      title: '追加导入',
      desc: '即使重复也添加为新条目',
      icon: <CheckCircle size={16} className="text-green-500" />
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Upload size={20} className="text-brand-primary" />
        <h3 className="font-semibold text-gray-800">数据导入</h3>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-brand-primary bg-brand-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <FileText size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            拖放文件到此处，或<span className="text-brand-primary">点击选择</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">支持 CSV 和 JSON 格式</p>
        </label>
      </div>

      {file && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-500" />
            <span className="text-sm text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-400">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            onClick={() => { setFile(null); setPreview([]); setErrors([]); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">导入策略</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(strategyLabels) as ImportStrategy[]).map(key => (
                <button
                  key={key}
                  onClick={() => setStrategy(key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    strategy === key
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {strategyLabels[key].icon}
                    <span className="text-sm font-medium text-gray-800">
                      {strategyLabels[key].title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{strategyLabels[key].desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              预览 ({preview.length} 条)
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">类型</th>
                    <th className="px-2 py-1.5 text-left">日期</th>
                    <th className="px-2 py-1.5 text-right">金额</th>
                    <th className="px-2 py-1.5 text-left">描述</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((entry, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{entry.type}</td>
                      <td className="px-2 py-1">{entry.date}</td>
                      <td className="px-2 py-1 text-right font-mono">
                        {entry.amount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 truncate max-w-32">{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div className="text-center text-xs text-gray-400 py-2 bg-gray-50">
                  还有 {preview.length - 20} 条未显示
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleImport}
            className="mt-4 w-full py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium"
          >
            确认导入 ({preview.length} 条)
          </button>
        </>
      )}

      {importResult && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 mb-1">
            <CheckCircle size={16} />
            <span className="font-medium">导入完成</span>
          </div>
          <div className="text-xs text-green-600 space-y-0.5">
            <p>新增: {importResult.imported} 条</p>
            {importResult.ignored > 0 && <p>忽略: {importResult.ignored} 条</p>}
            {importResult.overwritten > 0 && <p>覆盖: {importResult.overwritten} 条</p>}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-1">
            <AlertCircle size={16} />
            <span className="font-medium">警告</span>
          </div>
          <ul className="text-xs text-red-600 space-y-0.5">
            {errors.slice(0, 5).map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
            {errors.length > 5 && (
              <li>还有 {errors.length - 5} 条警告...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}