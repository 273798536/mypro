import React, { useState } from 'react';
import { X, Upload, File } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (files: FileList) => void;
  onImportSample: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImportFiles,
  onImportSample,
}) => {
  const [importMode, setImportMode] = useState<'ignore' | 'overwrite' | 'append'>('append');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { pointclouds } = useAppStore();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImport = () => {
    if (selectedFiles.length > 0) {
      const dt = new DataTransfer();
      selectedFiles.forEach((file) => dt.items.add(file));
      onImportFiles(dt.files);
    }
    setSelectedFiles([]);
    onClose();
  };

  const handleImportSample = () => {
    onImportSample();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">导入材料</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {pointclouds.length > 0 && (
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                重复导入处理策略
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode('ignore')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    importMode === 'ignore'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  忽略重复
                </button>
                <button
                  onClick={() => setImportMode('overwrite')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    importMode === 'overwrite'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  覆盖更新
                </button>
                <button
                  onClick={() => setImportMode('append')}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    importMode === 'append'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  追加导入
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {importMode === 'ignore' && '保留现有数据，忽略重复导入'}
                {importMode === 'overwrite' && '替换同名数据，覆盖更新'}
                {importMode === 'append' && '保留历史数据，追加新数据'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-2">点云文件</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-600'
              }`}
            >
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-400 mb-1">拖拽文件到此处或点击选择</p>
              <p className="text-xs text-slate-500">支持 PLY, LAS, LAZ, JSON 格式</p>
              <input
                type="file"
                accept=".ply,.las,.laz,.json"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm cursor-pointer transition-colors"
              >
                选择文件
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-slate-400"
                  >
                    <File size={12} />
                    <span>{file.name}</span>
                    <span className="text-slate-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400 mb-2">或使用示例数据</p>
            <button
              onClick={handleImportSample}
              className="w-full px-4 py-2 bg-emerald-900/50 border border-emerald-700 text-emerald-400 rounded text-sm hover:bg-emerald-900/70 transition-colors"
            >
              加载果园示例点云数据
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFiles.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
          >
            导入 ({selectedFiles.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
