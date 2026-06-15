import {
  Layers,
  Grid3X3,
  RotateCcw,
  Maximize2,
  Clock,
  Slice,
  Filter,
  X
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DATA_TYPE_LABELS, STATUS_LABELS, QUALITY_ISSUE_LABELS } from '@/types';
import type { DataType, DataStatus, QualityIssue } from '@/types';

export function SceneControls() {
  const { sceneSettings, setSceneSettings, filters, setFilters } = useDataStore();
  const [showFilters, setShowFilters] = useState(false);

  const viewPresets = [
    { label: '俯视图', position: [0, 400, 0.1] },
    { label: '正视图', position: [0, 100, 300] },
    { label: '侧视图', position: [300, 100, 0] },
    { label: '斜视图', position: [200, 150, 200] },
  ];

  const toggleType = (type: DataType) => {
    const current = filters.type || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setFilters({ type: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (status: DataStatus) => {
    const current = filters.status || [];
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ status: next.length > 0 ? next : undefined });
  };

  const toggleIssue = (issue: QualityIssue) => {
    const current = filters.qualityIssues || [];
    const next = current.includes(issue)
      ? current.filter(i => i !== issue)
      : [...current, issue];
    setFilters({ qualityIssues: next.length > 0 ? next : undefined });
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 flex flex-col gap-2">
          <button
            onClick={() => setSceneSettings({ showWireframe: !sceneSettings.showWireframe })}
            className={cn(
              'p-2 rounded-lg transition-all',
              sceneSettings.showWireframe ? 'bg-[#0A2463] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title="线框模式"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSceneSettings({ showGrid: !sceneSettings.showGrid })}
            className={cn(
              'p-2 rounded-lg transition-all',
              sceneSettings.showGrid ? 'bg-[#0A2463] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title="显示网格"
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSceneSettings({ autoRotate: !sceneSettings.autoRotate })}
            className={cn(
              'p-2 rounded-lg transition-all',
              sceneSettings.autoRotate ? 'bg-[#0A2463] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title="自动旋转"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSceneSettings({ clippingEnabled: !sceneSettings.clippingEnabled })}
            className={cn(
              'p-2 rounded-lg transition-all',
              sceneSettings.clippingEnabled ? 'bg-[#0A2463] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title="剖切模式"
          >
            <Slice className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'p-2 rounded-lg transition-all',
              showFilters ? 'bg-[#0A2463] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title="筛选"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {sceneSettings.clippingEnabled && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 剖切高度
            </p>
            <input
              type="range"
              min="-50"
              max="100"
              value={sceneSettings.clippingPlaneY}
              onChange={(e) => setSceneSettings({ clippingPlaneY: Number(e.target.value) })}
              className="w-full accent-[#0A2463]"
            />
            <p className="text-xs text-gray-500 text-center mt-1">
              {sceneSettings.clippingPlaneY} m
            </p>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 时间
          </p>
          <input
            type="range"
            min="0"
            max="24"
            step="0.5"
            value={sceneSettings.timeOfDay}
            onChange={(e) => setSceneSettings({ timeOfDay: Number(e.target.value) })}
            className="w-32 accent-[#0A2463]"
          />
          <p className="text-xs text-gray-500 text-center mt-1">
            {String(Math.floor(sceneSettings.timeOfDay)).padStart(2, '0')}:{String(Math.floor((sceneSettings.timeOfDay % 1) * 60)).padStart(2, '0')}
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2">
          <p className="text-xs font-semibold text-gray-700 mb-2">视图</p>
          <div className="flex flex-col gap-1">
            {viewPresets.map((preset, idx) => (
              <button
                key={idx}
                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-[#0A2463] hover:text-white transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="absolute top-4 left-20 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-4 w-72 max-h-[80vh] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">数据筛选</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">数据类型</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DATA_TYPE_LABELS) as DataType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filters.type?.includes(type)
                        ? 'bg-[#0A2463] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>
                    {DATA_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">数据状态</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as DataStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filters.status?.includes(status)
                        ? 'bg-[#0A2463] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">质量问题</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(QUALITY_ISSUE_LABELS) as QualityIssue[]).map((issue) => (
                  <button
                    key={issue}
                    onClick={() => toggleIssue(issue)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filters.qualityIssues?.includes(issue)
                        ? 'bg-[#E63946] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {QUALITY_ISSUE_LABELS[issue]}
                  </button>
                ))}
              </div>
            </div>

            {(filters.type || filters.status || filters.qualityIssues) && (
              <button
                onClick={() => setFilters({ type: undefined, status: undefined, qualityIssues: undefined })}
                className="w-full py-2 text-sm text-[#E63946] font-medium hover:bg-[#E63946]10 rounded-lg transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2A9D8F]" />
            <span className="text-gray-600">正常</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#E63946]" />
            <span className="text-gray-600">异常</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 rounded bg-gradient-to-r from-[#3E92CC] via-[#E9C46A] to-[#E63946]" />
            <span className="text-gray-600">负荷</span>
          </div>
        </div>
      </div>
    </>
  );
}
