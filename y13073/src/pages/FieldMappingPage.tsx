import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useToastStore } from '../store/toastStore';
import { ArrowLeft, Lock, Unlock, Save, AlertCircle } from 'lucide-react';
import { FieldMapping } from '../types';
import { STANDARD_FIELDS } from '../utils/constants';

export const FieldMappingPage = () => {
  const navigate = useNavigate();
  const fieldMappings = useDataStore((s) => s.fieldMappings);
  const updateFieldMapping = useDataStore((s) => s.updateFieldMapping);
  const records = useDataStore((s) => s.records);
  const addToast = useToastStore((s) => s.addToast);

  const [mappings, setMappings] = useState<FieldMapping[]>(fieldMappings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleMappingChange = (cadField: string, standardField: string) => {
    const newMappings = mappings.map((m) =>
      m.cadField === cadField && !m.locked
        ? { ...m, standardField }
        : m
    );
    setMappings(newMappings);
    setHasChanges(true);
  };

  const handleSave = () => {
    mappings.forEach((m) => {
      if (!m.locked) {
        updateFieldMapping(m.cadField, m.standardField);
      }
    });
    setHasChanges(false);
    addToast({
      type: 'success',
      message: '字段映射配置已保存',
    });
  };

  const lockedMappings = mappings.filter((m) => m.locked);
  const unlockedMappings = mappings.filter((m) => !m.locked);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto p-6">
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
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-300 mb-1">
                关于CAD图层字段名不一致
              </h3>
              <p className="text-sm text-yellow-200/70">
                复核人交来的CAD图层字段名可能前后不一，系统会自动模糊匹配同义字段。
                <span className="text-yellow-300 font-medium">"来源"</span>和
                <span className="text-yellow-300 font-medium">"处理状态"</span>
                为强制保留字段，锁定后不可修改。其他字段可根据实际情况调整映射关系。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                强制保留字段 (锁定)
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {lockedMappings.map((mapping) => (
                <div
                  key={mapping.cadField}
                  className="flex items-center gap-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <Lock className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        CAD字段名
                      </label>
                      <div className="text-sm text-slate-300 font-mono">
                        {mapping.cadField}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        映射到标准字段
                      </label>
                      <div className="text-sm text-blue-400 font-medium">
                        {STANDARD_FIELDS.find((f) => f.field === mapping.standardField)?.label ||
                          mapping.standardField}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
              <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-blue-400" />
                可配置字段映射
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {unlockedMappings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>暂无可配置的字段映射</p>
                  <p className="text-sm mt-1">上传CSV文件后将自动检测可用字段</p>
                </div>
              ) : (
                unlockedMappings.map((mapping) => (
                  <div
                    key={mapping.cadField}
                    className="flex items-center gap-4 p-3 bg-slate-700/30 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Unlock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">
                          CAD字段名
                        </label>
                        <div className="text-sm text-slate-300 font-mono">
                          {mapping.cadField}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">
                          映射到标准字段
                        </label>
                        <select
                          value={mapping.standardField}
                          onChange={(e) =>
                            handleMappingChange(mapping.cadField, e.target.value)
                          }
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          {STANDARD_FIELDS.filter((f) => !f.locked).map((field) => (
                            <option key={field.field} value={field.field}>
                              {field.label}
                            </option>
                          ))}
                          <option value="">不映射</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {records.length > 0 && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">当前数据字段预览</h3>
              <div className="text-xs text-slate-400">
                当前加载 {records.length} 条记录，包含以下原始CAD字段：
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {records[0] &&
                  Object.keys(records[0].originalFields).map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 font-mono"
                    >
                      {field}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
