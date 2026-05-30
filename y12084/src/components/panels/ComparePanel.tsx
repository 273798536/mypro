import { useAppStore } from '@/store/useAppStore';
import { useFilteredBuildings } from '@/store/useAppStore';
import { Layers, Plus, Trash2, Check } from 'lucide-react';
import { useState } from 'react';

export default function ComparePanel() {
  const schemes = useAppStore(state => state.comparisonSchemes);
  const activeSchemeId = useAppStore(state => state.activeSchemeId);
  const corridors = useAppStore(state => state.corridors);
  const buildings = useFilteredBuildings();
  const { createComparisonScheme, activateScheme } = useAppStore(state => state.actions);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleCreateScheme = () => {
    if (!newSchemeName.trim()) return;
    createComparisonScheme(newSchemeName.trim(), buildings, corridors);
    setNewSchemeName('');
    setShowInput(false);
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          <span className="text-sm font-medium text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            方案对比
          </span>
          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
            {schemes.length} 个方案
          </span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="保存当前方案"
        >
          <Plus size={16} />
        </button>
      </div>

      {showInput && (
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              placeholder="输入方案名称..."
              className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateScheme()}
              autoFocus
            />
            <button
              onClick={handleCreateScheme}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
        <div
          onClick={() => activateScheme(null)}
          className={`p-3 rounded border cursor-pointer transition-all ${
            activeSchemeId === null
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeSchemeId === null && <Check size={14} className="text-purple-400" />}
              <span className="text-sm text-white">当前方案</span>
            </div>
            <span className="text-xs text-slate-400">实时</span>
          </div>
        </div>

        {schemes.map(scheme => (
          <div
            key={scheme.id}
            className={`p-3 rounded border transition-all ${
              activeSchemeId === scheme.id
                ? 'border-purple-500/50 bg-purple-500/10'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => activateScheme(scheme.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {activeSchemeId === scheme.id && <Check size={14} className="text-purple-400" />}
                <span className="text-sm text-white">{scheme.name}</span>
              </button>
              <button
                onClick={() => {
                  // 删除方案逻辑
                }}
                className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>{scheme.buildings.length} 建筑</span>
              <span>{scheme.corridors.length} 风廊</span>
              <span>{new Date(scheme.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
