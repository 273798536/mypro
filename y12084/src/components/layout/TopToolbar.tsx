import { useAppStore, useFilteredConflicts } from '@/store/useAppStore';
import { Camera, FileText, RefreshCw, AlertTriangle, Layers, ChevronDown, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TopToolbarProps {
  onSaveViewpoint: () => void;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export default function TopToolbar({ onSaveViewpoint, cameraPosition, cameraTarget }: TopToolbarProps) {
  const conflicts = useFilteredConflicts();
  const viewpoints = useAppStore(state => state.viewpoints);
  const isDataMerged = useAppStore(state => state.isDataMerged);
  const { toggleViewpointModal, toggleReportModal, toggleDataMergeModal, runConflictDetection, restoreViewpoint, saveViewpoint } = useAppStore(state => state.actions);
  const [showViewpointDropdown, setShowViewpointDropdown] = useState(false);
  const [newViewpointName, setNewViewpointName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unresolvedCount = conflicts.filter(c => !c.resolved).length;
  const criticalCount = conflicts.filter(c => c.severity === 'critical' && !c.resolved).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowViewpointDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSave = () => {
    if (!newViewpointName.trim()) {
      const name = `视角 ${viewpoints.length + 1}`;
      saveViewpoint(name, cameraPosition, cameraTarget);
    } else {
      saveViewpoint(newViewpointName.trim(), cameraPosition, cameraTarget);
      setNewViewpointName('');
    }
    setShowViewpointDropdown(false);
  };

  return (
    <div className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 flex items-center px-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            城市风廊建筑评估系统
          </h1>
          <p className="text-xs text-slate-400">Urban Wind Corridor Assessment</p>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-700" />

      {!isDataMerged && (
        <button
          onClick={() => toggleDataMergeModal(true)}
          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs rounded-lg flex items-center gap-1.5 transition-colors animate-pulse"
        >
          <AlertTriangle size={14} />
          数据待合并
        </button>
      )}

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-xs text-red-400 font-medium">{criticalCount}</span>
        </div>
        <span className="text-xs text-slate-500">严重</span>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <span className="text-xs text-slate-400">{unresolvedCount} 个待处理冲突</span>
      </div>

      <div className="flex-1" />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowViewpointDropdown(!showViewpointDropdown)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Camera size={16} className="text-cyan-400" />
          视角
          <ChevronDown size={14} className={`transition-transform ${showViewpointDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showViewpointDropdown && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newViewpointName}
                  onChange={(e) => setNewViewpointName(e.target.value)}
                  placeholder="视角名称..."
                  className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={handleQuickSave}
                  className="px-2 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded transition-colors"
                >
                  保存
                </button>
              </div>
              <p className="text-xs text-slate-500">
                当前: ({cameraPosition.map(v => v.toFixed(1)).join(', ')})
              </p>
            </div>

            <div className="max-h-64 overflow-auto">
              {viewpoints.map(vp => (
                <button
                  key={vp.id}
                  onClick={() => {
                    restoreViewpoint(vp.id);
                    setShowViewpointDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm text-white">{vp.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(vp.timestamp).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <Camera size={14} className="text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {viewpoints.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  暂无保存的视角
                </div>
              )}
            </div>

            <div className="p-2 border-t border-slate-700">
              <button
                onClick={() => {
                  toggleViewpointModal(true);
                  setShowViewpointDropdown(false);
                }}
                className="w-full px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
              >
                管理视角...
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => runConflictDetection()}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <RefreshCw size={16} className="text-green-400" />
        重新检测
      </button>

      <button
        onClick={() => toggleReportModal(true)}
        className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
      >
        <FileText size={16} />
        生成报告
      </button>
    </div>
  );
}
