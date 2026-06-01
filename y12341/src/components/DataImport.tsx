import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseCSV, detectColumns } from '@/utils/csvParser';
import type { CSVMapping } from '@/types';

interface ImportMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function DataImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<ImportMessage[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const dispatch = useAppStore((state) => state.dispatch);

  const addMessage = useCallback((type: ImportMessage['type'], text: string) => {
    const id = Date.now();
    setMessages((prev) => [...prev, { type, text }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((_, i) => i !== 0));
    }, 5000);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        addMessage('error', `文件 ${file.name} 不是CSV格式`);
        return;
      }

      setIsParsing(true);
      try {
        const text = await file.text();
        const mapping = detectColumns(text);

        if (!mapping) {
          addMessage('error', `无法识别 ${file.name} 的列，请确保包含时间和温度列`);
          setIsParsing(false);
          return;
        }

        const result = parseCSV(text, file.name);

        if (result.errors.length > 0) {
          result.errors.forEach((err) => addMessage('error', err));
        }

        if (result.experiments.length > 0) {
          dispatch({ type: 'IMPORT_DATA', payload: result.experiments });
          addMessage(
            'success',
            `成功导入 ${result.experiments.length} 组实验数据（来自 ${file.name}）`
          );
        }
      } catch (error) {
        addMessage('error', `解析文件 ${file.name} 失败：${(error as Error).message}`);
      } finally {
        setIsParsing(false);
      }
    },
    [dispatch, addMessage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.csv'));
      if (files.length === 0) {
        addMessage('error', '请拖入CSV文件');
        return;
      }

      files.forEach(processFile);
    },
    [processFile, addMessage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) =>
        f.name.endsWith('.csv')
      );
      if (files.length === 0) {
        addMessage('error', '请选择CSV文件');
        return;
      }
      files.forEach(processFile);
      e.target.value = '';
    },
    [processFile, addMessage]
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          数据导入
        </h3>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {isParsing ? (
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            <span>正在解析...</span>
          </div>
        ) : (
          <>
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p className="text-slate-700 font-medium">
              拖入CSV文件，或点击选择文件
            </p>
            <p className="text-sm text-slate-500 mt-1">
              支持批量导入，自动识别时间、温度、材料、厚度、边界温度列
            </p>
          </>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600 mb-1">CSV格式示例：</p>
        <code className="bg-slate-100 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
          time(s),temperature(°C),material_id,thickness(m),boundary_temp(°C)
        </code>
      </div>

      <div className="mt-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 p-2 rounded text-sm animate-fadeIn ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : msg.type === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}
          >
            {msg.type === 'success' && (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            {msg.type === 'error' && (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span className="flex-1">{msg.text}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMessages((prev) => prev.filter((_, i) => i !== idx));
              }}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
