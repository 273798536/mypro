import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { ArrowLeft, Lock, Unlock, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { FieldMapping } from '../types';
import { STANDARD_FIELDS } from '../utils/constants';
import { synonymMap, lockedStandardFields } from '../data/fieldMappings';

export const FieldMappingPage = () => {
  const navigate = useNavigate();
  const fieldMappings = useDataStore((s) => s.fieldMappings);
  const detectedCadFields = useDataStore((s) => s.detectedCadFields);
  const updateFieldMapping = useDataStore((s) => s.updateFieldMapping);
  const reprocessData = useDataStore((s) => s.reprocessData);
  const records = useDataStore((s) => s.records);
  const addToast = useToastStore((s) => s.addToast);

  const [localMappings, setLocalMappings] = useState<FieldMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalMappings(fieldMappings);
    setHasChanges(false);
  }, [fieldMappings]);

  const detectSynonym = (cadField: string): string => {
    const lowerName = cadField.toLowerCase().trim();
    for (const [standardField, synonyms] of Object.entries(synonymMap)) {
      if (synonyms.some(s => s.toLowerCase() === lowerName)) {
        return standardField;
      }
    }
    return '';
  };

  const { lockedRows, unlockedRows, unmatchedRows } = useMemo(() => {
    const locked: FieldMapping[] = [];
    const unlocked: FieldMapping[] = [];
    const unmatched: { cadField: string; suggested: string }[] = [];

    const cadFieldsFromData = detectedCadFields.length > 0
      ? detectedCadFields
      : (records.length > 0 ? Object.keys(records[0].originalFields) : []);

    const existingMap = new Map<string, FieldMapping>();
    localMappings.forEach(m => existingMap.set(m.cadField, m));

    cadFieldsFromData.forEach(cadField => {
      const existing = existingMap.get(cadField);
      if (existing) {
        if (existing.locked) {
          locked.push(existing);
        } else {
          unlocked.push(existing);
        }
      } else {
        const isLockedStandard = lockedStandardFields.some(sf => {
          const lower = cadField.toLowerCase().trim();
          const synonyms = synonymMap[sf] || [];
          return synonyms.some(s => s.toLowerCase() === lower);
        });
        if (isLockedStandard) {
          const sf = lockedStandardFields.find(sf => {
            const lower = cadField.toLowerCase().trim();
            const synonyms = synonymMap[sf] || [];
            return synonyms.some(s => s.toLowerCase() === lower);
          })!;
          locked.push({ cadField, standardField: sf, locked: true });
        } else {
          const suggested = detectSynonym(cadField);
          unmatched.push({ cadField, suggested });
        }
      }
    });

    localMappings.forEach(m => {
      if (!cadFieldsFromData.includes(m.cadField)) {
        if (m.locked) {
          if (!locked.find(l => l.standardField === m.standardField)) {
            locked.push(m);
          }
        } else {
          unlocked.push(m);
        }
      }
    });

    return { lockedRows: locked, unlockedRows: unlocked, unmatchedRows: unmatched };
  }, [localMappings, detectedCadFields, records]);

  const handleMappingChange = (cadField: string, standardField: string) => {
    setLocalMappings(prev => {
      const idx = prev.findIndex(m => m.cadField === cadField);
      if (idx >= 0) {
        if (prev[idx].locked) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], standardField };
        return next;
      }
      return [...prev, { cadField, standardField, locked: false }];
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    localMappings.forEach((m) => {
      if (!m.locked) {
        updateFieldMapping(m.cadField, m.standardField);
      }
    });
    unmatchedRows.forEach(u => {
      const exists = localMappings.find(m => m.cadField === u.cadField);
      if (!exists && u.suggested) {
        updateFieldMapping(u.cadField, u.suggested);
      }
    });
    setHasChanges(false);
    reprocessData();
    addToast({
      type: 'success',
      message: '字段映射已保存，数据已重新处理',
    });
  };

  const allRows = [...lockedRows, ...unlockedRows];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回图表
            </button>
            <h1 className="text-xl font-bold">字段映射配置</h1>
            {detectedCadFields.length > 0 && (
              <span className="text-xs text-slate-500 font-mono">
                检测到 {detectedCadFields.length} 个CAD字段
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLocalMappings(fieldMappings);
                setHasChanges(false);
                addToast({ type: 'info', message: '已重置为上次保存的配置' });
              }}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-200 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              保存并重跑
            </button>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200/80 space-y-1">
              <p>
                复核人交来的 CAD 图层字段名可能前后不一，系统会自动模糊匹配同义字段（如"数据源"→"来源"）。
              </p>
              <p>
                <span className="text-yellow-300 font-medium">「来源」</span> 和
                <span className="text-yellow-300 font-medium"> 「处理状态」</span>
                为强制保留字段，锁定不可修改。
                其他字段（包括 CSV 中未被识别的新字段）可在下方手动调整映射关系。
              </p>
              <p>保存后会立刻用新映射重跑数据。</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                强制保留字段 (锁定)
              </h2>
              <span className="text-xs text-slate-500">
                {lockedRows.length} 项
              </span>
            </div>
            <div className="divide-y divide-slate-700">
              {lockedRows.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  尚未检测到强制字段对应的CAD列，上传CSV后自动识别
                </div>
              ) : (
                lockedRows.map(mapping => (
                  <div
                    key={mapping.cadField}
                    className="px-4 py-3 flex items-center gap-4 hover:bg-slate-700/20 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="flex-1 grid grid-cols-[1fr_1fr_160px] gap-4 items-center">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">CAD字段名</div>
                        <div className="text-sm text-slate-300 font-mono">
                          {mapping.cadField}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 text-center">→</div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">映射到</div>
                        <div className="text-sm text-red-300 font-medium">
                          {STANDARD_FIELDS.find(f => f.field === mapping.standardField)?.label ||
                            mapping.standardField}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-blue-400" />
                可配置字段映射
              </h2>
              <span className="text-xs text-slate-500">
                {unlockedRows.length + unmatchedRows.length} 项
                {unmatchedRows.length > 0 && (
                  <span className="text-orange-400 ml-2">
                    · {unmatchedRows.length} 个未匹配
                  </span>
                )}
              </span>
            </div>
            <div className="divide-y divide-slate-700">
              {unlockedRows.length === 0 && unmatchedRows.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm space-y-1">
                  <p>暂无可配置的字段映射</p>
                  <p>上传 CSV 文件后将自动检测可用字段，包括未被识别的新字段</p>
                </div>
              ) : (
                <>
                  {unlockedRows.map(mapping => (
                    <div
                      key={mapping.cadField}
                      className="px-4 py-3 flex items-center gap-4 hover:bg-slate-700/20 transition-colors"
                    >
                      <Unlock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 grid grid-cols-[1fr_1fr_1fr] gap-4 items-center">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">CAD字段名</div>
                          <div className="text-sm text-slate-300 font-mono">
                            {mapping.cadField}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 text-center">→</div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">映射到标准字段</div>
                          <select
                            value={mapping.standardField}
                            onChange={e =>
                              handleMappingChange(mapping.cadField, e.target.value)
                            }
                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            {STANDARD_FIELDS.filter(f => !f.locked).map(field => (
                              <option key={field.field} value={field.field}>
                                {field.label}
                              </option>
                            ))}
                            <option value="">不映射（仅保留原始字段）</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {unmatchedRows.map(item => (
                    <div
                      key={item.cadField}
                      className="px-4 py-3 flex items-center gap-4 bg-orange-500/5 hover:bg-orange-500/10 border-l-2 border-orange-500/50 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div className="flex-1 grid grid-cols-[1fr_1fr_1fr] gap-4 items-center">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            CAD字段名 <span className="text-orange-400">（新字段）</span>
                          </div>
                          <div className="text-sm text-orange-200 font-mono">
                            {item.cadField}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 text-center">→</div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            映射到标准字段
                            {item.suggested && (
                              <span className="text-blue-400 ml-1">
                                （建议: {STANDARD_FIELDS.find(f => f.field === item.suggested)?.label}）
                              </span>
                            )}
                          </div>
                          <select
                            value={
                              localMappings.find(m => m.cadField === item.cadField)?.standardField ||
                              item.suggested ||
                              ''
                            }
                            onChange={e =>
                              handleMappingChange(item.cadField, e.target.value)
                            }
                            className="w-full bg-orange-950/30 border border-orange-500/30 rounded px-3 py-1.5 text-sm text-orange-100 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">不映射（仅保留原始字段）</option>
                            {STANDARD_FIELDS.filter(f => !f.locked).map(field => (
                              <option key={field.field} value={field.field}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {allRows.length > 0 && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">当前映射状态预览</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {allRows.map(m => {
                  const label = STANDARD_FIELDS.find(f => f.field === m.standardField)?.label;
                  return (
                    <div
                      key={m.cadField}
                      className={`flex items-center justify-between px-3 py-2 rounded text-xs ${
                        m.locked
                          ? 'bg-red-500/10 border border-red-500/20'
                          : label
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'bg-slate-700/50 border border-slate-600'
                      }`}
                    >
                      <span className="font-mono text-slate-300 truncate">{m.cadField}</span>
                      <span className={label ? 'text-blue-300' : 'text-slate-500'}>
                        {label || '未映射'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
