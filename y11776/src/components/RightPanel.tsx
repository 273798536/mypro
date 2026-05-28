import { useState } from 'react';
import { useInterpolatorStore } from '../store/useInterpolatorStore';
import {
  History,
  FileText,
  Bookmark,
  RotateCcw,
  Clock,
  StickyNote,
  BookOpen,
  Save,
  Trash2,
  Download,
} from 'lucide-react';
import AlertPanel from './AlertPanel';

export default function RightPanel() {
  const {
    activeTab,
    setActiveTab,
    history,
    revertToHistory,
    config,
    updateNote,
    customPresets,
    classicPresets,
    loadPreset,
    deletePreset,
    saveAsPreset,
    setShowReportModal,
    calculationResult,
  } = useInterpolatorStore();

  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const tabs = [
    { id: 'history' as const, label: '操作历史', icon: History },
    { id: 'notes' as const, label: '备注/报告', icon: FileText },
    { id: 'presets' as const, label: '预设库', icon: Bookmark },
  ];

  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      saveAsPreset(newPresetName.trim(), newPresetDesc.trim());
      setNewPresetName('');
      setNewPresetDesc('');
      setShowSaveForm(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex gap-1 p-1 bg-primary-900/50 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-2 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/50'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {activeTab === 'history' && (
          <div className="space-y-4">
            <AlertPanel />
            
            <div className="space-y-2">
              <h3 className="font-medium text-primary-200 flex items-center gap-2">
                <Clock size={16} />
                操作痕迹
              </h3>
              
              {history.length === 0 ? (
                <p className="text-sm text-primary-500 text-center py-8">
                  暂无操作记录
                </p>
              ) : (
                <div className="relative pl-4 border-l-2 border-primary-800 space-y-4">
                  {[...history].reverse().slice(0, 20).map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary-600 border-2 border-primary-950" />
                      <div className="bg-primary-900/30 rounded-lg p-3 hover:bg-primary-900/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-primary-200 font-medium">{entry.action}</p>
                            {entry.userNote && (
                              <p className="text-xs text-primary-400 mt-1 line-clamp-2">{entry.userNote}</p>
                            )}
                            {Object.keys(entry.diff).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {Object.entries(entry.diff).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="text-xs px-1.5 py-0.5 rounded bg-primary-800/50 text-primary-400 font-mono"
                                  >
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-primary-600 mt-2 flex items-center gap-1">
                              <Clock size={10} />
                              {formatTime(entry.timestamp)}
                            </p>
                          </div>
                          <button
                            onClick={() => revertToHistory(entry.id)}
                            className="p-1.5 text-primary-500 hover:text-primary-300 hover:bg-primary-800/50 rounded transition-colors"
                            title="回退到此版本"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-primary-200 flex items-center gap-2">
                <StickyNote size={16} />
                课堂备注
              </h3>
              <textarea
                value={config.note}
                onChange={(e) => updateNote(e.target.value)}
                placeholder="在这里记录课堂笔记、观察结果、教学心得...

备注会与当前参数快照关联保存，并包含在导出报告中。"
                className="w-full h-48 px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
              />
              <p className="text-xs text-primary-500">
                💡 备注会自动保存，并记录在操作历史中
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-primary-800">
              <h3 className="font-medium text-primary-200 flex items-center gap-2">
                <BookOpen size={16} />
                分析报告
              </h3>
              <p className="text-sm text-primary-400">
                生成包含异常统计、操作历史、参数配置的完整分析报告
              </p>
              
              {calculationResult && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/30">
                    <p className="text-2xl font-bold text-accent-error">
                      {calculationResult.anomalies.filter(a => !a.resolved).length}
                    </p>
                    <p className="text-xs text-primary-400">未处理</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent-success/10 border border-accent-success/30">
                    <p className="text-2xl font-bold text-accent-success">
                      {calculationResult.anomalies.filter(a => a.resolved).length}
                    </p>
                    <p className="text-xs text-primary-400">已修正</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/30">
                    <p className="text-2xl font-bold text-accent-warning">
                      {calculationResult.anomalies.filter(a => a.severity === 'error' && !a.resolved).length}
                    </p>
                    <p className="text-xs text-primary-400">需确认</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowReportModal(true)}
                disabled={!calculationResult}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                生成报告
              </button>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="w-full py-2.5 bg-primary-800/50 hover:bg-primary-700/50 text-primary-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  保存当前配置为预设
                </button>
              ) : (
                <div className="p-3 bg-primary-800/30 rounded-lg space-y-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="预设名称"
                    className="w-full px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                  <textarea
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    placeholder="描述（可选）"
                    className="w-full px-3 py-2 bg-primary-900/50 border border-primary-700/50 rounded-lg text-primary-100 text-sm focus:outline-none focus:border-primary-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim()}
                      className="flex-1 py-2 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveForm(false);
                        setNewPresetName('');
                        setNewPresetDesc('');
                      }}
                      className="px-4 py-2 bg-primary-800/50 hover:bg-primary-700/50 text-primary-300 text-sm rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-primary-400">经典样例</h3>
              <div className="space-y-2">
                {classicPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className="w-full p-3 text-left bg-primary-900/30 hover:bg-primary-800/50 rounded-lg transition-colors group"
                  >
                    <p className="text-sm font-medium text-primary-200 group-hover:text-primary-100">
                      {preset.name}
                    </p>
                    <p className="text-xs text-primary-500 mt-1 line-clamp-2">
                      {preset.description}
                    </p>
                    <p className="text-xs text-primary-600 mt-1 font-mono">
                      f(x) = {preset.config.functionExpression} · {preset.config.order}阶
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {customPresets.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-primary-800">
                <h3 className="text-sm font-medium text-primary-400">我的预设</h3>
                <div className="space-y-2">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3 bg-primary-900/30 rounded-lg group"
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
                            <p className="text-xs text-primary-500 mt-1 line-clamp-2">
                              {preset.description}
                            </p>
                          )}
                          <p className="text-xs text-primary-600 mt-1 font-mono">
                            {preset.config.order}阶 · [{preset.config.sampleStart}, {preset.config.sampleEnd}]
                          </p>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定要删除这个预设吗？')) {
                              deletePreset(preset.id);
                            }
                          }}
                          className="p-1.5 text-primary-600 hover:text-accent-error hover:bg-accent-error/10 rounded opacity-0 group-hover:opacity-100 transition-all"
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
        )}
      </div>
    </div>
  );
}
