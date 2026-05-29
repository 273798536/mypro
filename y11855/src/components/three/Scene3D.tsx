import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneData } from '../../types';
import { useAppStore, useFilteredBuildings } from '../../store/useAppStore';
import { GroundGrid } from './GroundGrid';
import { Runway3D } from './Runway3D';
import { Building3D } from './Building3D';
import { Surface3D } from './Surface3D';

interface SceneContentProps {
  scene: SceneData;
}

function SceneContent({ scene }: SceneContentProps) {
  const filteredBuildings = useFilteredBuildings();
  const filteredIds = new Set(filteredBuildings.map(b => b.id));
  const setSelectedElement = useAppStore(state => state.setSelectedElement);
  const { camera } = useThree();

  useEffect(() => {
    const maxBuildingHeight = Math.max(...scene.buildings.map(b => b.height), 100);
    const maxSurfaceHeight = Math.max(...scene.surfaces.map(s => s.maxHeight), 100);
    const maxHeight = Math.max(maxBuildingHeight, maxSurfaceHeight);
    const sceneSize = Math.max(scene.runway.length * 2, 8000);
    
    camera.position.set(sceneSize * 0.8, maxHeight * 2.5, sceneSize * 0.8);
    camera.lookAt(0, 0, 0);
  }, [scene, camera]);

  const handleCanvasClick = () => {
    setSelectedElement(null);
  };

  return (
    <group onClick={handleCanvasClick}>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5000, 8000, 3000]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50000}
        shadow-camera-left={-10000}
        shadow-camera-right={10000}
        shadow-camera-top={10000}
        shadow-camera-bottom={-10000}
      />
      <directionalLight
        position={[-3000, 4000, -2000]}
        intensity={0.4}
      />
      <hemisphereLight args={[0x87ceeb, 0x0a1628, 0.3]} />

      <GroundGrid size={20000} divisions={200} />

      {scene.runway && <Runway3D runway={scene.runway} />}

      {scene.surfaces.map(surface => (
        <Surface3D key={surface.id} surface={surface} />
      ))}

      {scene.buildings.map(building => (
        <Building3D
          key={building.id}
          building={building}
          isFiltered={filteredIds.has(building.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={100}
        maxDistance={30000}
        maxPolarAngle={Math.PI / 2.1}
        makeDefault
      />
    </group>
  );
}

interface Scene3DProps {
  scene: SceneData;
}

export function Scene3D({ scene }: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ background: '#0a1628' }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera
          makeDefault
          position={[5000, 3000, 5000]}
          fov={50}
          near={10}
          far={100000}
        />
        <fog attach="fog" args={['#0a1628', 15000, 35000]} />
        <color attach="background" args={['#0a1628']} />
        <SceneContent scene={scene} />
      </Canvas>
    </div>
  );
}
