import { useState } from 'react';
import { Bookmark, Trash2, Check } from 'lucide-react';
import { usePresetStore } from '@/store/usePresetStore';
import { useViewStore } from '@/store/useViewStore';
import { formatTime } from '@/utils/storage';
import { cn } from '@/lib/utils';

export function ViewPresetSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { presets, deletePreset } = usePresetStore();
  const { applyViewCondition, viewCondition } = useViewStore();

  const isPresetActive = (presetView: any) => {
    return (
      Math.abs(presetView.centerLng - viewCondition.centerLng) < 0.0001 &&
      Math.abs(presetView.centerLat - viewCondition.centerLat) < 0.0001 &&
      Math.abs(presetView.zoom - viewCondition.zoom) < 0.1
    );
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 w-64 bg-space-800 border border-space-600 rounded-lg shadow-xl z-30 overflow-hidden hidden group-hover:block"
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="px-3 py-2 border-b border-space-700">
        <h4 className="text-xs font-medium text-space-300">视图预设</h4>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {presets.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-space-500">
            暂无保存的视图预设
          </div>
        ) : (
          presets.map(preset => (
            <div
              key={preset.id}
              className={cn(
                'group/item px-3 py-2 border-b border-space-700/50 hover:bg-space-700/50 transition-colors cursor-pointer',
                isPresetActive(preset.viewCondition) && 'bg-space-700/30'
              )}
              onClick={() => applyViewCondition(preset.viewCondition)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark size={12} className="text-space-500" />
                  <span className="text-xs text-space-200">{preset.name}</span>
                  {isPresetActive(preset.viewCondition) && (
                    <Check size={12} className="text-aviation-green" />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除此视图预设？')) {
                      deletePreset(preset.id);
                    }
                  }}
                  className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-space-600 rounded text-space-500 hover:text-aviation-red transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1 ml-5">
                <span className="text-[10px] text-space-500 font-mono">
                  ×{preset.viewCondition.zoom.toFixed(1)}
                </span>
                <span className="text-[10px] text-space-500">
                  {preset.createdBy} · {formatTime(preset.createdAt)}
                </span>
              </div>
              {preset.viewCondition.filters.status && (
                <div className="ml-5 mt-1">
                  <span className="text-[9px] text-space-500">
                    筛选: {preset.viewCondition.filters.status.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
