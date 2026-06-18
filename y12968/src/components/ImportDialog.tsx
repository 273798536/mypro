import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportDialog({ open, onClose }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ count: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFromFile = useLedgerStore((s) => s.importFromFile);

  if (!open) return null;

  const resetState = () => {
    setFile(null);
    setImporting(false);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const count = await importFromFile(file);
      setResult({ count });
    } catch (err) {
      setResult({ count: 0, error: err instanceof Error ? err.message : '导入失败' });
    } finally {
      setImporting(false);
    }
  };

  const TEMPLATE_HEADERS = [
    'view_name', 'refresh_time', 'anomaly_type', 'severity',
    'source_row_number', 'source_table', 'source_image', 'source_remark',
    'handling_opinion', 'conclusion', 'handler', 'handled_at',
    'ticket_id', 'ticket_summary', 'ticket_link', 'status', 'is_supplement',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
      <div className="card w-[560px] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-serif text-base font-semibold text-brand">导入刷新台账</h3>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div
            className="border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer hover:border-brand hover:bg-slate-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-brand">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-slate-700">点击选择或拖拽 CSV / Excel 文件</p>
                <p className="text-xs text-slate-400">支持 .csv, .xlsx, .xls 格式</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-start gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-slate-700">支持的列名（中英文均可）</p>
            </div>
            <p className="text-xs text-slate-500 font-mono leading-relaxed break-all">
              {TEMPLATE_HEADERS.join(' | ')}
            </p>
          </div>

          {result && (
            <div
              className={`p-3 text-sm flex items-start gap-2 ${
                result.error
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                {result.error ? (
                  <span>导入失败：{result.error}</span>
                ) : (
                  <span>成功导入 <strong>{result.count}</strong> 条记录</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button onClick={handleClose} className="btn">
            {result ? '完成' : '取消'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '导入中...' : '开始导入'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
