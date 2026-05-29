import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ChargeMesh } from './ChargeMesh';
import { FieldLines } from './FieldLines';
import { TestPointMesh } from './TestPointMesh';
import { GridHelper } from './GridHelper';
import { AnomalyMarkers } from './AnomalyMarker';
import { useStore } from '@/store/useStore';

export function Scene3D() {
  const charges = useStore((s) => s.charges);
  const selectedChargeId = useStore((s) => s.selectedChargeId);

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => {
        useStore.getState().selectCharge(null);
        useStore.getState().selectTestPoint(null);
      }}
    >
      <PerspectiveCamera makeDefault position={[0, -8, 12]} fov={50} />

      <color attach="background" args={['#060a18']} />

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      <Stars
        radius={50}
        depth={50}
        count={1500}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />

      <GridHelper />

      {charges.map((charge) => (
        <ChargeMesh
          key={charge.id}
          id={charge.id}
          position={charge.position}
          magnitude={charge.magnitude}
          label={charge.label}
          isSelected={charge.id === selectedChargeId}
        />
      ))}

      <FieldLines />
      <TestPointMesh />
      <AnomalyMarkers />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={30}
        enablePan
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.3}
          intensity={0.6}
        />
      </EffectComposer>
    </Canvas>
  );
}
