import { useCallback, useRef, useState, useEffect } from 'react';
import { Camera, Save, Trash2, Eye } from 'lucide-react';
import type { Viewpoint } from '@/types';
import { useDetectionStore } from '@/store/detectionStore';
import { useCurrentViewpoint, useApplyViewpoint } from '@/hooks/useViewpoint';
import { saveViewpoints, exportToJson, importFromJson } from '@/utils/storage';
import { clsx } from '@/lib/utils';

export function ViewpointMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [viewpointName, setViewpointName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const savedViewpoints = useDetectionStore((s) => s.savedViewpoints);
  const addViewpoint = useDetectionStore((s) => s.addViewpoint);
  const removeViewpoint = useDetectionStore((s) => s.removeViewpoint);
  const setSavedViewpoints = useDetectionStore((s) => s.setSavedViewpoints);

  const getCurrentViewpoint = useCurrentViewpoint();
  const applyViewpoint = useApplyViewpoint();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveViewpoint = useCallback(async () => {
    const viewpoint = await getCurrentViewpoint();
    if (viewpoint) {
      const newViewpoint: Viewpoint = {
        ...viewpoint,
        id: `vp-${Date.now()}`,
        name: viewpointName || `视角 ${savedViewpoints.length + 1}`,
        createdAt: Date.now(),
      };
      addViewpoint(newViewpoint);
      saveViewpoints([...savedViewpoints, newViewpoint]);
      setViewpointName('');
      setIsOpen(false);
    }
  }, [viewpointName, savedViewpoints, getCurrentViewpoint, addViewpoint]);

  const handleApplyViewpoint = useCallback(
    (viewpoint: Viewpoint) => {
      applyViewpoint(viewpoint);
      setIsOpen(false);
    },
    [applyViewpoint]
  );

  const handleDeleteViewpoint = useCallback(
    (id: string) => {
      removeViewpoint(id);
      saveViewpoints(savedViewpoints.filter((v) => v.id !== id));
    },
    [savedViewpoints, removeViewpoint]
  );

  const handleExport = useCallback(() => {
    exportToJson(savedViewpoints, `viewpoints-${Date.now()}.json`);
  }, [savedViewpoints]);

  const handleImport = useCallback(async () => {
    const data = await importFromJson<Viewpoint[]>();
    if (data && Array.isArray(data)) {
      setSavedViewpoints(data);
      saveViewpoints(data);
    }
  }, [setSavedViewpoints]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
          'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300',
          'border border-slate-700 hover:border-slate-600',
          isOpen && 'ring-2 ring-blue-500/50'
        )}
      >
        <Camera size={16} />
        <span>视角</span>
        <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
          {savedViewpoints.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800/95 backdrop-blur-md rounded-lg border border-slate-700 shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="输入视角名称..."
                  value={viewpointName}
                  onChange={(e) => setViewpointName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveViewpoint();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSaveViewpoint}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                title="保存当前视角"
              >
                <Save size={14} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="flex-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded transition-colors"
              >
                导入
              </button>
              <button
                onClick={handleExport}
                className="flex-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded transition-colors"
              >
                导出
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {savedViewpoints.length === 0 ? (
              <div className="p-4 text-center">
                <Camera size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">暂无保存的视角</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  调整好视角后点击保存
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {savedViewpoints.map((vp) => (
                  <div
                    key={vp.id}
                    className="p-2 flex items-center gap-2 hover:bg-slate-700/30 group"
                  >
                    <button
                      onClick={() => handleApplyViewpoint(vp)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <Eye
                        size={14}
                        className="text-slate-500 group-hover:text-blue-400"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300 truncate">
                          {vp.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(vp.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteViewpoint(vp.id)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
