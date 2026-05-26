import { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { Scene3D } from './components/Canvas3D/Scene3D';
import { EquationControls } from './components/ControlPanel/EquationControls';
import { SliceControls } from './components/ControlPanel/SliceControls';
import { PresetManager } from './components/PresetManager/PresetManager';
import { WarningPanel } from './components/WarningPanel/WarningPanel';
import { HoverTooltip } from './components/Tooltip/HoverTooltip';
import { TopToolbar } from './components/Toolbar/TopToolbar';

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-space-900 z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-primary-500 font-display">加载3D场景中...</p>
      </div>
    </div>
  );
}

function App() {
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  return (
    <div className="w-full h-screen bg-space-900 relative overflow-hidden">
      <Suspense fallback={<LoadingSpinner />}>
        <Scene3D glRef={glRef} />
      </Suspense>
      
      <TopToolbar glRef={glRef} />
      
      <HoverTooltip />
      
      <div className="absolute left-4 top-20 bottom-4 w-80 overflow-y-auto space-y-4 z-30 pr-2">
        <EquationControls />
        <SliceControls />
      </div>
      
      <div className="absolute right-4 top-20 bottom-4 w-72 overflow-y-auto space-y-4 z-30 pl-2">
        <PresetManager />
        <WarningPanel />
      </div>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="glass-card px-4 py-2 text-xs text-space-400">
          <span className="mr-4">🖱️ 左键拖拽旋转</span>
          <span className="mr-4">🖱️ 右键拖拽平移</span>
          <span className="mr-4">🔄 滚轮缩放</span>
          <span>✋ 拖拽切片平面调整位置</span>
        </div>
      </div>
    </div>
  );
}

export default App;
