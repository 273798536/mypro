import React, { useState } from 'react';
import { Upload, X, FileJson, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { ImportMode, Patient, ImportResult } from '@/types';
import { importPatients, validatePatientData, getStoredPatients, downloadTemplate } from '@/utils/dataManager';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Patient[] | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const validation = validatePatientData(data);
        if (!validation.valid) {
          setError(`数据格式错误：${validation.errors.join('; ')}`);
          setPreviewData(null);
        } else {
          setPreviewData(data);
        }
      } catch (err) {
        setError('文件解析失败，请确保是有效的JSON文件');
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!previewData) return;

    setImporting(true);
    setError(null);

    try {
      const existingPatients = getStoredPatients();
      const result = importPatients(previewData, importMode, existingPatients);
      
      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(`导入失败：${result.errors.join('; ')}`);
      }
    } catch (err) {
      setError('导入过程中发生错误');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload size={24} />
            <h2 className="text-xl font-bold">导入患者数据</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择导入模式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'append', label: '追加', desc: '添加新数据，跳过重复ID' },
                { value: 'ignore', label: '忽略', desc: '保留原有数据，跳过重复ID' },
                { value: 'overwrite', label: '覆盖', desc: '删除原有数据，使用新数据' },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setImportMode(mode.value as ImportMode)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    importMode === mode.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-800">{mode.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择JSON文件
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileJson size={48} className="mx-auto mb-3 text-gray-400" />
                {selectedFile ? (
                  <div>
                    <p className="text-gray-800 font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">点击选择文件或拖拽到此处</p>
                )}
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={downloadTemplate}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Info size={14} />
                下载模板文件
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {previewData && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-green-500" />
                <p className="text-sm font-medium text-green-700">
                  数据验证通过，共 {previewData.length} 条记录
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">ID</th>
                      <th className="text-left py-1">姓名</th>
                      <th className="text-left py-1">年龄</th>
                      <th className="text-left py-1">优先级</th>
                      <th className="text-left py-1">来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((patient) => (
                      <tr key={patient.id} className="border-t border-gray-100">
                        <td className="py-1 text-gray-600">{patient.id.slice(0, 8)}...</td>
                        <td className="py-1 text-gray-800">{patient.name}</td>
                        <td className="py-1 text-gray-600">{patient.age}岁</td>
                        <td className="py-1">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600">
                            {patient.currentPriority}
                          </span>
                        </td>
                        <td className="py-1 text-gray-600">{patient.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    还有 {previewData.length - 5} 条记录未显示
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || importing}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {importing ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
