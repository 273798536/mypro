import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Rack } from './Rack';
import { AirVent } from './AirVent';
import { CableTray } from './CableTray';
import { Sensor } from './Sensor';
import { TemperatureField, Floor } from './TemperatureField';
import { mockRacks, mockVents, mockTrays, mockSensors } from '../../data/mockData';
import { useFilterStore } from '../../store/useFilterStore';
import { useSceneStore } from '../../store/useSceneStore';

function CameraController() {
  const { focusPosition } = useSceneStore();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (focusPosition && controlsRef.current) {
      controlsRef.current.target.set(...focusPosition);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={5}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 6}
    />
  );
}

function SceneContent() {
  const { selectedTypes, showTemperatureField } = useFilterStore();
  const { setSelectedObject, setDetailModalOpen } = useSceneStore();

  const handleBackgroundClick = () => {
    setSelectedObject(null);
    setDetailModalOpen(false);
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00D4FF" />

      <Floor />

      {showTemperatureField && <TemperatureField />}

      {selectedTypes.includes('rack') &&
        mockRacks.map((rack) => <Rack key={rack.id} rack={rack} />)}

      {selectedTypes.includes('vent') &&
        mockVents.map((vent) => <AirVent key={vent.id} vent={vent} />)}

      {selectedTypes.includes('tray') &&
        mockTrays.map((tray) => <CableTray key={tray.id} tray={tray} />)}

      {selectedTypes.includes('sensor') &&
        mockSensors
          .filter((s) => s.status !== 'normal')
          .map((sensor) => (
            <Sensor key={sensor.id} sensor={sensor} />
          ))}

      <mesh onClick={handleBackgroundClick}>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial color="#050a14" side={THREE.BackSide} />
      </mesh>

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#050a14' }}
    >
      <CameraController />
      <SceneContent />
    </Canvas>
  );
}
