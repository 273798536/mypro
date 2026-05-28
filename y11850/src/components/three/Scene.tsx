import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PCFSoftShadowMap, ACESFilmicToneMapping } from 'three';
import { useAppStore } from '@/store/useAppStore';
import { BuildingMesh } from './BuildingMesh';
import { SunLight } from './SunLight';
import { SunPathLine } from './SunPathLine';
import { Ground } from './Ground';
import { SetbackLine } from './SetbackLine';

function CameraController() {
  const { camera } = useThree();
  const { savedViews, saveView } = useAppStore();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        const name = prompt('保存视角名称:');
        if (name) {
          saveView({
            name,
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: controlsRef.current?.target ? 
              [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z] : 
              [0, 0, 0],
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, saveView]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={30}
      maxDistance={300}
      maxPolarAngle={Math.PI / 2 - 0.1}
      minPolarAngle={0.2}
      makeDefault
    />
  );
}

function SceneContent() {
  const { dataPackage, showShadows } = useAppStore();

  if (!dataPackage) {
    return (
      <>
        <ambientLight intensity={0.5} />
        <Ground />
      </>
    );
  }

  return (
    <>
      <Sky 
        distance={450000} 
        sunPosition={[100, 50, 100]} 
        inclination={0.5} 
        azimuth={0.25} 
      />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <SunLight />
      <SunPathLine />
      <Ground />

      {dataPackage.buildings.map((building) => (
        <BuildingMesh key={building.id} building={building} />
      ))}

      {dataPackage.setbackLines.map((line) => (
        <SetbackLine key={line.id} line={line} />
      ))}

      <CameraController />

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
          height={300} 
          intensity={0.5}
        />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  const { showShadows } = useAppStore();

  return (
    <Canvas
      shadows={showShadows}
      camera={{ position: [80, 60, 80], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = PCFSoftShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <fog attach="fog" args={['#0F172A', 100, 400]} />
      <SceneContent />
    </Canvas>
  );
}
