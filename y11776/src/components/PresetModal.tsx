import { useState } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import { X, Save, Trash2, Bookmark, BookOpen } from 'lucide-react';

export default function PresetModal() {
  const {
    showPresetModal,
    setShowPresetModal,
    classicPresets,
    customPresets,
    loadPreset,
    saveAsPreset,
    deletePreset,
  } = useInterpolatorStore();

  const [activeTab, setActiveTab] = useState<'load' | 'save'>('load');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  if (!showPresetModal) return null;

  const handleSave = () => {
    if (newPresetName.trim()) {
      saveAsPreset(newPresetName.trim(), newPresetDesc.trim());
      setNewPresetName('');
      setNewPresetDesc('');
      setActiveTab('load');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-primary-950 border border-primary-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-primary-800">
          <h2 className="font-display text-xl font-semibold text-primary-100 flex items-center gap-2">
            <Bookmark size={20} />
            预设管理
          </h2>
          <button
            onClick={() => setShowPresetModal(false)}
            className="p-2 text-primary-500 hover:text-primary-300 hover:bg-primary-800/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-primary-900/50 border-b border-primary-800">
          <button
            onClick={() => setActiveTab('load')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${
              activeTab === 'load'
                ? 'bg-primary-600 text-white'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            加载预设
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${
              activeTab === 'save'
                ? 'bg-primary-600 text-white'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            保存预设
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'load' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-2 flex items-center gap-2">
                  <BookOpen size={14} />
                  经典样例
                </h3>
                <div className="space-y-2">
                  {classicPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => loadPreset(preset)}
                      className="w-full p-3 text-left bg-primary-900/50 hover:bg-primary-800/50 border border-transparent hover:border-primary-700/50 rounded-xl transition-all group"
                    >
                      <p className="text-sm font-medium text-primary-200 group-hover:text-primary-100">
                        {preset.name}
                      </p>
                      <p className="text-xs text-primary-500 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                      <p className="text-xs text-primary-600 mt-1 font-mono">
                        f(x) = {preset.config.functionExpression}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {customPresets.length > 0 && (
                <div className="pt-4 border-t border-primary-800">
                  <h3 className="text-sm font-medium text-primary-400 mb-2">我的预设</h3>
                  <div className="space-y-2">
                    {customPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3 bg-primary-900/50 border border-transparent hover:border-primary-700/50 rounded-xl transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => loadPreset(preset)}
                            className="flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-primary-200 group-hover:text-primary-100">
                              {preset.name}
                            </p>
                            {preset.description && (
                              <p className="text-xs text-primary-500 mt-1">
                                {preset.description}
                              </p>
                            )}
                            <p className="text-xs text-primary-600 mt-1 font-mono">
                              {preset.config.order}阶 · [{preset.config.sampleStart}, {preset.config.sampleEnd}]
                            </p>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这个预设吗？')) {
                                deletePreset(preset.id);
                              }
                            }}
                            className="p-1.5 text-primary-600 hover:text-accent-error hover:bg-accent-error/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-primary-300">预设名称</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="例如：龙格函数10阶演示"
                  className="w-full px-3 py-2.5 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-primary-300">描述（可选）</label>
                <textarea
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="描述这个预设的用途，便于后续查找"
                  className="w-full px-3 py-2.5 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                  rows={3}
                />
              </div>
              <div className="p-3 bg-primary-900/30 rounded-lg">
                <p className="text-xs text-primary-500 mb-2">将保存以下配置：</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="text-primary-400">函数:</div>
                  <div className="text-primary-200 truncate">f(x) = ...</div>
                  <div className="text-primary-400">阶数:</div>
                  <div className="text-primary-200">{classicPresets[0]?.config.order || 10}阶</div>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!newPresetName.trim()}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                保存预设
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
