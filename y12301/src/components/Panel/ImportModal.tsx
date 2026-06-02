import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileJson, Building2, Wind, TreeDeciduous, AlertCircle, CheckCircle, Merge, Replace } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TimePeriod, TIME_PERIODS, BuildingBlock, WindDirection, OpenSpace } from '../../types';
import { cn } from '../../utils/cn';

type ImportType = 'buildings' | 'wind' | 'openSpaces';
type ImportMode = 'replace' | 'merge';

interface PreviewData {
  count: number;
  type: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_IMPORT_COUNT = 500;
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

const importTypeConfigs: { key: ImportType; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'buildings', label: '建筑体块', icon: Building2, description: '导入建筑位置、尺寸、退界等数据' },
  { key: 'wind', label: '风向数据', icon: Wind, description: '导入各时段风向玫瑰数据' },
  { key: 'openSpaces', label: '开敞空间', icon: TreeDeciduous, description: '导入公园、广场、河道等开敞空间' },
];

function isValidBuilding(b: unknown): b is BuildingBlock {
  return (
    typeof b === 'object' &&
    b !== null &&
    'id' in b &&
    typeof (b as Record<string, unknown>).id === 'string' &&
    'name' in b &&
    typeof (b as Record<string, unknown>).name === 'string' &&
    'position' in b &&
    typeof (b as Record<string, unknown>).position === 'object' &&
    'dimensions' in b &&
    typeof (b as Record<string, unknown>).dimensions === 'object'
  );
}

function isValidWind(w: unknown): w is WindDirection {
  return (
    typeof w === 'object' &&
    w !== null &&
    'angle' in w &&
    typeof (w as Record<string, unknown>).angle === 'number' &&
    'speed' in w &&
    typeof (w as Record<string, unknown>).speed === 'number'
  );
}

function isValidOpenSpace(s: unknown): s is OpenSpace {
  return (
    typeof s === 'object' &&
    s !== null &&
    'id' in s &&
    typeof (s as Record<string, unknown>).id === 'string' &&
    'name' in s &&
    typeof (s as Record<string, unknown>).name === 'string'
  );
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [importType, setImportType] = useState<ImportType>('buildings');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [windPeriod, setWindPeriod] = useState<TimePeriod>('morning');
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importBuildings = useAppStore((state) => state.importBuildings);
  const importWindData = useAppStore((state) => state.importWindData);
  const importOpenSpaces = useAppStore((state) => state.importOpenSpaces);

  const validateJson = useCallback((text: string) => {
    setParseError(null);
    setParseSuccess(false);
    setPreviewData(null);

    if (text.length > MAX_JSON_SIZE) {
      setParseError(`JSON 数据过大，最大支持 ${MAX_JSON_SIZE / 1024}KB`);
      return;
    }

    try {
      const data = JSON.parse(text);

      if (importType === 'buildings') {
        if (!Array.isArray(data)) {
          throw new Error('建筑数据应为数组格式');
        }
        if (data.length === 0) {
          throw new Error('建筑数据不能为空');
        }
        if (data.length > MAX_IMPORT_COUNT) {
          throw new Error(`建筑数据过多，单次最多导入 ${MAX_IMPORT_COUNT} 条`);
        }
        const invalid = data.find((b) => !isValidBuilding(b));
        if (invalid) {
          throw new Error('建筑数据缺少必要字段: id, name, position, dimensions');
        }
        const dupIds = new Set<string>();
        const dupCheck = new Set<string>();
        data.forEach((b: BuildingBlock) => {
          if (dupCheck.has(b.id)) dupIds.add(b.id);
          dupCheck.add(b.id);
        });
        if (dupIds.size > 0) {
          throw new Error(`导入数据中存在重复ID: ${Array.from(dupIds).join(', ')}`);
        }
        setPreviewData({ count: data.length, type: '建筑体块' });
      } else if (importType === 'wind') {
        if (!Array.isArray(data)) {
          throw new Error('风向数据应为数组格式');
        }
        if (data.length > MAX_IMPORT_COUNT) {
          throw new Error(`风向数据过多，单次最多导入 ${MAX_IMPORT_COUNT} 条`);
        }
        const invalid = data.find((w) => !isValidWind(w));
        if (invalid) {
          throw new Error('风向数据缺少必要字段: angle, speed');
        }
        setPreviewData({ count: data.length, type: '风向条目' });
      } else if (importType === 'openSpaces') {
        if (!Array.isArray(data)) {
          throw new Error('开敞空间数据应为数组格式');
        }
        if (data.length > MAX_IMPORT_COUNT) {
          throw new Error(`开敞空间数据过多，单次最多导入 ${MAX_IMPORT_COUNT} 条`);
        }
        const invalid = data.find((s) => !isValidOpenSpace(s));
        if (invalid) {
          throw new Error('开敞空间数据缺少必要字段: id, name');
        }
        setPreviewData({ count: data.length, type: '开敞空间' });
      }

      setParseSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setParseError(err.message || 'JSON 格式错误');
      } else {
        setParseError('JSON 格式错误');
      }
    }
  }, [importType]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_JSON_SIZE) {
      setParseError(`文件过大，最大支持 ${MAX_JSON_SIZE / 1024}KB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      validateJson(text);
    };
    reader.readAsText(file);
  }, [validateJson]);

  const handleImport = useCallback(() => {
    if (!parseSuccess || !jsonText) return;

    try {
      const data = JSON.parse(jsonText);

      if (importType === 'buildings' && Array.isArray(data) && data.every(isValidBuilding)) {
        importBuildings(data, importMode);
      } else if (importType === 'wind' && Array.isArray(data) && data.every(isValidWind)) {
        importWindData(windPeriod, data);
      } else if (importType === 'openSpaces' && Array.isArray(data) && data.every(isValidOpenSpace)) {
        importOpenSpaces(data, importMode);
      }

      onClose();
      setJsonText('');
      setParseSuccess(false);
      setPreviewData(null);
    } catch (err) {
      if (err instanceof Error) {
        setParseError(err.message || '导入失败');
      } else {
        setParseError('导入失败');
      }
    }
  }, [parseSuccess, jsonText, importType, importMode, windPeriod, importBuildings, importWindData, importOpenSpaces, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setJsonText('');
    setParseError(null);
    setParseSuccess(false);
    setPreviewData(null);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">增量导入数据</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-white mb-3 block">选择导入类型</label>
            <div className="grid grid-cols-3 gap-3">
              {importTypeConfigs.map((config) => {
                const Icon = config.icon;
                const isActive = importType === config.key;
                return (
                  <button
                    key={config.key}
                    onClick={() => {
                      setImportType(config.key);
                      setJsonText('');
                      setParseError(null);
                      setParseSuccess(false);
                      setPreviewData(null);
                    }}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                      isActive
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <Icon className={cn('w-6 h-6 mb-2', isActive ? 'text-cyan-400' : 'text-slate-400')} />
                    <div className={cn('text-sm font-medium', isActive ? 'text-white' : 'text-slate-300')}>
                      {config.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{config.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {importType === 'wind' && (
            <div>
              <label className="text-sm font-medium text-white mb-2 block">选择时段</label>
              <div className="flex flex-wrap gap-2">
                {TIME_PERIODS.map((period) => (
                  <button
                    key={period.key}
                    onClick={() => setWindPeriod(period.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                      windPeriod === period.key
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    {period.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {importType !== 'wind' && (
            <div>
              <label className="text-sm font-medium text-white mb-2 block">导入模式</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setImportMode('merge')}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200',
                    importMode === 'merge'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  )}
                >
                  <Merge className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">追加合并</div>
                    <div className="text-xs opacity-70">保留已有数据，相同ID更新</div>
                  </div>
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200',
                    importMode === 'replace'
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  )}
                >
                  <Replace className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">替换全部</div>
                    <div className="text-xs opacity-70">清除现有数据后导入</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">JSON 数据</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                <FileJson className="w-3.5 h-3.5" />
                选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                if (e.target.value) {
                  validateJson(e.target.value);
                } else {
                  setParseError(null);
                  setParseSuccess(false);
                  setPreviewData(null);
                }
              }}
              placeholder={`粘贴${importType === 'buildings' ? '建筑体块' : importType === 'wind' ? '风向' : '开敞空间'}JSON数据...`}
              className="w-full h-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">{parseError}</div>
            </div>
          )}

          {parseSuccess && previewData && (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-400">
                数据格式正确，将导入 <span className="font-semibold">{previewData.count}</span> 个{previewData.type}
                {importMode === 'merge' && importType !== 'wind' && (
                  <span className="text-green-300/70">（保留备注和已解决状态）</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!parseSuccess}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              parseSuccess
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            <Upload className="w-4 h-4" />
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
