import { useState, useRef } from 'react';
import {
  Camera,
  Save,
  Scissors,
  Grid3X3,
  Axis3D,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function Toolbar() {
  const viewportSettings = useWorkspaceStore((state) => state.viewportSettings);
  const updateViewportSettings = useWorkspaceStore((state) => state.updateViewportSettings);
  const addSectionPlane = useWorkspaceStore((state) => state.addSectionPlane);
  const sectionPlanes = useWorkspaceStore((state) => state.sectionPlanes);
  const saveSnapshot = useWorkspaceStore((state) => state.saveSnapshot);
  const currentFormula = useWorkspaceStore((state) => state.currentFormula);
  const parameters = useWorkspaceStore((state) => state.parameters);
  
  const [showSettings, setShowSettings] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        
        saveSnapshot(true, dataUrl);
        
        const link = document.createElement('a');
        link.download = `implicit-surface-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
      setIsCapturing(false);
    }, 100);
  };

  const handleSaveSnapshot = () => {
    saveSnapshot(false);
  };

  const handleAddSectionPlane = (axis: 'x' | 'y' | 'z') => {
    const normals: Record<string, [number, number, number]> = {
      x: [1, 0, 0],
      y: [0, 1, 0],
      z: [0, 0, 1],
    };
    const colors: Record<string, string> = {
      x: '#ff6b6b',
      y: '#4ecdc4',
      z: '#45b7d1',
    };
    
    const planeId = addSectionPlane();
    const lastPlane = sectionPlanes[sectionPlanes.length - 1];
    if (lastPlane) {
      useWorkspaceStore.getState().updateSectionPlane(lastPlane.id, {
        normal: normals[axis],
        color: colors[axis],
      });
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-slate-700 shadow-xl">
        <button
          onClick={handleCaptureScreenshot}
          disabled={isCapturing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
            isCapturing
              ? 'bg-cyan-600/50 text-cyan-200 cursor-wait'
              : 'hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
          title="导出截图"
        >
          <Camera size={14} />
          <span className="hidden sm:inline">截图</span>
        </button>

        <button
          onClick={handleSaveSnapshot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="保存快照"
        >
          <Save size={14} />
          <span className="hidden sm:inline">保存</span>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1"></div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              showSettings ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="截面控制"
          >
            <Scissors size={14} />
            <span className="hidden sm:inline">截面</span>
            {sectionPlanes.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-[10px] flex items-center justify-center">
                {sectionPlanes.length}
              </span>
            )}
          </button>

          {showSettings && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 rounded-lg border border-slate-700 shadow-xl p-3">
              <p className="text-[11px] text-slate-400 mb-2">添加截面平面</p>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handleAddSectionPlane('x')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-300 text-xs transition-colors"
                >
                  <span className="font-bold text-red-400">X</span>
                  轴
                </button>
                <button
                  onClick={() => handleAddSectionPlane('y')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded bg-slate-800 hover:bg-emerald-900/30 text-slate-300 hover:text-emerald-300 text-xs transition-colors"
                >
                  <span className="font-bold text-emerald-400">Y</span>
                  轴
                </button>
                <button
                  onClick={() => handleAddSectionPlane('z')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded bg-slate-800 hover:bg-blue-900/30 text-slate-300 hover:text-blue-300 text-xs transition-colors"
                >
                  <span className="font-bold text-blue-400">Z</span>
                  轴
                </button>
              </div>

              {sectionPlanes.length > 0 && (
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-[11px] text-slate-400 mb-2">已添加的截面</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {sectionPlanes.map((plane, index) => (
                      <div
                        key={plane.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/50"
                      >
                        <span className="text-xs text-slate-300">平面 {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: plane.color }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1"></div>

        <button
          onClick={() => updateViewportSettings({ showGrid: !viewportSettings.showGrid })}
          className={`p-1.5 rounded transition-colors ${
            viewportSettings.showGrid ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
          title="显示/隐藏网格"
        >
          <Grid3X3 size={14} />
        </button>

        <button
          onClick={() => updateViewportSettings({ showAxes: !viewportSettings.showAxes })}
          className={`p-1.5 rounded transition-colors ${
            viewportSettings.showAxes ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
          title="显示/隐藏坐标轴"
        >
          <Axis3D size={14} />
        </button>
      </div>

      {isCapturing && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-cyan-600 text-white text-xs rounded shadow-lg animate-pulse">
          正在捕获截图...
        </div>
      )}
    </div>
  );
}
