import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Settings,
  Play,
  Download,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseFile, autoDetectFieldMapping, formatFileSize } from '@/utils/fileParser';
import { generateDemoData, downloadDemoCSV } from '@/utils/demoData';
import { FieldMapping, DEFAULT_FIELD_MAPPING, RawDataRow, FileInfo } from '@/types';

export default function UploadPage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [previewRows, setPreviewRows] = useState<RawDataRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    setRawData,
    setFieldMapping,
    setFileInfo,
    setUploadProgress,
    setIsDemoMode,
    uploadProgress,
    fieldMapping,
    isAnalyzing,
    rawData,
    runAnalysis,
  } = useAppStore();

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsDemoMode(false);

    try {
      const firstPassReader = new FileReader();
      firstPassReader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').slice(0, 2);
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const detectedMapping = autoDetectFieldMapping(headers);
            setFieldMapping(detectedMapping);
          }
        } catch {}
      };

      if (file.name.toLowerCase().endsWith('.csv')) {
        firstPassReader.readAsText(file.slice(0, 1024));
      }

      const { rows, fileInfo } = await parseFile(file, fieldMapping, (progress) => {
        setUploadProgress(progress);
      });

      setRawData(rows);
      setFileInfo(fileInfo);
      setPreviewRows(rows.slice(0, 10));
      setShowFieldMapping(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
      setUploadProgress(0);
    }
  }, [fieldMapping, setFieldMapping, setRawData, setFileInfo, setUploadProgress, setIsDemoMode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleLoadDemo = () => {
    setError(null);
    const demoData = generateDemoData(60);
    const demoFileInfo: FileInfo = {
      name: '演示数据（含异常样例）',
      size: 10240,
      type: 'demo',
      columns: Object.values(fieldMapping),
      rowCount: demoData.length,
    };

    setRawData(demoData);
    setFileInfo(demoFileInfo);
    setPreviewRows(demoData.slice(0, 10));
    setIsDemoMode(true);
    setShowFieldMapping(true);
  };

  const handleFieldMappingChange = (key: keyof FieldMapping, value: string) => {
    setFieldMapping({ ...fieldMapping, [key]: value });
  };

  const handleStartAnalysis = () => {
    if (rawData.length === 0) {
      setError('请先上传数据文件或使用演示数据');
      return;
    }
    try {
      runAnalysis();
      navigate('/analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    }
  };

  const dirtyRowCount = previewRows.filter(r => r._isDirty).length;
  const validRowCount = previewRows.filter(r => !r._isDirty).length;

  const fieldLabels: Record<keyof FieldMapping, string> = {
    forecast: '预测值',
    actual: '真实销量',
    lowerBound: '预测下限',
    upperBound: '预测上限',
    category: '品类',
    date: '日期',
    isPromotion: '是否促销',
    remark: '备注',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">数据上传</h1>
        <p className="text-neutral-500">上传销量预测数据进行区间校准分析</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-500 hover:text-red-700 mt-1"
            >
              关闭提示
            </button>
          </div>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-neutral-300 hover:border-primary hover:bg-neutral-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
            isDragging ? 'bg-primary text-white scale-110' : 'bg-primary/10 text-primary'
          }`}>
            <Upload size={32} />
          </div>

          <h3 className="text-xl font-semibold text-neutral-800 mb-2">
            {isDragging ? '松开上传文件' : '拖拽文件到此处'}
          </h3>
          <p className="text-neutral-500 mb-4">
            或点击选择文件，支持 CSV、Excel 格式
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLoadDemo();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              <Sparkles size={18} />
              <span>使用演示数据</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadDemoCSV();
              }}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-neutral-300 text-neutral-600 rounded-lg font-medium hover:border-primary hover:text-primary transition-all duration-200"
            >
              <Download size={18} />
              <span>下载样例数据</span>
            </button>
          </div>
        </div>

        {uploadProgress > 0 && uploadProgress < 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200 rounded-b-2xl overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      {previewRows.length > 0 && (
        <div className="space-y-6 animate-slide-up">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-primary" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">数据预览</h3>
                  <p className="text-sm text-neutral-500">
                    共 {rawData.length} 行数据 · 有效 {validRowCount} 行 · 脏数据 {dirtyRowCount} 行
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFieldMapping(!showFieldMapping)}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              >
                <Settings size={18} />
                <span className="text-sm font-medium">字段映射</span>
              </button>
            </div>

            {showFieldMapping && (
              <div className="bg-neutral-50 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-neutral-700 mb-4">配置字段映射</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.keys(fieldLabels) as (keyof FieldMapping)[]).map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">
                        {fieldLabels[key]}
                      </label>
                      <input
                        type="text"
                        value={fieldMapping[key]}
                        onChange={(e) => handleFieldMappingChange(key, e.target.value)}
                        className="input-field text-sm"
                        placeholder="输入列名"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setFieldMapping(DEFAULT_FIELD_MAPPING)}
                    className="text-sm text-primary hover:text-primary-light font-medium"
                  >
                    恢复默认映射
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">行号</th>
                    <th className="table-header">品类</th>
                    <th className="table-header">日期</th>
                    <th className="table-header">预测值</th>
                    <th className="table-header">预测下限</th>
                    <th className="table-header">预测上限</th>
                    <th className="table-header">真实销量</th>
                    <th className="table-header">是否促销</th>
                    <th className="table-header">状态</th>
                    <th className="table-header">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} ${
                        row._isDirty ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="table-cell">{row.rowNumber}</td>
                      <td className="table-cell">{row.category || <span className="text-red-400">-</span>}</td>
                      <td className="table-cell">{row.date}</td>
                      <td className={`table-cell ${row.forecast === null ? 'text-red-400' : ''}`}>
                        {row.forecast ?? <span className="text-red-400">空</span>}
                      </td>
                      <td className={`table-cell ${row.lowerBound === null ? 'text-red-400' : ''}`}>
                        {row.lowerBound ?? <span className="text-red-400">空</span>}
                      </td>
                      <td className={`table-cell ${row.upperBound === null ? 'text-red-400' : ''}`}>
                        {row.upperBound ?? <span className="text-red-400">空</span>}
                      </td>
                      <td className={`table-cell ${row.actual === null ? 'text-red-400' : ''}`}>
                        {row.actual ?? <span className="text-red-400">空</span>}
                      </td>
                      <td className="table-cell">
                        {row.isPromotion ? (
                          <span className="tag-warning">是</span>
                        ) : (
                          <span className="text-neutral-400">否</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {row._isDirty ? (
                          <div className="flex items-center gap-1 text-red-500" title={row._errors.map(e => e.message).join('; ')}>
                            <AlertCircle size={14} />
                            <span className="text-xs">脏数据</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-500">
                            <CheckCircle2 size={14} />
                            <span className="text-xs">正常</span>
                          </div>
                        )}
                      </td>
                      <td className="table-cell max-w-[200px] truncate" title={row.remark}>
                        {row.remark || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rawData.length > 10 && (
              <p className="text-sm text-neutral-400 text-center mt-4">
                仅显示前 10 行，共 {rawData.length} 行数据
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || rawData.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} />
              <span>{isAnalyzing ? '分析中...' : '开始校准分析'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
