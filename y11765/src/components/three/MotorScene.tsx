import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Stator } from './Stator';
import { Rotor } from './Rotor';
import { Coil } from './Coil';
import { FieldArrows } from './FieldArrows';
import { SectionPlane } from './SectionPlane';
import type { MotorConfig } from '../../types';
import { checkCurrentDirectionConsistency } from '../../utils/magneticField';

interface MotorSceneProps {
  config: MotorConfig;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const SceneContent = ({ config, onCanvasReady }: MotorSceneProps) => {
  const { gl } = useThree();

  useEffect(() => {
    if (gl && onCanvasReady) {
      onCanvasReady(gl.domElement);
    }
  }, [gl, onCanvasReady]);

  useEffect(() => {
    checkCurrentDirectionConsistency(config.coils);
  }, [config.coils]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 + 0.1}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#60a5fa" />

      <Grid
        infiniteGrid
        fadeDistance={30}
        fadeStrength={1}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3748"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a5568"
      />

      {config.showStator && <Stator radius={3} height={2} teeth={12} />}
      {config.showRotor && <Rotor radius={1.8} height={1.8} poles={4} angle={config.rotorAngle} />}

      {config.coils.map((coil) => (
        <Coil key={coil.id} config={coil} />
      ))}

      {config.showFieldArrows && (
        <FieldArrows
          coils={config.coils}
          colorScale={config.colorScale}
          density={config.arrowDensity}
          scale={config.arrowScale}
          bounds={{
            min: new THREE.Vector3(-4, -1.5, -4),
            max: new THREE.Vector3(4, 1.5, 4),
          }}
        />
      )}

      {config.sectionPlane.visible && (
        <SectionPlane
          config={config.sectionPlane}
          coils={config.coils}
          colorScale={config.colorScale}
          size={8}
          resolution={25}
        />
      )}
    </>
  );
};

export const MotorScene = ({ config, onCanvasReady }: MotorSceneProps) => {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <SceneContent config={config} onCanvasReady={onCanvasReady} />
    </Canvas>
  );
};
