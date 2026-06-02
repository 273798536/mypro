import { useState, useRef, useCallback } from 'react';
import { Upload, Layers, Radiation, FileText, Plus, X, Filter, CheckCircle, AlertTriangle, FileUp, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, getSourceLabel, getSourceColor } from '../utils/colorUtils';
import { cn } from '../lib/utils';
import {
  importFiles,
  isSupportedFile,
  isOrganFile,
  inferVersionFromFilename,
  inferSourceFromFilename,
  getNextOrganColor,
  type ImportResult,
} from '../utils/importUtils';
import type { DataSource } from '../types';

type FileCategory = 'all' | 'organ' | 'dose' | 'note';

interface ImportEntry {
  file: File;
  result?: ImportResult;
  status: 'pending' | 'parsing' | 'success' | 'error';
  importType: 'organ' | 'dose';
  source: DataSource;
  version: string;
  linkedOrganId: string;
}

export function DataManagement() {
  const { organs, doses, notes, addOrgan, addDose } = useAppStore();
  const [category, setCategory] = useState<FileCategory>('all');
  const [sourceFilter, setSourceFilter] = useState<DataSource | 'all'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importEntries, setImportEntries] = useState<ImportEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOrgans = organs.filter(
    (o) => sourceFilter === 'all' || o.source === sourceFilter
  );
  const filteredDoses = doses.filter(
    (d) => sourceFilter === 'all' || d.source === sourceFilter
  );

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) => isSupportedFile(f.name));

    if (validFiles.length === 0) {
      return;
    }

    const newEntries: ImportEntry[] = validFiles.map((file) => ({
      file,
      status: 'pending' as const,
      importType: isOrganFile(file.name) ? 'organ' : 'dose',
      source: inferSourceFromFilename(file.name),
      version: inferVersionFromFilename(file.name),
      linkedOrganId: organs.length > 0 ? organs[0].id : '',
    }));

    setImportEntries((prev) => [...prev, ...newEntries]);
    setShowImportModal(true);
  }, [organs]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeEntry = useCallback((index: number) => {
    setImportEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateEntry = useCallback((index: number, updates: Partial<ImportEntry>) => {
    setImportEntries((prev) => prev.map((entry, i) => i === index ? { ...entry, ...updates } : entry));
  }, []);

  const processAndImport = useCallback(async () => {
    const pendingEntries = importEntries.filter((e) => e.status === 'pending');
    if (pendingEntries.length === 0) return;

    setIsProcessing(true);

    const files = pendingEntries.map((e) => e.file);
    const results = await importFiles(files);

    setImportEntries((prev) => {
      const newEntries = [...prev];
      let resultIdx = 0;
      for (let i = 0; i < newEntries.length; i++) {
        if (newEntries[i].status === 'pending') {
          const result = results[resultIdx++];
          newEntries[i] = {
            ...newEntries[i],
            result,
            status: result.success ? 'success' : 'error',
            importType: result.organ ? 'organ' : result.dose ? 'dose' : newEntries[i].importType,
          };
        }
      }
      return newEntries;
    });

    setIsProcessing(false);
  }, [importEntries]);

  const commitImport = useCallback(() => {
    const successEntries = importEntries.filter((e) => e.status === 'success' && e.result);

    for (const entry of successEntries) {
      if (entry.importType === 'organ' && entry.result?.organ) {
        const organ = entry.result.organ;
        addOrgan({
          name: organ.name,
          version: entry.version,
          source: entry.source,
          importTime: new Date(),
          importedBy: '当前用户',
          fileType: organ.fileType,
          filePath: organ.filePath,
          color: getNextOrganColor(),
          visible: true,
          opacity: 0.8,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          shapeType: organ.shapeType,
          size: organ.size,
        });
      } else if (entry.importType === 'dose' && entry.result?.dose) {
        const dose = entry.result.dose;
        addDose({
          name: dose.name,
          version: entry.version,
          organId: entry.linkedOrganId,
          source: entry.source,
          importTime: new Date(),
          importedBy: '当前用户',
          fileType: dose.fileType,
          minDose: dose.minDose,
          maxDose: dose.maxDose,
          meanDose: dose.meanDose,
          threshold: dose.threshold,
          visible: true,
          opacity: 0.6,
        });
      }
    }

    console.log(`[导入] 提交完成: ${successEntries.length}个文件成功导入`);
    setImportEntries([]);
    setShowImportModal(false);
  }, [importEntries, addOrgan, addDose]);

  const allParsed = importEntries.length > 0 && importEntries.every((e) => e.status === 'success' || e.status === 'error');
  const hasSuccess = importEntries.some((e) => e.status === 'success');
  const hasPending = importEntries.some((e) => e.status === 'pending');

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">数据管理</h1>
          <p className="text-slate-400 text-sm mt-1">管理器官模型、剂量网格和医生备注</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Upload size={18} />
            导入文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".obj,.stl,.dcm,.nrrd"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <button
            onClick={() => {
              setImportEntries([]);
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            手动添加
          </button>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all',
        )}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-40 bg-teal-500/10 border-2 border-dashed border-teal-400 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <FileUp size={48} className="mx-auto text-teal-400 mb-3" />
              <p className="text-teal-300 text-lg font-medium">释放文件以导入</p>
              <p className="text-teal-400/60 text-sm">支持 .obj, .stl, .dcm, .nrrd</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            {[
              { id: 'all', label: '全部' },
              { id: 'organ', label: '器官' },
              { id: 'dose', label: '剂量' },
              { id: 'note', label: '备注' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as FileCategory)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  category === cat.id
                    ? 'bg-teal-500 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as DataSource | 'all')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">全部来源</option>
              <option value="original">原始材料</option>
              <option value="processed">处理结果</option>
            </select>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6 overflow-auto">
          {(category === 'all' || category === 'organ') && (
            <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-teal-400" />
                  <h2 className="font-semibold text-white">器官模型</h2>
                </div>
                <span className="text-sm text-slate-400">{filteredOrgans.length} 个</span>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {filteredOrgans.map((organ) => (
                  <div
                    key={organ.id}
                    className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg"
                          style={{ backgroundColor: organ.color }}
                        />
                        <div>
                          <div className="font-medium text-white">{organ.name}</div>
                          <div className="text-xs text-slate-400">{organ.version} · {organ.fileType.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full text-white',
                        getSourceColor(organ.source)
                      )}>
                        {getSourceLabel(organ.source)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">导入者：</span>
                        <span className="text-slate-300">{organ.importedBy}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">时间：</span>
                        <span className="text-slate-300">{formatDate(organ.importTime)}</span>
                      </div>
                      {organ.size && (
                        <div className="col-span-2">
                          <span className="text-slate-500">尺寸：</span>
                          <span className="text-slate-300">{organ.size.map(d => d.toFixed(1)).join(' × ')} mm</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(category === 'all' || category === 'dose') && (
            <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radiation size={18} className="text-amber-400" />
                  <h2 className="font-semibold text-white">剂量网格</h2>
                </div>
                <span className="text-sm text-slate-400">{filteredDoses.length} 个</span>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {filteredDoses.map((dose) => {
                  const organ = organs.find((o) => o.id === dose.organId);
                  return (
                    <div
                      key={dose.id}
                      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-white">{dose.name}</div>
                          <div className="text-xs text-slate-400">
                            关联器官：{organ?.name || '未知'} · {dose.fileType.toUpperCase()}
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full text-white',
                          getSourceColor(dose.source)
                        )}>
                          {getSourceLabel(dose.source)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-slate-400">最小</div>
                          <div className="text-white">{dose.minDose.toFixed(1)}Gy</div>
                        </div>
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-slate-400">平均</div>
                          <div className="text-white">{dose.meanDose.toFixed(1)}Gy</div>
                        </div>
                        <div className="text-center p-2 bg-slate-700/50 rounded">
                          <div className="text-slate-400">最大</div>
                          <div className={dose.maxDose > dose.threshold ? 'text-red-400' : 'text-white'}>
                            {dose.maxDose.toFixed(1)}Gy
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        导入时间：{formatDate(dose.importTime)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(category === 'all' || category === 'note') && (
            <div className="col-span-2 bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-sky-400" />
                  <h2 className="font-semibold text-white">医生备注</h2>
                </div>
                <span className="text-sm text-slate-400">{notes.length} 条</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {notes.map((note) => {
                  const organ = organs.find((o) => o.id === note.organId);
                  const dose = doses.find((d) => d.id === note.doseId);
                  return (
                    <div
                      key={note.id}
                      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{note.author}</span>
                        <span className="text-xs text-slate-400">{formatDate(note.createTime)}</span>
                      </div>
                      <p className="text-slate-300 text-sm mb-3">{note.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {organ && (
                          <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded">
                            {organ.name}
                          </span>
                        )}
                        {dose && (
                          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            {dose.name}
                          </span>
                        )}
                        {note.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-white">导入数据</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  if (importEntries.length === 0) return;
                }}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragOver
                    ? 'border-teal-400 bg-teal-500/10'
                    : 'border-slate-700 hover:border-slate-500'
                )}
              >
                <Upload size={32} className="mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">拖拽文件到此处或点击上传</p>
                <p className="text-slate-600 text-xs mt-1">支持 .obj, .stl（器官模型） .dcm, .nrrd（剂量网格）</p>
              </div>

              {importEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-300">
                      待导入文件 ({importEntries.length})
                    </h4>
                    {hasPending && (
                      <button
                        onClick={processAndImport}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-colors"
                      >
                        {isProcessing ? '解析中...' : '解析文件'}
                      </button>
                    )}
                  </div>

                  {importEntries.map((entry, idx) => (
                    <div
                      key={`${entry.file.name}-${idx}`}
                      className={cn(
                        'p-4 rounded-lg border transition-colors',
                        entry.status === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : entry.status === 'error'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-slate-800/50 border-slate-700'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {entry.status === 'success' && <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />}
                          {entry.status === 'error' && <AlertCircle size={18} className="text-red-400 flex-shrink-0" />}
                          {entry.status === 'pending' && <FileUp size={18} className="text-slate-400 flex-shrink-0" />}
                          {entry.status === 'parsing' && <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                          <div>
                            <div className="text-white text-sm font-medium">{entry.file.name}</div>
                            <div className="text-xs text-slate-500">
                              {(entry.file.size / 1024).toFixed(1)} KB
                              {entry.result?.organ && ` · ${entry.result.organ.vertexCount} 顶点 · ${entry.result.organ.faceCount} 面`}
                              {entry.result?.dose && ` · ${entry.result.dose.minDose.toFixed(1)}-${entry.result.dose.maxDose.toFixed(1)} Gy`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeEntry(idx)}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <X size={14} className="text-slate-400" />
                        </button>
                      </div>

                      {entry.status === 'success' && (
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">类型</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateEntry(idx, { importType: 'organ' })}
                                className={cn(
                                  'flex-1 py-1 rounded text-xs transition-colors',
                                  entry.importType === 'organ'
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-slate-700 text-slate-400'
                                )}
                              >
                                器官
                              </button>
                              <button
                                onClick={() => updateEntry(idx, { importType: 'dose' })}
                                className={cn(
                                  'flex-1 py-1 rounded text-xs transition-colors',
                                  entry.importType === 'dose'
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-slate-700 text-slate-400'
                                )}
                              >
                                剂量
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">来源</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateEntry(idx, { source: 'original' })}
                                className={cn(
                                  'flex-1 py-1 rounded text-xs transition-colors',
                                  entry.source === 'original'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700 text-slate-400'
                                )}
                              >
                                原始
                              </button>
                              <button
                                onClick={() => updateEntry(idx, { source: 'processed' })}
                                className={cn(
                                  'flex-1 py-1 rounded text-xs transition-colors',
                                  entry.source === 'processed'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-slate-700 text-slate-400'
                                )}
                              >
                                处理
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">版本</label>
                            <input
                              type="text"
                              value={entry.version}
                              onChange={(e) => updateEntry(idx, { version: e.target.value })}
                              className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-teal-500"
                            />
                          </div>
                          {entry.importType === 'dose' && organs.length > 0 && (
                            <div className="col-span-3">
                              <label className="block text-xs text-slate-500 mb-1">关联器官</label>
                              <select
                                value={entry.linkedOrganId}
                                onChange={(e) => updateEntry(idx, { linkedOrganId: e.target.value })}
                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-teal-500"
                              >
                                {organs.map((o) => (
                                  <option key={o.id} value={o.id}>{o.name} ({o.version})</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {entry.status === 'error' && entry.result?.errors && (
                        <div className="mt-3 space-y-1">
                          {entry.result.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{err.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {entry.status === 'success' && entry.result?.warnings && entry.result.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {entry.result.warnings.map((warn, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportEntries([]);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={commitImport}
                disabled={!allParsed || !hasSuccess}
                className={cn(
                  'px-4 py-2 rounded-lg text-white text-sm transition-colors',
                  allParsed && hasSuccess
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-slate-700 cursor-not-allowed opacity-50'
                )}
              >
                确认导入 ({importEntries.filter((e) => e.status === 'success').length} 个)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
