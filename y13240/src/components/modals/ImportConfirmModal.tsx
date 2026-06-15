import { useState } from 'react';
import { X, Music, Calendar, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { ParsedAudioFile } from '@/types';
import { useStore } from '@/store';
import { formatDate } from '@/utils/fileParser';

interface ImportConfirmModalProps {
  files: ParsedAudioFile[];
  onConfirm: (importedBy: string) => void;
  onCancel: () => void;
}

export default function ImportConfirmModal({ files, onConfirm, onCancel }: ImportConfirmModalProps) {
  const [importedBy, setImportedBy] = useState('林姐');
  const records = useStore((state) => state.records);

  const getImportType = (file: ParsedAudioFile) => {
    if (!file.stallNumber) return 'new';
    const existing = records.find((r) => r.stallNumber === file.stallNumber);
    return existing ? 'update' : 'new';
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900">确认导入</h3>
            <p className="text-sm text-gray-500 mt-1">共 {files.length} 个音频文件</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 max-h-[50vh] overflow-y-auto scrollbar-thin space-y-3">
          {files.map((file, idx) => {
            const importType = getImportType(file);
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  importType === 'update'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-emerald-200 bg-emerald-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    importType === 'update' ? 'bg-amber-100' : 'bg-emerald-100'
                  }`}>
                    {importType === 'update' ? (
                      <RefreshCw className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Plus className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        importType === 'update'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {importType === 'update' ? '追加版本' : '新增记录'}
                      </span>
                      {file.stallNumber && (
                        <span className="text-sm font-medium text-gray-800">
                          摊位 {file.stallNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{file.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <Calendar className={`w-4 h-4 flex-shrink-0 ${
                        file.authorizationDate ? 'text-gray-400' : 'text-red-400'
                      }`} />
                      {file.authorizationDate ? (
                        <span className="text-gray-600">
                          授权至 {formatDate(file.authorizationDate)}
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          未找到授权期限
                        </span>
                      )}
                    </div>
                    {file.remark && (
                      <p className="mt-2 text-xs text-gray-500 bg-white/60 p-2 rounded-lg">
                        备注：{file.remark.slice(0, 100)}{file.remark.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              导入人
            </label>
            <input
              type="text"
              value={importedBy}
              onChange={(e) => setImportedBy(e.target.value)}
              className="input-field"
              placeholder="请输入您的姓名"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn-secondary">
              取消
            </button>
            <button
              onClick={() => onConfirm(importedBy)}
              className="flex-1 btn-primary"
              disabled={!importedBy.trim()}
            >
              确认导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
