
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { Airfoil, PressureField } from '../../types';
import { AirfoilMesh } from './AirfoilMesh';
import { SamplingPoints3D } from './SamplingPoints3D';
import { FlowLines } from './FlowLines';

interface AirfoilSceneProps {
  airfoil: Airfoil;
  angleOfAttack: number;
  velocity: number;
  pressureField: PressureField | null;
  showSamplingPoints?: boolean;
  showFlowLines?: boolean;
}

function SceneContent({
  airfoil,
  angleOfAttack,
  velocity,
  pressureField,
  showSamplingPoints = true,
  showFlowLines = true,
}: AirfoilSceneProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />

      <Grid
        args={[10, 10]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3748"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a5568"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.5, 0]}
      />

      <AirfoilMesh
        airfoil={airfoil}
        angleOfAttack={angleOfAttack}
        pressureField={pressureField}
      />

      {showSamplingPoints && <SamplingPoints3D pressureField={pressureField} />}

      {showFlowLines && <FlowLines velocity={velocity} angleOfAttack={angleOfAttack} />}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={10}
        target={[0.5, 0, 0]}
      />
    </>
  );
}

export function AirfoilScene(props: AirfoilSceneProps) {
  return (
    <Canvas
      camera={{ position: [2, 1.5, 3], fov: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      shadows
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
