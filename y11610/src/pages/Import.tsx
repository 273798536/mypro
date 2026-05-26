import { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertCircle, Download } from 'lucide-react';
import { ImportType, IMPORT_TYPE_LABELS } from '../types';
import { parseCSV, downloadTemplate } from '../utils/csv';
import { importData, ImportResult } from '../services/importService';
import { useUIStore } from '../store/useUIStore';
import { useDataStore } from '../store/useDataStore';

export default function Import() {
  const [activeTab, setActiveTab] = useState<ImportType>('order');
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: Record<string, string>[];
  } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { showToast, setLoading } = useUIStore();
  const { refreshData } = useDataStore();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        await handleFile(files[0]);
      }
    },
    [activeTab]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      showToast('error', '请上传 CSV 格式的文件');
      return;
    }

    setLoading(true, '正在解析文件...');
    try {
      const result = await parseCSV(file);
      if (result.errors.length > 0) {
        showToast('warning', `解析完成，有 ${result.errors.length} 条警告`);
      }
      setPreviewData({
        headers: result.meta.headers,
        rows: result.data.slice(0, 10),
      });
      setImportResult(null);
    } catch (error) {
      showToast('error', '文件解析失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setLoading(true, '正在导入数据...');
    try {
      const mapping: Record<string, string> = {};
      const result = await importData(activeTab, previewData.rows, mapping);
      setImportResult(result);
      await refreshData();

      if (result.success > 0) {
        showToast('success', `成功导入 ${result.success} 条数据`);
      }
      if (result.failed > 0 || result.duplicates > 0) {
        showToast(
          'warning',
          `失败 ${result.failed} 条，重复 ${result.duplicates} 条`
        );
      }
    } catch (error) {
      showToast('error', '导入失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(activeTab);
    showToast('info', '模板下载成功');
  };

  const tabs: { type: ImportType; icon: typeof FileText; description: string }[] = [
    { type: 'order', icon: FileText, description: '客户订单信息' },
    { type: 'statement', icon: FileText, description: '银行收汇水单' },
    { type: 'bill', icon: FileText, description: '平台结算账单' },
    { type: 'rate', icon: FileText, description: '币种汇率数据' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">数据导入</h1>
        <button onClick={handleDownloadTemplate} className="btn btn-secondary text-sm">
          <Download size={16} />
          下载模板
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => {
              setActiveTab(tab.type);
              setPreviewData(null);
              setImportResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.type
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon size={18} />
            <span>{IMPORT_TYPE_LABELS[tab.type]}</span>
          </button>
        ))}
      </div>

      <div
        className={`card p-8 border-2 border-dashed rounded-xl text-center transition-all ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload size={48} className="text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            拖拽文件到此处或点击上传
          </p>
          <p className="text-sm text-gray-500 mb-4">
            支持 CSV 格式文件
          </p>
          <span className="btn btn-primary">选择文件</span>
        </label>
      </div>

      {previewData && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            数据预览
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPreviewData(null);
                setImportResult(null);
              }}
              className="btn btn-secondary text-sm"
            >
              重新选择
            </button>
            <button onClick={handleImport} className="btn btn-primary text-sm">
              确认导入
            </button>
          </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {previewData.headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left font-medium text-gray-600 bg-gray-50"
                  >
                    {header}
                  </th>
                ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-100 table-row-hover"
                  >
                    {previewData.headers.map((header, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 text-gray-700">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.rows.length >= 10 && (
            <p className="text-sm text-gray-500 mt-2">
              仅显示前 10 条预览数据
            </p>
          )}
        </div>
      )}

      {importResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
              <Check size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{importResult.success}</p>
              <p className="text-sm text-gray-500">成功导入</p>
            </div>
          </div>
          {importResult.failed > 0 && (
            <div className="card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {importResult.failed}
                </p>
                <p className="text-sm text-gray-500">导入失败</p>
              </div>
            </div>
          )}
          {importResult.duplicates > 0 && (
            <div className="card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
                <AlertCircle size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {importResult.duplicates}
                </p>
                <p className="text-sm text-gray-500">重复数据</p>
              </div>
            </div>
          )}
        </div>
      )}

      {importResult && importResult.errors.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">错误详情</h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {importResult.errors.slice(0, 20).map((error, i) => (
              <p key={i} className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded">
                {error}
              </p>
            ))}
            {importResult.errors.length > 20 && (
              <p className="text-sm text-gray-500">
              还有 {importResult.errors.length - 20} 条错误未显示
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
