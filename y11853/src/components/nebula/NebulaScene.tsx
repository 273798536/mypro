import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '../../types/asset';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { NebulaPoints } from './NebulaPoints';
import { NebulaAxes } from './NebulaAxes';
import { StarField, PostProcessing, SceneLighting } from './NebulaEffects';

interface NebulaSceneProps {
  className?: string;
}

function CameraController() {
  const { camera } = useThree();
  const selectedAssetId = useUIStore(s => s.selectedAssetId);
  const activeRun = useUIStore(s => s.activeRun);
  const result = useDataStore(s => 
    activeRun === 'first' || activeRun === 'comparison'
      ? s.firstRunResult
      : s.secondRunResult
  );
  
  useEffect(() => {
    if (!selectedAssetId || !result) return;
    
    const asset = result.assets.find(a => a.id === selectedAssetId);
    if (!asset) return;
    
    const targetPosition = new THREE.Vector3(
      asset.position.x + 8,
      asset.position.y + 6,
      asset.position.z + 8
    );
    
    const startPosition = camera.position.clone();
    const startTime = Date.now();
    const duration = 800;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      camera.lookAt(asset.position.x, asset.position.y, asset.position.z);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [selectedAssetId, result, camera]);
  
  return null;
}

function SceneContent({ firstRunAssets, secondRunAssets }: { firstRunAssets: Asset[]; secondRunAssets: Asset[] }) {
  const showAxes = useUIStore(s => s.showAxes);
  const showGrid = useUIStore(s => s.showGrid);
  const activeRun = useUIStore(s => s.activeRun);
  const isPlaying = useUIStore(s => s.isPlaying);
  const currentTimeIndex = useUIStore(s => s.currentTimeIndex);
  const setCurrentTimeIndex = useUIStore(s => s.setCurrentTimeIndex);
  const setIsPlaying = useUIStore(s => s.setIsPlaying);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const next = (useUIStore.getState().currentTimeIndex + 1) % 24;
      setCurrentTimeIndex(next);
    }, 300);
    
    return () => clearInterval(interval);
  }, [isPlaying, setCurrentTimeIndex, setIsPlaying]);
  
  const showFirstRun = activeRun === 'first' || activeRun === 'comparison';
  const showSecondRun = activeRun === 'second' || (activeRun === 'comparison' && secondRunAssets.length > 0);
  
  return (
    <>
      <StarField />
      <SceneLighting />
      <NebulaAxes showAxes={showAxes} showGrid={showGrid} />
      
      {showFirstRun && firstRunAssets.length > 0 && (
        <group position={activeRun === 'comparison' && showSecondRun ? [-6, 0, 0] : [0, 0, 0]}>
          <NebulaPoints
            assets={firstRunAssets}
            runType="first"
            showComparison={activeRun === 'comparison'}
          />
        </group>
      )}
      
      {showSecondRun && secondRunAssets.length > 0 && (
        <group position={activeRun === 'comparison' && showFirstRun ? [6, 0, 0] : [0, 0, 0]}>
          <NebulaPoints
            assets={secondRunAssets}
            runType="second"
            showComparison={activeRun === 'comparison'}
          />
        </group>
      )}
      
      <PostProcessing />
      <CameraController />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        makeDefault
      />
    </>
  );
}

export function NebulaScene({ className }: NebulaSceneProps) {
  const firstRunAssets = useDataStore(s => s.firstRunAssets);
  const secondRunAssets = useDataStore(s => s.secondRunAssets);
  
  const handleSceneClick = () => {
    useUIStore.getState().setSelectedAssetId(null);
  };
  
  return (
    <div className={className} onClick={handleSceneClick}>
      <Canvas
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: '#0A0E1A' }}
      >
        <fog attach="fog" args={['#0A0E1A', 20, 80]} />
        <color attach="background" args={['#0A0E1A']} />
        <SceneContent firstRunAssets={firstRunAssets} secondRunAssets={secondRunAssets} />
      </Canvas>
    </div>
  );
}
