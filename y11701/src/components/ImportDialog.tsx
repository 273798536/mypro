import { useState } from 'react';
import type { ImportStrategy, Scheme } from '@/types';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (schemes: Scheme[], strategy: ImportStrategy) => void;
}

export default function ImportDialog({ open, onClose, onImport }: Props) {
  const [strategy, setStrategy] = useState<ImportStrategy>('ignore');
  const [fileContent, setFileContent] = useState<Scheme[] | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (!Array.isArray(data)) {
          setError('文件格式错误：需要方案数组');
          return;
        }
        setFileContent(data);
      } catch {
        setError('文件解析失败：无效的 JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (fileContent) {
      onImport(fileContent, strategy);
      setFileContent(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-amber-400">导入方案</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">选择文件</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFile}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            {fileContent && (
              <p className="text-xs text-emerald-400 mt-1">
                已读取 {fileContent.length} 个方案
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">导入策略</label>
            <div className="space-y-2">
              {[
                { key: 'ignore', label: '忽略重复', desc: 'ID 相同的方案跳过不导入' },
                { key: 'overwrite', label: '覆盖全部', desc: '清空现有方案，导入新方案' },
                { key: 'append', label: '追加副本', desc: '重命名为副本后追加导入' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    strategy === opt.key
                      ? 'border-amber-600 bg-amber-900/20'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === opt.key}
                    onChange={() => setStrategy(opt.key as ImportStrategy)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{opt.label}</div>
                    <div className="text-xs text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!fileContent}
            className="flex-1 px-4 py-2 text-sm bg-amber-600 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
