import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Download, Check, X, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseCSV, exportBadRowsCSV, autoDetectFieldMapping } from '@/utils/dataCleaner';
import { detectAllAnomalies } from '@/utils/anomalyDetector';
import { cn } from '@/lib/utils';
import type { BadRowType, DataCleanResult } from '@/types';

const badRowTypeLabels: Record<BadRowType, string> = {
  empty: '空行',
  remark: '备注行',
  missing_column: '缺列行',
  invalid_value: '无效值',
};

const badRowTypeColors: Record<BadRowType, string> = {
  empty: '#9CA3AF',
  remark: '#60A5FA',
  missing_column: '#F59E0B',
  invalid_value: '#F53F3F',
};

export default function DataImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<DataCleanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setLuggageData,
    setAnomalies,
    setBadRows,
    badRows,
    luggageData,
    chuteModels,
    clearData,
    setDataLoaded,
  } = useAppStore();

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await parseCSV(file);
      setImportResult(result);

      if (result.validRows.length > 0) {
        setLuggageData(result.validRows);
        setBadRows(result.badRows);

        if (chuteModels.length > 0) {
          const anomalies = detectAllAnomalies(result.validRows, chuteModels[0]);
          setAnomalies(anomalies);
        }
        setDataLoaded(true);
      } else {
        setBadRows(result.badRows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleExportBadRows = () => {
    exportBadRowsCSV(badRows);
  };

  const handleLoadSample = () => {
    clearData();
    setTimeout(() => {
      setDataLoaded(true);
    }, 100);
  };

  const allBadRows = importResult?.badRows || badRows;
  const validCount = importResult?.validCount || luggageData.length;
  const totalCount = importResult?.totalRows || (luggageData.length + badRows.length);

  const badRowStats = allBadRows.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {} as Record<BadRowType, number>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据导入与清洗</h1>
          <p className="text-gray-400 mt-1">上传行李分拣数据，自动清洗和校验</p>
        </div>
        <button
          onClick={handleLoadSample}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={18} />
          加载示例数据
        </button>
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600 bg-gray-900/40'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={48} className="text-blue-500 animate-spin" />
            <p className="text-gray-300">正在处理数据...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4">
            <X size={48} className="text-red-500" />
            <p className="text-red-400">{error}</p>
            <p className="text-gray-500 text-sm">点击重新选择文件</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload
              size={48}
              className={isDragging ? 'text-blue-500' : 'text-gray-500'}
            />
            <div>
              <p className="text-lg text-white font-medium">
                拖拽文件到此处或点击上传
              </p>
              <p className="text-gray-500 mt-2">
                支持 CSV、TXT 格式，最大 50MB
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded">
                .csv
              </span>
              <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded">
                .txt
              </span>
            </div>
          </div>
        )}
      </div>

      {(validCount > 0 || allBadRows.length > 0) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Check size={24} className="text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">有效数据</p>
                <p className="text-2xl font-bold text-green-400">{validCount}</p>
              </div>
            </div>
            <div className="mt-3 text-gray-500 text-xs">
              占比: {totalCount > 0 ? ((validCount / totalCount) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">坏行数</p>
                <p className="text-2xl font-bold text-red-400">{allBadRows.length}</p>
              </div>
            </div>
            <div className="mt-3 text-gray-500 text-xs">
              占比: {totalCount > 0 ? ((allBadRows.length / totalCount) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">总行数</p>
                <p className="text-2xl font-bold text-white">{totalCount}</p>
              </div>
            </div>
            <button
              onClick={handleExportBadRows}
              disabled={allBadRows.length === 0}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              导出坏行记录
            </button>
          </div>
        </div>
      )}

      {allBadRows.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">坏行详情</h2>
            <div className="flex items-center gap-4">
              {(Object.keys(badRowStats) as BadRowType[]).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: badRowTypeColors[type] }}
                  />
                  <span className="text-gray-400 text-sm">
                    {badRowTypeLabels[type]}: {badRowStats[type]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">行号</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">类型</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">原始数据</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {allBadRows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-300 text-sm font-mono">
                      {row.rowIndex}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${badRowTypeColors[row.type]}20`,
                          color: badRowTypeColors[row.type],
                        }}
                      >
                        {badRowTypeLabels[row.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm font-mono max-w-xs truncate">
                      {row.rawData || '(空)'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {row.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">字段映射说明</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { field: 'timestamp', label: '时间戳', desc: '记录时间，支持日期格式或时间戳' },
            { field: 'chuteId', label: '滑槽ID', desc: '滑槽标识符，如 chute-001' },
            { field: 'position', label: '位置', desc: '行李在滑槽上的位置，单位米' },
            { field: 'height', label: '高度', desc: '行李高度，单位米' },
            { field: 'speed', label: '速度', desc: '行李移动速度，单位m/s' },
            { field: 'sortingPortId', label: '分拣口ID', desc: '可选，目标分拣口标识符' },
          ].map((item) => (
            <div key={item.field} className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <code className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded">
                  {item.field}
                </code>
                <span className="text-white text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
