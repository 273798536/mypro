import { useState, useRef } from 'react';
import { X, Check } from 'lucide-react';
import Papa from 'papaparse';
import { detectFieldMapping, parseCSVFile } from '../../utils/dataParser';
import { useStore } from '../../store/useStore';
import type { FuturesData } from '../../types';

const FIELD_OPTIONS = [
  { key: 'contractMonth', label: '合约月份', required: true },
  { key: 'price', label: '价格', required: true },
  { key: 'volume', label: '成交量', required: false },
  { key: 'basis', label: '基差', required: false },
  { key: 'timeWindow', label: '时间窗口', required: true },
  { key: 'notes', label: '研究备注', required: false },
  { key: 'source', label: '数据来源', required: false },
];

interface Props {
  file: File;
  onClose: () => void;
}

export default function FieldMapping({ file, onClose }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<{ originalRow: number; error: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const parsedRef = useRef(false);

  if (!parsedRef.current) {
    parsedRef.current = true;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const headers = results.meta.fields || [];
        const autoMapping = detectFieldMapping(headers);
        setHeaders(headers);
        setMapping(autoMapping);
        setPreviewRows(data.slice(0, 5));
      },
    });
  }

  const handleImport = async () => {
    setProcessing(true);
    try {
      const { rows, detections } = await parseCSVFile(file, mapping);
      const validRows = rows.map((r) => ({
        data: r.data as FuturesData | null,
        originalRow: r.originalRow,
        error: r.error,
      }));
      useStore.getState().importData(validRows);
      const errors = rows.filter((r) => r.error).map((r) => ({ originalRow: r.originalRow, error: r.error || '' }));
      setParseErrors(errors);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
      onClose();
    }
  };

  const requiredMissing = FIELD_OPTIONS.filter((f) => f.required && !mapping[f.key]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-200">字段映射</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">
              文件: <span className="text-slate-200">{file.name}</span>
            </div>
            {requiredMissing.length > 0 && (
              <div className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 mb-3">
                缺少必填字段映射: {requiredMissing.map((f) => f.label).join(', ')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">字段映射</div>
            <div className="space-y-2">
              {FIELD_OPTIONS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className={`w-24 text-sm ${field.required ? 'text-red-400' : 'text-slate-400'}`}>
                    {field.label}
                    {field.required && <span className="ml-0.5">*</span>}
                  </span>
                  <select
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={mapping[field.key] || ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    <option value="">-- 选择列 --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {mapping[field.key] && (
                    <Check size={14} className="text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {previewRows.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">数据预览</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {headers.map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800">
                        {headers.map((h) => (
                          <td key={h} className="px-2 py-1.5 text-slate-300 font-mono">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={requiredMissing.length > 0 || processing}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              requiredMissing.length > 0 || processing
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {processing ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  );
}