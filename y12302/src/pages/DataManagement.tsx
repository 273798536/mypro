import { useState } from 'react';
import { Upload, File, Layers, Radiation, FileText, Plus, X, Filter } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, getSourceLabel, getSourceColor } from '../utils/colorUtils';
import { cn } from '../lib/utils';
import type { DataSource } from '../types';

type FileCategory = 'all' | 'organ' | 'dose' | 'note';

export function DataManagement() {
  const { organs, doses, notes, addOrgan, addDose } = useAppStore();
  const [category, setCategory] = useState<FileCategory>('all');
  const [sourceFilter, setSourceFilter] = useState<DataSource | 'all'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'organ' | 'dose'>('organ');
  const [importSource, setImportSource] = useState<DataSource>('original');
  const [importName, setImportName] = useState('');
  const [importVersion, setImportVersion] = useState('v1.0');

  const handleImport = () => {
    if (importType === 'organ') {
      addOrgan({
        name: importName,
        version: importVersion,
        source: importSource,
        importTime: new Date(),
        importedBy: '当前用户',
        fileType: 'obj',
        filePath: '',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        visible: true,
        opacity: 0.8,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        shapeType: 'ellipsoid',
        size: [40, 30, 35],
      });
    } else {
      addDose({
        name: importName,
        version: importVersion,
        organId: organs[0]?.id || '',
        source: importSource,
        importTime: new Date(),
        importedBy: '当前用户',
        fileType: 'dcm',
        minDose: 0.5,
        maxDose: 75.0,
        meanDose: 42.0,
        threshold: 70.0,
        visible: true,
        opacity: 0.6,
      });
    }
    setShowImportModal(false);
    setImportName('');
  };

  const filteredOrgans = organs.filter(
    (o) => sourceFilter === 'all' || o.source === sourceFilter
  );
  const filteredDoses = doses.filter(
    (d) => sourceFilter === 'all' || d.source === sourceFilter
  );

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">数据管理</h1>
          <p className="text-slate-400 text-sm mt-1">管理器官模型、剂量网格和医生备注</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          导入数据
        </button>
      </div>

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
                        <div className="text-xs text-slate-400">{organ.version}</div>
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
                          关联器官：{organ?.name || '未知'}
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">导入数据</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">数据类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportType('organ')}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm transition-colors',
                      importType === 'organ'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    器官模型
                  </button>
                  <button
                    onClick={() => setImportType('dose')}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm transition-colors',
                      importType === 'dose'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    剂量网格
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">数据来源</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportSource('original')}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm transition-colors',
                      importSource === 'original'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    原始材料
                  </button>
                  <button
                    onClick={() => setImportSource('processed')}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm transition-colors',
                      importSource === 'processed'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    处理结果
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">名称</label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="输入名称..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">版本号</label>
                <input
                  type="text"
                  value={importVersion}
                  onChange={(e) => setImportVersion(e.target.value)}
                  placeholder="v1.0"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <Upload size={32} className="mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">拖拽文件到此处或点击上传</p>
                <p className="text-slate-600 text-xs mt-1">支持 .obj, .stl, .dcm, .nrrd</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!importName}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
