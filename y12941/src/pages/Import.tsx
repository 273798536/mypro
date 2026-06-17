import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FolderOpen,
  FileWarning
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { materialApi } from '../utils/api';
import { SOURCE_TYPE_LABELS } from '../../shared/types';
import type { MaterialSource } from '../../shared/types';

export const Import: React.FC = () => {
  const { batches, fetchBatches } = useStore();

  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<MaterialSource>('annotation');
  const [operator, setOperator] = useState('李运营');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setFile(files[0]);
      setResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await materialApi.importFile(file, sourceType, operator);
      setResult(data);
      await fetchBatches();
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setResult({
        success: false,
        error: '导入失败，请检查文件格式'
      });
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.csv') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      return FileSpreadsheet;
    }
    if (filename.endsWith('.json')) {
      return FileJson;
    }
    return FileText;
  };

  const sourceTypeOptions = Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({
    value: value as MaterialSource,
    label
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">材料导入</h1>
        <p className="text-gray-500 mt-1">导入标注记录、切分清单、训练样本等材料</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              上传材料
            </h3>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileSelect}
              />
              <FolderOpen className={`w-12 h-12 mx-auto mb-4 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {dragging ? '释放文件以上传' : '拖拽文件到此处'}
              </p>
              <p className="text-sm text-gray-500">
                或点击选择文件，支持 CSV、Excel、JSON 格式
              </p>
            </div>

            {file && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-4">
                  {(() => {
                    const Icon = getFileIcon(file.name);
                    return <Icon className="w-10 h-10 text-gray-400" />;
                  })()}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setResult(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  材料来源
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as MaterialSource)}
                >
                  {sourceTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  操作人
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="请输入操作人姓名"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    正在导入...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    开始导入
                  </>
                )}
              </button>
            </div>

            {result && (
              <div className={`mt-6 p-4 rounded-xl border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.success ? '导入成功' : '导入失败'}
                    </h4>
                    {result.success ? (
                      <>
                        <p className="text-sm text-green-700 mt-1">
                          成功导入 {result.data?.count || 0} 条数据
                        </p>
                        <p className="text-sm text-green-700">
                          批次号: <span className="font-mono">{result.data?.batchId}</span>
                        </p>
                        {result.data?.warnings && result.data.warnings.length > 0 && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm font-medium text-amber-800 flex items-center gap-1">
                              <FileWarning className="w-4 h-4" />
                              警告信息 ({result.data.warnings.length} 条)
                            </p>
                            <ul className="text-xs text-amber-700 mt-2 space-y-1">
                              {result.data.warnings.slice(0, 5).map((w: string, i: number) => (
                                <li key={i}>• {w}</li>
                              ))}
                              {result.data.warnings.length > 5 && (
                                <li className="text-amber-600">• ...还有 {result.data.warnings.length - 5} 条警告</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-red-700 mt-1">{result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-500" />
              数据格式说明
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">CSV / Excel</h4>
                <p className="text-xs text-gray-500 mb-2">必需字段：</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• id / conversation_id</li>
                  <li>• user_input / 用户输入</li>
                  <li>• intent / 意图</li>
                  <li>• confidence / 置信度</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <FileJson className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">JSON</h4>
                <p className="text-xs text-gray-500 mb-2">必需字段：</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• id: string</li>
                  <li>• userInput: string</li>
                  <li>• intent: string</li>
                  <li>• confidence: number</li>
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-6 h-6 text-amber-600 mb-2" />
                <h4 className="font-medium text-amber-800 mb-1">注意事项</h4>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• 空字段会被标记为坏数据</li>
                  <li>• 超长文本会自动截断</li>
                  <li>• 格式错误会记录位置</li>
                  <li>• 旧备注会被保留</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">导入历史</h3>
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 text-sm">{batch.batchName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    batch.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : batch.status === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {batch.status === 'completed' ? '已完成' :
                     batch.status === 'processing' ? '处理中' : '失败'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>类型: {SOURCE_TYPE_LABELS[batch.sourceType]}</p>
                  <p>数量: {batch.itemCount} 条</p>
                  <p>导入人: {batch.importedBy}</p>
                  <p>时间: {new Date(batch.importedAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
