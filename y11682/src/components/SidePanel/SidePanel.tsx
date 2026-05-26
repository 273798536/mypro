import { useState } from 'react';
import { MapPin, AlertTriangle, BarChart3, History, Eye, EyeOff, Grid, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { PlaygroundList } from './PlaygroundList';
import { SunlightDetail } from './SunlightDetail';
import { ErrorList } from './ErrorList';
import { CorrectionLog } from './CorrectionLog';

const tabs = [
  { id: 'playgrounds', label: '活动场地', icon: MapPin },
  { id: 'stats', label: '日照统计', icon: BarChart3 },
  { id: 'errors', label: '问题检测', icon: AlertTriangle },
  { id: 'history', label: '修正记录', icon: History }
];

export function SidePanel() {
  const [activeTab, setActiveTab] = useState('playgrounds');
  const {
    errors,
    showShadows,
    toggleShadows,
    showGrid,
    toggleGrid,
    showPlaygroundBoundaries,
    togglePlaygroundBoundaries
  } = useAppStore();

  const errorCount = errors.length;

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">城市光照阴影沙盘</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleShadows}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showShadows
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {showShadows ? <Eye size={12} /> : <EyeOff size={12} />}
            阴影
          </button>
          <button
            onClick={toggleGrid}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showGrid
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Grid size={12} />
            网格
          </button>
          <button
            onClick={togglePlaygroundBoundaries}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showPlaygroundBoundaries
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Layers size={12} />
            场地边界
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-colors relative ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              <span className="text-xs">{tab.label}</span>
              {tab.id === 'errors' && errorCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {errorCount}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'playgrounds' && <PlaygroundList />}
        {activeTab === 'stats' && <SunlightDetail />}
        {activeTab === 'errors' && <ErrorList />}
        {activeTab === 'history' && <CorrectionLog />}
      </div>
    </div>
  );
}
