import React, { useState, useRef } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ImportStrategy, ExperimentRecord, ImportResult } from '../../types';

interface DataImportProps {
  onImport: (data: ExperimentRecord[], strategy: ImportStrategy) => ImportResult;
  importStrategy: ImportStrategy;
  onStrategyChange: (strategy: ImportStrategy) => void;
}

export const DataImport: React.FC<DataImportProps> = ({
  onImport,
  importStrategy,
  onStrategyChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const records = Array.isArray(data) ? data : [data];
      const parsedRecords = records.map((record: any) => ({
        ...record,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        anomalies: record.anomalies?.map((a: any) => ({
          ...a,
          detectedAt: new Date(a.detectedAt),
        })) || [],
      }));

      const importResult = onImport(parsedRecords, importStrategy);
      setResult(importResult);
    } catch (err) {
      setError('文件格式错误，请确保是有效的JSON文件');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleFileUpload(file);
    } else {
      setError('请上传JSON格式的文件');
    }
  };

  const strategies: { value: ImportStrategy; label: string; desc: string }[] = [
    { value: 'ignore', label: '忽略', desc: '跳过已有数据' },
    { value: 'overwrite', label: '覆盖', desc: '替换已有数据' },
    { value: 'append', label: '追加', desc: '添加新版本' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-3">
        📥 数据导入
      </h2>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">重复数据处理策略</label>
        <div className="grid grid-cols-3 gap-2">
          {strategies.map((s) => (
            <button
              key={s.value}
              onClick={() => onStrategyChange(s.value)}
              className={`p-3 rounded-lg text-center transition-all ${
                importStrategy === s.value
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <div className="font-semibold text-sm">{s.label}</div>
              <div className={`text-xs mt-1 ${
                importStrategy === s.value ? 'text-primary-100' : 'text-slate-400'
              }`}>
                {s.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        <Upload className={`w-12 h-12 mx-auto mb-3 ${
          isDragging ? 'text-primary-500' : 'text-slate-400'
        }`} />
        <p className="text-slate-600 font-medium">
          拖拽JSON文件到此处，或点击选择文件
        </p>
        <p className="text-slate-400 text-sm mt-1">
          支持批量导入实验记录
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">导入完成</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">{result.totalRecords}</div>
              <div className="text-green-500">总计</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">{result.importedRecords}</div>
              <div className="text-blue-500">新增</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-amber-600">{result.overwrittenRecords}</div>
              <div className="text-amber-500">覆盖</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-slate-600">{result.skippedRecords}</div>
              <div className="text-slate-500">跳过</div>
            </div>
          </div>
          {result.anomalies.length > 0 && (
            <div className="text-amber-600 text-sm pt-2 border-t border-amber-200">
              ⚠️ 检测到 {result.anomalies.length} 条异常数据
            </div>
          )}
        </div>
      )}
    </div>
  );
};
