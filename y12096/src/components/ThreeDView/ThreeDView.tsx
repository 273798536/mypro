import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SolidOfRevolution } from './SolidOfRevolution';
import { Grid, AxesHelper } from './Grid';
import { useParamStore } from '../../store/useParamStore';
import { useViewStore } from '../../store/useViewStore';

function CameraController() {
  const { camera } = useThree();
  const { cameraPosition, cameraTarget } = useViewStore();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(...cameraPosition);
    camera.lookAt(...cameraTarget);
    if (controlsRef.current) {
      controlsRef.current.target.set(...cameraTarget);
      controlsRef.current.update();
    }
  }, [camera, cameraPosition, cameraTarget]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={20}
      onEnd={() => {
        if (controlsRef.current) {
          useViewStore.getState().setCameraPosition([
            camera.position.x,
            camera.position.y,
            camera.position.z,
          ]);
          useViewStore.getState().setCameraTarget([
            controlsRef.current.target.x,
            controlsRef.current.target.y,
            controlsRef.current.target.z,
          ]);
        }
      }}
    />
  );
}

function Scene() {
  const { functionExpr, rotationAxis, axisOffset, intervalA, intervalB, sliceCount, showSlices } =
    useParamStore();

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#93c5fd" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#fbbf24" />
      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={0.5} />
      <Grid />
      <AxesHelper />
      <SolidOfRevolution
        functionExpr={functionExpr}
        intervalA={intervalA}
        intervalB={intervalB}
        rotationAxis={rotationAxis}
        axisOffset={axisOffset}
        sliceCount={sliceCount}
        showSlices={showSlices}
      />
      <CameraController />
    </>
  );
}

export function ThreeDView() {
  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
    >
      <fog attach="fog" args={['#0f172a', 8, 25]} />
      <Scene />
    </Canvas>
  );
}
