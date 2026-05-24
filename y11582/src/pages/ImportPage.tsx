
import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { SourceType, ImportResult } from '../../shared/types';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const sourceTypeOptions: { value: SourceType; label: string }[] = [
  { value: 'recharge', label: '充值流水' },
  { value: 'refund', label: '退款申请' },
  { value: 'store_transfer', label: '门店交接表' },
  { value: 'supplier_statement', label: '供应商对账单' },
];

export function ImportPage() {
  const { importJson, loading, error, clearError } = useTaskStore();
  const [sourceType, setSourceType] = useState<SourceType>('recharge');
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = values[i]?.trim() || '';
        });
        return obj;
      });

      await useTaskStore.getState().importJson(sourceType, rows, file.name);
      
      setImportResult({
        success: rows.length,
        failed: 0,
        duplicates: 0,
        tasks: [],
        errors: [],
      });
    } catch (err) {
      console.error('Import error:', err);
    }
  };

  const loadSampleData = async () => {
    const sampleRows = [
      { memberId: 'M001', amount: '100', storeId: 'S001', 交易号: 'TXN001', 交易时间: '2024-01-15 10:30:00' },
      { memberId: 'M002', amount: '200', storeId: 'S001', 交易号: 'TXN002', 交易时间: '2024-01-15 11:00:00' },
      { memberId: 'M003', amount: '-50', storeId: 'S002', 交易号: 'TXN003', 交易时间: '2024-01-15 14:20:00' },
      { memberId: 'M004', amount: '150', storeId: 'S003', 交易号: 'TXN004', 交易时间: '2024-01-15 15:45:00' },
    ];

    await importJson(sourceType, sampleRows, 'sample_data.csv');
    setImportResult({
      success: 4,
      failed: 0,
      duplicates: 0,
      tasks: [],
      errors: [],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-800">回执导入</h3>
        <p className="text-sm text-slate-500">导入充值流水、退款申请、门店交接表等文件</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">来源类型</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sourceTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Upload className="text-slate-400" size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">拖拽文件到此处或点击上传</p>
              <p className="text-xs text-slate-500 mt-1">支持 CSV 格式文件</p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-sm text-slate-400">或</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          onClick={loadSampleData}
          disabled={loading}
          className="w-full py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FileText size={18} />
          加载示例数据进行测试
        </button>
      </div>

      {importResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-medium text-slate-800 mb-4">导入结果</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <p className="text-xs text-green-600">成功</p>
                <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-amber-600" size={20} />
              <div>
                <p className="text-xs text-amber-600">重复</p>
                <p className="text-2xl font-bold text-amber-700">{importResult.duplicates}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="text-red-600" size={20} />
              <div>
                <p className="text-xs text-red-600">失败</p>
                <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
              </div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-700 mb-2">错误详情:</p>
              <ul className="text-sm text-red-600 space-y-1">
                {importResult.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
