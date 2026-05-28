import { useState } from 'react';
import { X, Upload, FileJson, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { ImportMode, ImportResult } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { importData } = useNetworkStore();
  const [mode, setMode] = useState<ImportMode>('overwrite');
  const [source, setSource] = useState('');
  const [importText, setImportText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImportText(e.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleImport = () => {
    try {
      setError(null);
      const data = JSON.parse(importText);
      
      const importResult = importData(
        {
          nodes: data.scenario?.nodes || data.nodes,
          edges: data.scenario?.edges || data.edges,
          demands: data.scenario?.demands || data.demands
        },
        mode,
        source || 'import'
      );
      
      setResult(importResult);
    } catch (e) {
      setError('导入失败：JSON 格式错误，请检查数据格式');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">导入数据</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 导入模式选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              重复数据处理方式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'ignore', label: '忽略', desc: '保留现有' },
                { value: 'overwrite', label: '覆盖', desc: '替换现有' },
                { value: 'append', label: '追加', desc: '全部添加' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value as ImportMode)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    mode === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-slate-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 来源标注 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              数据来源（可选）
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="如：2024年Q1仓网规划_v2.xlsx"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 文件上传区域 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-slate-600 mb-2">
              拖拽文件到此处，或
              <label className="text-blue-600 hover:underline cursor-pointer ml-1">
                点击选择
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <FileJson className="w-4 h-4" /> JSON
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </span>
            </div>
          </div>

          {/* 粘贴文本区域 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              或粘贴 JSON 数据
            </label>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setResult(null); setError(null); }}
              placeholder='{"nodes": [...], "edges": [...], "demands": [...]}'
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 导入结果 */}
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700">导入成功</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">节点</div>
                  <div className="font-medium">
                    <span className="text-green-600">+{result.nodesAdded}</span>
                    {result.nodesUpdated > 0 && <span className="text-blue-600 ml-2">~{result.nodesUpdated}</span>}
                    {result.nodesIgnored > 0 && <span className="text-slate-400 ml-2">{result.nodesIgnored}忽略</span>}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">线路</div>
                  <div className="font-medium">
                    <span className="text-green-600">+{result.edgesAdded}</span>
                    {result.edgesUpdated > 0 && <span className="text-blue-600 ml-2">~{result.edgesUpdated}</span>}
                    {result.edgesIgnored > 0 && <span className="text-slate-400 ml-2">{result.edgesIgnored}忽略</span>}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">供需</div>
                  <div className="font-medium">
                    <span className="text-green-600">+{result.demandsAdded}</span>
                    {result.demandsUpdated > 0 && <span className="text-blue-600 ml-2">~{result.demandsUpdated}</span>}
                    {result.demandsIgnored > 0 && <span className="text-slate-400 ml-2">{result.demandsIgnored}忽略</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {result ? '关闭' : '取消'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
