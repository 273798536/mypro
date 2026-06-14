import React, { useCallback, useState } from 'react';
import { Upload, FileText, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';

const DataUpload: React.FC = () => {
  const { parseAndLoadFile, loadSampleData, loadAltSampleData, rawLogs, fileName, fieldMappingResult } = useAnalysisStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      try {
        await parseAndLoadFile(files[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '文件解析失败');
      }
    },
    [parseAndLoadFile]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      try {
        await parseAndLoadFile(files[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '文件解析失败');
      }
    },
    [parseAndLoadFile]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-900" />
        数据导入
      </h2>

      <div
        className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.json"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">拖拽传感器日志文件到此处</p>
          <p className="text-gray-500 text-sm">或点击选择文件（支持 .csv, .json）</p>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {rawLogs.length > 0 && fieldMappingResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">数据加载成功</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>文件名: {fileName}</p>
            <p>记录数: {rawLogs.length} 条</p>
            <p className="text-xs text-green-600 mt-2">
              字段映射: 设备编号→"{fieldMappingResult.mapping.deviceId}" | 
              内阻→"{fieldMappingResult.mapping.resistance}" | 
              温度→"{fieldMappingResult.mapping.temperature}" | 
              时间→"{fieldMappingResult.mapping.timestamp}"
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-3">快速体验：</p>
        <div className="flex gap-3">
          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            加载样例数据（标准字段名）
          </button>
          <button
            onClick={loadAltSampleData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            加载样例数据（备用字段名）
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
