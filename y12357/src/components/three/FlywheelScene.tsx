import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import { FlywheelMesh } from './FlywheelMesh';
import { FrictionHeatRing } from './FrictionHeatRing';
import { SceneControls } from './SceneControls';
import { usePlayback } from '../../hooks/usePlayback';
import { useSelectedFlywheel, useFlywheelErrors } from '../../store/useAppStore';

type ViewMode = 'front' | 'side' | 'top' | 'cutaway';

export function FlywheelScene() {
  const flywheel = useSelectedFlywheel();
  const { samplingGaps: gaps } = useFlywheelErrors(flywheel?.id);
  const [viewMode, setViewMode] = useState<ViewMode>('front');
  const { getCurrentVelocity, currentTime, isPlaying } = usePlayback();
  
  const currentVelocity = getCurrentVelocity();
  const omega = currentVelocity?.omega || 0;
  
  const displayRadius = flywheel ? Math.max(flywheel.radius * 2, 0.5) : 0.5;
  
  const coordinateAxes = useMemo(() => {
    if (!flywheel) return null;
    const r = displayRadius;
    
    return (
      <group>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), r * 1.2, '#EF4444']} />
          <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), r * 1.2, '#10B981']} />
          <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), r * 1.2, '#3B82F6']} />
        </group>
      </group>
    );
  }, [displayRadius, flywheel]);
  
  return (
    <div className="relative w-full h-full">
      <Canvas shadows className="bg-industrial-950">
        <SceneControls view={viewMode} targetRadius={displayRadius} />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[displayRadius * 2, displayRadius * 3, displayRadius * 2]} 
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-displayRadius * 2, displayRadius, -displayRadius]} intensity={0.5} color="#60A5FA" />
        <pointLight position={[0, -displayRadius, 0]} intensity={0.3} />
        
        <Environment preset="city" />
        
        <Grid 
          cellSize={displayRadius * 0.5} 
          cellThickness={0.5} 
          cellColor="#3A404B"
          sectionSize={displayRadius * 2}
          sectionThickness={1}
          sectionColor="#525A68"
          fadeDistance={displayRadius * 8}
          fadeStrength={1}
          followCamera={false}
          position={[0, -displayRadius * 0.5, 0]}
          rotation={[0, 0, 0]}
        />
        
        {flywheel && (
          <>
            <FlywheelMesh
              flywheel={flywheel}
              omega={omega}
              currentTime={currentTime}
              gaps={gaps.filter(g => g.flywheelId === flywheel.id)}
            />
            <FrictionHeatRing
              frictionCoeff={flywheel.frictionCoeff}
              radius={displayRadius}
              isActive={isPlaying}
            />
          </>
        )}
        
        {coordinateAxes}
        
        <Effects>
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <FXAA />
            <Bloom 
              luminanceThreshold={0.2} 
              luminanceSmoothing={0.9} 
              intensity={0.3} 
              mipmapBlur
            />
          </EffectComposer>
        </Effects>
      </Canvas>
      
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {(['front', 'side', 'top', 'cutaway'] as ViewMode[]).map(view => (
          <button
            key={view}
            onClick={() => setViewMode(view)}
            className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-all ${
              viewMode === view
                ? 'bg-tech-500 text-white'
                : 'bg-industrial-800/80 text-industrial-400 hover:bg-industrial-700 hover:text-industrial-200'
            }`}
          >
            {view === 'front' && '正视'}
            {view === 'side' && '侧视'}
            {view === 'top' && '俯视'}
            {view === 'cutaway' && '剖切'}
          </button>
        ))}
      </div>
      
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-alert-red" />
          <span className="text-industrial-400">X轴</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-alert-green" />
          <span className="text-industrial-400">Y轴</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-tech-500" />
          <span className="text-industrial-400">Z轴</span>
        </div>
      </div>
      
      {flywheel && (
        <div className="absolute top-4 left-4 industrial-card p-3">
          <div className="data-label">当前角速度</div>
          <div className="data-value text-lg text-tech-400">{omega.toFixed(2)} rad/s</div>
          <div className="data-label mt-2">当前时间</div>
          <div className="data-value">{currentTime.toFixed(2)}s</div>
        </div>
      )}
    </div>
  );
}
