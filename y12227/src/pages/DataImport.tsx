import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Tag, FileText, CheckCircle, AlertCircle, Clock, X, Plus } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../store/useStore';
import { formatFileSize, formatDate, getImportStatusLabel, generateId } from '../utils/format';
import { cn } from '../lib/utils';

export function DataImport() {
  const importFiles = useStore((state) => state.importFiles);
  const addImportFile = useStore((state) => state.addImportFile);
  const updateImportFileStatus = useStore((state) => state.updateImportFileStatus);
  const [activeTab, setActiveTab] = useState<'bill' | 'tag' | 'report'>('bill');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const newFile = {
          fileId: generateId(),
          fileName: file.name,
          fileType: activeTab,
          fileSize: file.size,
          uploadTime: new Date().toISOString(),
          status: 'uploading' as const,
        };
        addImportFile(newFile);

        setTimeout(() => {
          updateImportFileStatus(newFile.fileId, 'uploaded');
        }, 1000);

        setTimeout(() => {
          updateImportFileStatus(newFile.fileId, 'validating');
        }, 2000);

        setTimeout(() => {
          const hasConflict = Math.random() > 0.7;
          updateImportFileStatus(
            newFile.fileId,
            hasConflict ? 'success' : 'success',
            hasConflict ? Math.floor(Math.random() * 5) + 1 : 0
          );
        }, 3500);
      });
    },
    [activeTab, addImportFile, updateImportFileStatus]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
  });

  const tabs = [
    { key: 'bill', label: '云账号账单', icon: FileSpreadsheet, desc: '阿里云、腾讯云、AWS等账单' },
    { key: 'tag', label: '项目标签', icon: Tag, desc: '项目与资源标签映射关系' },
    { key: 'report', label: '消耗报告', icon: FileText, desc: '自定义消耗明细报告' },
  ];

  const filteredFiles = importFiles.filter((f) => f.fileType === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-100 text-success-700';
      case 'failed':
        return 'bg-danger-100 text-danger-700';
      case 'validating':
        return 'bg-primary-100 text-primary-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'validating':
      case 'uploading':
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入中心</h1>
          <p className="text-gray-500 mt-1">导入云账号账单、项目标签和消耗报告</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'bill' | 'tag' | 'report')}
                className={cn(
                  'flex-1 px-6 py-4 text-left transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary-50 border-b-2 border-primary-600'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      activeTab === tab.key ? 'text-primary-600' : 'text-gray-400'
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        activeTab === tab.key ? 'text-primary-700' : 'text-gray-700'
                      )}
                    >
                      {tab.label}
                    </p>
                    <p className="text-xs text-gray-500">{tab.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? '释放文件以上传' : '拖拽文件到此处'}
            </p>
            <p className="text-sm text-gray-500 mb-4">或点击选择文件</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" />
              选择文件
            </div>
            <p className="text-xs text-gray-400 mt-4">支持 .xlsx, .csv 格式</p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">已上传文件</h3>
            <span className="text-sm text-gray-500">共 {filteredFiles.length} 个文件</span>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>暂无上传记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.fileId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.fileSize)} · {formatDate(file.uploadTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {file.conflictCount && file.conflictCount > 0 && (
                      <span className="px-3 py-1 bg-warning-100 text-warning-700 text-sm rounded-full">
                        {file.conflictCount} 条数据冲突
                      </span>
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm',
                        getStatusColor(file.status)
                      )}
                    >
                      {getStatusIcon(file.status)}
                      {getImportStatusLabel(file.status)}
                    </span>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">导入注意事项</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 请确保导入文件格式与模板一致，避免列名或数据格式错误</li>
              <li>• 数据冲突不会自动覆盖，请在异常复核中人工确认处理方式</li>
              <li>• 标签缺失的资源将进入「待分摊」项目，需手动指定归属</li>
              <li>• 退款金额默认计入通用抵扣，如需指定项目请在异常复核中调整</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
