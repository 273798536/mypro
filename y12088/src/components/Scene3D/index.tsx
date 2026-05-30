import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useSandboxStore, yards, cranes, truckRoutes } from '../../store/useSandboxStore';
import { interpolateRoutePosition } from '../../utils/conflictDetector';
import { YardGround } from './YardGround';
import { ContainerBox } from './ContainerBox';
import { Crane } from './Crane';
import { RadiusCircle } from './RadiusCircle';
import { TruckRouteLine, Truck } from './TruckRoute';
import { ConflictMarker } from './ConflictMarker';

const AnimationController: React.FC = () => {
  const { isPlaying, currentTime, setCurrentTime } = useSandboxStore();
  const lastTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      const newTime = currentTime + delta * 10;
      if (newTime > 100) {
        setCurrentTime(0);
      } else {
        setCurrentTime(newTime);
      }
    }
  });

  return null;
};

const SceneContent: React.FC = () => {
  const {
    currentYardId,
    craneRadius,
    minHeightFilter,
    maxHeightFilter,
    currentTime,
    conflicts,
  } = useSandboxStore();

  const yard = yards.find((y) => y.id === currentYardId) || yards[0];

  const craneColors = ['#165DFF', '#00B42A', '#FF7D00'];

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 30, 0]} intensity={0.5} color="#165DFF" />

      <YardGround width={yard.width} depth={yard.depth} />

      {yard.blocks.map((block) =>
        block.containers.map((container) => (
          <ContainerBox
            key={container.id}
            container={container}
            minHeightFilter={minHeightFilter}
            maxHeightFilter={maxHeightFilter}
          />
        ))
      )}

      {cranes.map((crane, index) => (
        <React.Fragment key={crane.id}>
          <Crane crane={crane} radiusScale={craneRadius} />
          <RadiusCircle
            position={crane.position}
            radius={Math.min(crane.radius, craneRadius)}
            color={craneColors[index % craneColors.length]}
          />
        </React.Fragment>
      ))}

      {truckRoutes.map((route) => (
        <TruckRouteLine key={route.id} route={route} />
      ))}

      {truckRoutes.map((route) => {
        const pos = interpolateRoutePosition(route, currentTime);
        if (!pos) return null;
        return <Truck key={`truck-${route.id}`} position={pos} color={route.color} />;
      })}

      {conflicts.map((conflict) => (
        <ConflictMarker key={conflict.id} conflict={conflict} />
      ))}

      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={150} blur={2} />

      <OrbitControls
        makeDefault
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={20}
        maxDistance={150}
      />

      <AnimationController />
    </>
  );
};

export const Scene3D: React.FC = () => {
  return (
    <Canvas
      shadows
      camera={{ position: [60, 60, 60], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0d1117' }}
    >
      <fog attach="fog" args={['#0d1117', 80, 200]} />
      <SceneContent />
    </Canvas>
  );
};
