import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DataSourceType } from '../../types';
import { processImport, downloadTemplate, detectFileType } from '../../engine/importParser';
import { useDataStore } from '../../store/useDataStore';
import { generateId } from '../../utils/dateUtils';

interface ImportCardProps {
  type: DataSourceType;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  latestVersion?: string;
}

const typeLabels: Record<DataSourceType, string> = {
  room: '排练室表',
  band: '乐队名单',
  course: '课程安排',
};

export function ImportCard({ type, title, description, icon, count, latestVersion }: ImportCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importData = useDataStore(state => state.importData);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const fileType = detectFileType(file);
    if (fileType === 'unknown') {
      setUploadResult({ success: false, message: '不支持的文件格式，请上传Excel或CSV文件' });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await processImport(type, file);

      if (result.errors.length > 0) {
        const errorPreview = result.errors.slice(0, 5).join('；');
        const moreHint = result.errors.length > 5 ? `（共 ${result.errors.length} 条错误）` : '';
        setUploadResult({
          success: false,
          message: `导入校验失败: ${errorPreview}${moreHint}`,
        });
        return;
      }

      if (result.data.length === 0) {
        setUploadResult({ success: false, message: '文件为空或解析失败' });
        return;
      }

      const sourceValue = source || '手动导入';
      const versionValue = version || `v${Date.now()}`;

      const typedData = result.data.map(item => ({
        ...item,
        id: generateId(),
      }));

      await importData(
        type,
        typedData as any,
        {
          name: file.name,
          source: sourceValue,
          version: versionValue,
        },
        result.rawData,
      );

      setUploadResult({
        success: true,
        message: `成功导入 ${result.data.length} 条${typeLabels[type]}数据`,
      });

      setSource('');
      setVersion('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : '导入失败',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(type);
  };

  return (
    <div className="card card-hover p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-700">
            {icon}
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-primary-900">{title}</h3>
            <p className="text-sm text-primary-600">{description}</p>
          </div>
        </div>
        {count > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-800">{count}</div>
            <div className="text-xs text-primary-500">条记录</div>
            {latestVersion && (
              <div className="text-xs text-success-dark mt-1">{latestVersion}</div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="数据来源（如：教务系统导出）"
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="w-32">
            <input
              type="text"
              placeholder="版本号"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-primary-200 hover:border-primary-400 hover:bg-primary-50/50'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <span className="text-sm text-primary-600">正在解析文件...</span>
            </div>
          ) : uploadResult ? (
            <div className={`flex flex-col items-center gap-2 ${
              uploadResult.success ? 'text-success-dark' : 'text-conflict-dark'
            }`}>
              {uploadResult.success ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertCircle className="w-8 h-8" />
              )}
              <span className="text-sm font-medium">{uploadResult.message}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-primary-400" />
              <div className="text-sm">
                <span className="text-primary-600 font-medium">点击上传</span>
                <span className="text-primary-500"> 或拖拽文件到此处</span>
              </div>
              <div className="text-xs text-primary-400 flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                支持 .xlsx, .xls, .csv 格式
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            选择文件
          </button>
        </div>
      </div>
    </div>
  );
}
