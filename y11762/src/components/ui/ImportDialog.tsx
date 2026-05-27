import { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { RegionData, ImportMode } from '../../types';
import Papa from 'papaparse';
import { Upload, X, FileUp, Eye, EyeOff } from 'lucide-react';

export default function ImportDialog() {
  const { showImport, setShowImport, importMode, setImportMode, importData, regions } = useStore();
  const [preview, setPreview] = useState<RegionData[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  if (!showImport) return null;

  const parseData = useCallback((text: string, fileName: string) => {
    setError('');
    try {
      let rows: Record<string, string>[];
      if (fileName.endsWith('.json')) {
        rows = JSON.parse(text);
      } else {
        const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        rows = result.data;
      }

      const mapped: RegionData[] = rows.map((row, i) => ({
        id: `import-${Date.now()}-${i}`,
        region: row['地区'] || row['region'] || `未知${i}`,
        policyCount: Number(row['保单数'] || row['policyCount'] || 0),
        claimRate: Number(row['出险率'] || row['claimRate'] || 0),
        premium: Number(row['保费'] || row['premium'] || 0),
        claimAmount: Number(row['赔付额'] || row['claimAmount'] || 0),
        actuarialNote: row['精算备注'] || row['actuarialNote'] || '',
        source: row['来源'] || row['source'] || fileName,
        revisionHistory: [],
      }));

      const duplicateCount = mapped.filter(m => regions.some(r => r.region === m.region)).length;
      if (duplicateCount > 0) {
        setError(`检测到 ${duplicateCount} 个重复地区，当前模式：${importMode === 'ignore' ? '忽略（跳过）' : importMode === 'overwrite' ? '覆盖（替换）' : '追加（合并）'}`);
      }

      setPreview(mapped);
    } catch (e) {
      setError('解析失败，请检查文件格式');
    }
  }, [importMode, regions]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseData(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (preview.length > 0) {
      importData(preview);
      setPreview([]);
      setError('');
      setShowImport(false);
    }
  };

  const modeDescriptions: Record<ImportMode, string> = {
    ignore: '遇到已存在地区时跳过，仅导入新地区',
    overwrite: '遇到已存在地区时替换数据，旧值记录到修订历史',
    append: '遇到已存在地区时合并数值，标记为"地区合并"异常',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowImport(false)}>
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-cyan-300">导入数据</h3>
          <button onClick={() => setShowImport(false)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <Upload size={32} className="mx-auto mb-3 text-slate-500" />
            <p className="text-sm text-slate-400">拖拽 CSV / JSON 文件到此处</p>
            <p className="text-xs text-slate-600 mt-1">或点击下方按钮选择文件</p>
            <label className="inline-block mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm cursor-pointer hover:bg-cyan-500/30 transition-colors">
              <FileUp size={14} className="inline mr-1.5" />
              选择文件
              <input type="file" accept=".csv,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2">导入模式</div>
            <div className="grid grid-cols-3 gap-2">
              {(['ignore', 'overwrite', 'append'] as ImportMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setImportMode(mode)}
                  className={`px-3 py-2.5 rounded-lg text-xs transition-all ${
                    importMode === mode
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="font-bold mb-0.5">
                    {mode === 'ignore' ? '忽略' : mode === 'overwrite' ? '覆盖' : '追加'}
                  </div>
                  <div className="opacity-70 text-[10px] leading-tight">{modeDescriptions[mode]}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              ⚠ {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div className="bg-slate-800/50 px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                <Eye size={12} />
                预览 ({preview.length} 条)
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/30 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">地区</th>
                      <th className="px-2 py-1.5 text-right">保单数</th>
                      <th className="px-2 py-1.5 text-right">出险率</th>
                      <th className="px-2 py-1.5 text-right">保费</th>
                      <th className="px-2 py-1.5 text-right">赔付额</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-slate-800/50">
                        <td className="px-2 py-1.5">{row.region}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{row.policyCount.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{(row.claimRate * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right font-mono">{row.premium.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{row.claimAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="text-xs text-slate-600 text-center py-1">...还有 {preview.length - 10} 条</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700/50">
          <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 transition-colors">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={preview.length === 0}
            className="px-4 py-2 text-sm bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            确认导入 ({preview.length} 条)
          </button>
        </div>
      </div>
    </div>
  );
}
