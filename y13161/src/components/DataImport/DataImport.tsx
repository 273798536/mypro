import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSensorData } from '@/hooks/useSensorData';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';

interface DataImportProps {
  onImportComplete?: () => void;
}

export const DataImport: React.FC<DataImportProps> = ({ onImportComplete }) => {
  const { importFile, loadSampleData, isLoading } = useSensorData();
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    recordCount?: number;
    errorCount?: number;
  } | null>(null);

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

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      await processFile(files[0]);
    },
    [importFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      await processFile(files[0]);
    },
    [importFile]
  );

  const processFile = useCallback(
    async (file: File) => {
      try {
        setImportResult(null);
        const result = await importFile(file);

        setImportResult({
          success: result.errors.length === 0,
          message:
            result.errors.length > 0
              ? `导入完成，但存在${result.errors.length}条解析错误`
              : `成功导入${result.logs.length}条记录`,
          recordCount: result.logs.length,
          errorCount: result.errors.length,
        });

        onImportComplete?.();
      } catch (error) {
        setImportResult({
          success: false,
          message: `导入失败：${error}`,
        });
      }
    },
    [importFile, onImportComplete]
  );

  const handleLoadSample = useCallback(async () => {
    try {
      setImportResult(null);
      const result = await loadSampleData();

      setImportResult({
        success: result.errors.length === 0,
        message:
          result.errors.length > 0
            ? `样例数据加载完成，但存在${result.errors.length}条解析错误`
            : `成功加载样例数据${result.logs.length}条`,
        recordCount: result.logs.length,
        errorCount: result.errors.length,
      });

      onImportComplete?.();
    } catch (error) {
      setImportResult({
        success: false,
        message: `加载样例数据失败：${error}`,
      });
    }
  }, [loadSampleData, onImportComplete]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-ocean-400 bg-ocean-500/10'
            : 'border-deep-sea-400 hover:border-deep-sea-300 bg-deep-sea-700/30'
        }`}
      >
        <input
          type="file"
          accept=".csv,.json,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-deep-sea-200">正在处理数据...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload
              className={`w-12 h-12 ${
                isDragging ? 'text-ocean-400' : 'text-deep-sea-400'
              }`}
            />
            <div>
              <p className="text-deep-sea-100 font-medium">
                拖放传感器日志文件到此处
              </p>
              <p className="text-deep-sea-300 text-sm mt-1">
                或点击选择文件（支持 CSV、JSON、TXT 格式）
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleLoadSample}
          disabled={isLoading}
          className="flex-1 btn-secondary flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          加载样例数据
        </button>
      </div>

      {importResult && (
        <Alert
          type={importResult.success ? 'success' : 'warning'}
          title={importResult.success ? '导入成功' : '导入警告'}
          message={importResult.message}
        />
      )}

      {importResult?.errorCount && importResult.errorCount > 0 && (
        <div className="p-3 bg-deep-sea-700/50 rounded-lg border border-deep-sea-500">
          <div className="flex items-center gap-2 text-alert-yellow mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">解析错误详情</span>
          </div>
          <p className="text-xs text-deep-sea-300">
            部分记录未能正确解析，请检查原始数据格式。
          </p>
        </div>
      )}

      <div className="p-4 bg-deep-sea-700/30 rounded-lg border border-deep-sea-500">
        <h4 className="text-sm font-medium text-deep-sea-100 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-alert-cyan" />
          支持的格式说明
        </h4>
        <ul className="text-xs text-deep-sea-300 space-y-1">
          <li>• CSV: 包含时间戳、数值、单位、方向等字段</li>
          <li>• JSON: 数组格式，每项包含 timestamp 和各传感器数据</li>
          <li>• TXT: 每行一条记录，自动识别时间、数值和单位</li>
        </ul>
      </div>
    </div>
  );
};
