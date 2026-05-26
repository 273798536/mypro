import { useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { X, Upload, Info, Check, AlertTriangle } from 'lucide-react';
import { Material, ImportStrategy, ImportLogEntry } from '../types';

export default function ImportDialog() {
  const { showImportDialog, setShowImportDialog, importMaterials, materials } = useGameStore();
  const [fileContent, setFileContent] = useState<string>('');
  const [previewData, setPreviewData] = useState<Material[] | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>('ignore');
  const [importLogs, setImportLogs] = useState<ImportLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!showImportDialog) return null;
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setFileContent(content);
        const data = JSON.parse(content);
        
        if (Array.isArray(data)) {
          const validMaterials = data.filter(item =>
            item.id && item.name &&
            typeof item.costPerMeter === 'number' &&
            typeof item.maxCompression === 'number' &&
            typeof item.maxTension === 'number'
          );
          
          if (validMaterials.length === 0) {
            setError('JSON文件中没有找到有效的材料数据');
            setPreviewData(null);
          } else {
            setError(null);
            setPreviewData(validMaterials);
          }
        } else {
          setError('JSON格式不正确，应为数组');
          setPreviewData(null);
        }
      } catch (err) {
        setError('文件解析失败，请确保是有效的JSON文件');
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };
  
  const handleImport = () => {
    if (!previewData) return;
    
    const logs = importMaterials(previewData, strategy, '用户导入');
    setImportLogs(logs);
  };
  
  const handleClose = () => {
    setShowImportDialog(false);
    setFileContent('');
    setPreviewData(null);
    setImportLogs(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const getConflictInfo = () => {
    if (!previewData) return { conflicts: 0, new: 0 };
    let conflicts = 0;
    let newItems = 0;
    previewData.forEach(m => {
      if (materials.some(existing => existing.id === m.id)) {
        conflicts++;
      } else {
        newItems++;
      }
    });
    return { conflicts, new: newItems };
  };
  
  const conflictInfo = getConflictInfo();
  
  const strategyDescriptions: Record<ImportStrategy, string> = {
    ignore: '保留现有材料，忽略冲突的导入项',
    overwrite: '用导入材料覆盖冲突的现有材料',
    append: '保留两者，冲突项重命名后追加'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Upload className="text-cyan-400" size={24} />
            导入材料库
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!importLogs ? (
            <>
              <div className="mb-6">
                <label className="block text-slate-300 mb-2 font-medium">选择JSON文件</label>
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mx-auto text-slate-500 mb-2" size={32} />
                  <p className="text-slate-400">点击选择材料库JSON文件</p>
                  <p className="text-slate-500 text-sm mt-1">支持批量导入材料配置</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2 text-red-400">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {previewData && (
                <>
                  <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-white mb-3">导入预览</h3>
                    <div className="flex gap-6 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{previewData.length}</div>
                        <div className="text-xs text-slate-400">导入总数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{conflictInfo.new}</div>
                        <div className="text-xs text-slate-400">新增材料</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{conflictInfo.conflicts}</div>
                        <div className="text-xs text-slate-400">存在冲突</div>
                      </div>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {previewData.slice(0, 5).map((mat, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-slate-700/50 rounded-lg p-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: mat.color }}
                          />
                          <span className="text-white">{mat.name}</span>
                          <span className="text-slate-500 text-xs">({mat.id})</span>
                          {materials.some(m => m.id === mat.id) && (
                            <span className="ml-auto text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">冲突</span>
                          )}
                        </div>
                      ))}
                      {previewData.length > 5 && (
                        <div className="text-center text-slate-500 text-xs">
                          还有 {previewData.length - 5} 项材料...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-bold text-white mb-3">冲突处理策略</h3>
                    <div className="space-y-2">
                      {(['ignore', 'overwrite', 'append'] as ImportStrategy[]).map(s => (
                        <label
                          key={s}
                          className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            strategy === s
                              ? 'bg-cyan-500/20 border-2 border-cyan-500'
                              : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="strategy"
                            value={s}
                            checked={strategy === s}
                            onChange={() => setStrategy(s)}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-white">
                              {s === 'ignore' ? '忽略' : s === 'overwrite' ? '覆盖' : '追加'}
                            </div>
                            <div className="text-sm text-slate-400">{strategyDescriptions[s]}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleImport}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all shadow-lg shadow-cyan-500/30"
                  >
                    确认导入
                  </button>
                </>
              )}
            </>
          ) : (
            <div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                  <Check size={20} />
                  导入完成
                </div>
                <div className="text-sm text-green-300/80">
                  成功处理 {importLogs.length} 项材料
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className={`p-1.5 rounded ${
                      log.action === 'ignored' ? 'bg-slate-500/30' :
                      log.action === 'overwritten' ? 'bg-yellow-500/30' :
                      'bg-green-500/30'
                    }`}>
                      {log.action === 'ignored' ? <Info size={14} className="text-slate-400" /> :
                       log.action === 'overwritten' ? <AlertTriangle size={14} className="text-yellow-400" /> :
                       <Check size={14} className="text-green-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white">{log.materialId}</div>
                      <div className="text-xs text-slate-500">
                        {log.action === 'ignored' ? '已忽略' :
                         log.action === 'overwritten' ? '已覆盖' :
                         log.action === 'appended' ? '已添加' : '已更新'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
