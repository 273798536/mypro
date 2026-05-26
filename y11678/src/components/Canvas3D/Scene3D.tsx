import { useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { QuadricSurface } from './QuadricSurface';
import { SlicePlane } from './SlicePlane';
import { useStore } from '../../store/useStore';
import { ComputationWarning, HoverInfo } from '../../types';
import { evaluateQuadric, computeGradient } from '../../math/quadric';

interface SceneProps {
  glRef?: React.MutableRefObject<THREE.WebGLRenderer | null>;
}

function SceneContent({ glRef }: SceneProps) {
  const { gl, camera } = useThree();
  const surface = useStore((state) => state.surface);
  const slicePlane = useStore((state) => state.slicePlane);
  const addWarning = useStore((state) => state.addWarning);
  const setHoverInfo = useStore((state) => state.setHoverInfo);
  const controlsRef = useRef<any>(null);

  if (glRef && gl) {
    glRef.current = gl;
  }

  const handleWarnings = useCallback(
    (warnings: ComputationWarning[]) => {
      warnings.forEach((w) => addWarning(w));
    },
    [addWarning]
  );

  const handlePointerMove = useCallback(
    (event: any) => {
      const { point } = event;
      const value = evaluateQuadric(
        surface.equation,
        point.x,
        point.y,
        point.z
      );
      const gradient = computeGradient(
        surface.equation,
        point.x,
        point.y,
        point.z
      );

      const screenPos = point.clone();
      screenPos.project(camera);
      const x = (screenPos.x + 1) / 2 * window.innerWidth;
      const y = (-screenPos.y + 1) / 2 * window.innerHeight;

      const info: Partial<HoverInfo> = {
        visible: true,
        position: { x, y },
        worldPosition: { x: point.x, y: point.y, z: point.z },
        value,
        gradient,
      };
      setHoverInfo(info);
    },
    [surface.equation, setHoverInfo, camera]
  );

  const handlePointerOut = useCallback(() => {
    setHoverInfo({ visible: false });
  }, [setHoverInfo]);

  const setSlicePlane = useStore((state) => state.setSlicePlane);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#ffaa77" />
      <pointLight position={[0, 10, 0]} intensity={0.3} color="#00d4ff" />

      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3a4a6a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00d4ff"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <axesHelper args={[5]} />

      <group onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
        <QuadricSurface params={surface} onWarnings={handleWarnings} />
        <SlicePlane
          plane={slicePlane}
          bounds={surface.bounds}
          equation={surface.equation}
          onPlaneChange={setSlicePlane}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={2}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export function Scene3D({ glRef }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [6, 6, 6], fov: 60 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a1628');
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent glRef={glRef} />
    </Canvas>
  );
}
