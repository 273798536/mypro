import React from 'react';
import { Layers, SplitSquareHorizontal, Square } from 'lucide-react';
import { useStageStore } from '@/store/useStageStore';
import { ViewMode } from '@/types';
import { cn } from '@/utils/cn';

const viewModes: { mode: ViewMode | 'swap'; label: string; icon: React.ReactNode }[] = [
  { mode: 'single', label: '单视图', icon: <Square size={16} /> },
  { mode: 'compare', label: '对比视图', icon: <SplitSquareHorizontal size={16} /> },
];

export const VersionSwitcher: React.FC = () => {
  const {
    currentVersion,
    compareVersion,
    viewMode,
    showCables,
    setViewMode,
    setShowCables,
    setCurrentVersion,
    setCompareVersion,
  } = useStageStore();

  const handleSwapVersions = () => {
    if (currentVersion && compareVersion) {
      setCurrentVersion(compareVersion);
      setCompareVersion(currentVersion);
    }
  };

  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
        <Layers size={16} />
        版本控制
      </h3>

      <div className="flex gap-2 mb-4">
        {viewModes.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as ViewMode)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium transition-all',
              viewMode === mode
                ? 'bg-[#e94560] text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#e94560]" />
            <span className="text-sm text-gray-200">
              {currentVersion?.name || '当前版本'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {currentVersion?.conflicts.length || 0} 冲突
          </span>
        </div>

        {viewMode === 'compare' && (
          <>
            <button
              onClick={handleSwapVersions}
              className="w-full py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ↕ 交换版本
            </button>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#0f4c5c]" />
                <span className="text-sm text-gray-200">
                  {compareVersion?.name || '对比版本'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {compareVersion?.conflicts.length || 0} 冲突
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-300">显示线缆</span>
          <div
            onClick={() => setShowCables(!showCables)}
            className={cn(
              'w-10 h-5 rounded-full transition-colors relative',
              showCables ? 'bg-[#e94560]' : 'bg-gray-600'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                showCables ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </div>
        </label>
      </div>
    </div>
  );
};
