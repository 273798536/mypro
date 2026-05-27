import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Text, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCalcStore } from '../store/useCalcStore';
import { DRONE_SPECS, BATTERY_SPECS } from '../types';

function DroneModel({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const propellerRef1 = useRef<THREE.Mesh>(null);
  const propellerRef2 = useRef<THREE.Mesh>(null);
  const propellerRef3 = useRef<THREE.Mesh>(null);
  const propellerRef4 = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (propellerRef1.current) propellerRef1.current.rotation.z += delta * 20;
    if (propellerRef2.current) propellerRef2.current.rotation.z += delta * 20;
    if (propellerRef3.current) propellerRef3.current.rotation.z += delta * 20;
    if (propellerRef4.current) propellerRef4.current.rotation.z += delta * 20;
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[0.4, 0.08, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.5} />
      </mesh>

      <mesh position={[0.3, 0, 0]} ref={propellerRef1}>
        <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0.3, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.3, 0, 0]} ref={propellerRef2}>
        <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[-0.3, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0, 0.3]} ref={propellerRef3}>
        <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0, -0.3]} ref={propellerRef4}>
        <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function FlightPath({ distance }: { distance: number }) {
  const halfDist = Math.min(distance / 1000, 8);
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const x = -halfDist + t * halfDist * 2;
      const y = t < 0.5 ? t * 4 : (1 - t) * 4;
      pts.push([x, y, 0]);
    }
    return pts;
  }, [halfDist]);

  return (
    <Line
      points={points}
      color="#00D4FF"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
}

function WindArrows({ speed, direction }: { speed: number; direction: number }) {
  const count = 20;
  const arrows = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: number }[] = [];
    const rad = (direction * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * 20,
          Math.random() * 8 + 1,
          (Math.random() - 0.5) * 10
        ],
        rot: rad
      });
    }
    return arr;
  }, [direction]);

  return (
    <>
      {arrows.map((arrow, i) => (
        <mesh key={i} position={arrow.pos} rotation={[0, arrow.rot, 0]}>
          <coneGeometry args={[0.05, 0.3, 8]} />
          <meshStandardMaterial
            color={speed > 5 ? '#FF3B30' : speed > 3 ? '#FF9500' : '#00D4FF'}
            emissive={speed > 5 ? '#FF3B30' : speed > 3 ? '#FF9500' : '#00D4FF'}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6 + speed * 0.05}
          />
        </mesh>
      ))}
    </>
  );
}

function AnimatedDrone({ 
  distance, 
  windDirection, 
  result 
}: { 
  distance: number; 
  windDirection: number;
  result: { remainingEnergy: number; totalEnergyNeeded: number; warnings: { severity: string }[] };
}) {
  const droneRef = useRef<THREE.Group>(null);
  const halfDist = Math.min(distance / 1000, 8);

  useFrame((state) => {
    if (droneRef.current) {
      const t = (Math.sin(state.clock.elapsedTime * 0.3) + 1) / 2;
      droneRef.current.position.x = -halfDist + t * halfDist * 2;
      droneRef.current.position.y = t < 0.5 ? t * 4 : (1 - t) * 4;
      droneRef.current.rotation.y = t < 0.5 ? 0 : Math.PI;
    }
  });

  const batteryColor = result.remainingEnergy < 0 ? '#FF3B30' : 
    result.remainingEnergy < result.totalEnergyNeeded * 0.1 ? '#FF9500' : '#00FF88';

  return (
    <group ref={droneRef}>
      <DroneModel position={[0, 0, 0]} rotation={0} />
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={batteryColor} emissive={batteryColor} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#0f1629" metalness={0.1} roughness={0.8} />
    </mesh>
  );
}

function GridHelper() {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  return (
    <gridHelper
      ref={gridRef}
      args={[50, 50, '#1a2744', '#0f1629']}
      position={[0, 0.01, 0]}
    />
  );
}

export default function FlightScene() {
  const { params, result } = useCalcStore();
  const drone = DRONE_SPECS.find(d => d.id === params.droneId) || DRONE_SPECS[0];

  return (
    <Canvas
      camera={{ position: [12, 10, 12], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0f1629 100%)' }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <directionalLight position={[-10, 5, -5]} intensity={0.3} color="#00D4FF" />
      
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
      <Ground />
      <GridHelper />
      
      <FlightPath distance={params.routeDistance} />
      
      <WindArrows speed={params.windSpeed} direction={params.windDirection} />
      
      <AnimatedDrone 
        distance={params.routeDistance} 
        windDirection={params.windDirection}
        result={result}
      />
      
      <Billboard position={[0, 8, 0]}>
        <Text
          fontSize={0.4}
          color="#00D4FF"
          anchorX="center"
          anchorY="middle"
        >
          {drone.name}
        </Text>
      </Billboard>
      
      <Billboard position={[0, 7.3, 0]}>
        <Text
          fontSize={0.2}
          color={result.warnings.some(w => w.severity === 'error') ? '#FF3B30' : '#00FF88'}
          anchorX="center"
          anchorY="middle"
        >
          {result.warnings.some(w => w.severity === 'error') ? '⚠ 存在安全风险' : '✓ 状态正常'}
        </Text>
      </Billboard>
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </Canvas>
  );
}
