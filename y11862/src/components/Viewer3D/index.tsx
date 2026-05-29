import { useMemo, useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { SpectrumBars } from './SpectrumBars';
import { AxesGrid } from './AxesGrid';
import { SceneSetup } from './SceneSetup';
import { useSpectrumStore } from '../../store/spectrumStore';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer';
import { useViewport } from '../../hooks/useViewport';

interface SceneContentProps {
  onControlsReady: (controls: OrbitControlsImpl | null) => void;
  onCameraReady: (camera: THREE.PerspectiveCamera | null) => void;
}

function SceneContent({ onControlsReady, onCameraReady }: SceneContentProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const doubleClickRef = useRef<number>(0);

  const handleDoubleClick = useCallback(() => {
    const now = performance.now();
    if (now - doubleClickRef.current < 300) {
      camera.position.set(30, 25, 30);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
    doubleClickRef.current = now;
  }, [camera]);

  useMemo(() => {
    onCameraReady(camera as THREE.PerspectiveCamera);
  }, [camera, onCameraReady]);

  useFrame(() => {});

  const {
    analysisResult,
    visualParams,
    selectedPeak,
    hoveredPeak,
    setSelectedPeak,
    setHoveredPeak,
  } = useSpectrumStore();

  const { findPeaks } = useAudioAnalyzer();

  const peaks = useMemo(() => {
    if (!analysisResult) return [];
    return findPeaks(analysisResult, visualParams.energyThreshold + 20);
  }, [analysisResult, findPeaks, visualParams.energyThreshold]);

  if (!analysisResult) return null;

  return (
    <group onClick={handleDoubleClick}>
      <SceneSetup />

      <SpectrumBars
        frames={analysisResult.frames}
        duration={analysisResult.duration}
        sampleRate={analysisResult.sampleRate}
        params={visualParams}
        peaks={peaks}
        selectedPeak={selectedPeak}
        hoveredPeak={hoveredPeak}
        onPeakHover={setHoveredPeak}
        onPeakSelect={setSelectedPeak}
      />

      <AxesGrid
        showGrid={visualParams.showGrid}
        showAxes={visualParams.showAxes}
        duration={analysisResult.duration}
      />

      <OrbitControls
        ref={(ref) => {
          controlsRef.current = ref as unknown as OrbitControlsImpl | null;
          onControlsReady(ref as unknown as OrbitControlsImpl | null);
        }}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </group>
  );
}

export function Viewer3D() {
  const { analysisResult } = useSpectrumStore();
  const { setControls, setCamera } = useViewport();

  const handleControlsReady = useCallback((controls: OrbitControlsImpl | null) => {
    setControls(controls);
  }, [setControls]);

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera | null) => {
    setCamera(camera);
  }, [setCamera]);

  if (!analysisResult) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30">
            <svg className="w-12 h-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            音乐频谱雕塑台
          </h2>
          <p className="text-gray-400 text-sm max-w-xs">
            拖拽上传音频文件，或点击右侧"加载样例"按钮开始探索
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              <span>频率轴</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>能量轴</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>时间轴</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [30, 25, 30], fov: 45 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <SceneContent onControlsReady={handleControlsReady} onCameraReady={handleCameraReady} />
    </Canvas>
  );
}
