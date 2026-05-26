import { useRef, useCallback } from 'react';
import { Camera, RotateCcw, Info, Github } from 'lucide-react';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';

interface TopToolbarProps {
  glRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
}

export function TopToolbar({ glRef }: TopToolbarProps) {
  const resetSurface = useStore((state) => state.resetSurface);
  const surfaceName = useStore((state) => state.surface.name);

  const handleScreenshot = useCallback(() => {
    if (glRef.current) {
      const gl = glRef.current;
      gl.render(gl.scene, gl.camera);
      const dataURL = gl.domElement.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `quadric-surface-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  }, [glRef]);

  return (
    <div className="absolute top-0 left-0 right-0 z-40 p-4">
      <div className="flex items-center justify-between">
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">∑</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-primary-500">
                数学曲面切片探索器
              </h1>
              <p className="text-xs text-space-400">
                交互式二次曲面可视化工具
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-2">
            <span className="text-xs text-space-400">当前曲面: </span>
            <span className="text-sm font-medium text-primary-500">
              {surfaceName}
            </span>
          </div>

          <div className="glass-card p-2 flex items-center gap-1">
            <button
              onClick={handleScreenshot}
              className="p-2 rounded-lg hover:bg-space-600 transition-colors group"
              title="导出截图"
            >
              <Camera
                size={18}
                className="text-space-400 group-hover:text-primary-500 transition-colors"
              />
            </button>
            <button
              onClick={resetSurface}
              className="p-2 rounded-lg hover:bg-space-600 transition-colors group"
              title="重置为默认"
            >
              <RotateCcw
                size={18}
                className="text-space-400 group-hover:text-primary-500 transition-colors"
              />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-space-600 transition-colors group"
              title="关于"
            >
              <Info
                size={18}
                className="text-space-400 group-hover:text-primary-500 transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
