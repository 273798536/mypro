import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Stars, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useParkingStore } from '../../store/useParkingStore';
import { pressureToGlowColor, pressureToHexColor } from '../../utils/colorUtils';
import { FloorData, EntranceData } from '../../types/parking';

interface FloorMeshProps {
  floorData: FloorData;
  y: number;
  isSelected: boolean;
  onClick: () => void;
}

function FloorMesh({ floorData, y, isSelected, onClick }: FloorMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  
  const { pressureLevel, floorNumber, totalSpots, occupiedSpots } = floorData;
  const pressureColor = pressureToGlowColor(pressureLevel);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + floorNumber) * 0.02 * pressureLevel;
      meshRef.current.scale.setScalar(pulse);
    }
    if (edgesRef.current && isSelected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      edgesRef.current.scale.setScalar(pulse);
    }
  });

  const spots = useMemo(() => {
    const result: Array<{ x: number; z: number; occupied: boolean }> = [];
    const cols = 10;
    const rows = Math.ceil(totalSpots / cols);
    for (let i = 0; i < totalSpots; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      result.push({
        x: (col - cols / 2) * 0.8 + 0.4,
        z: (row - rows / 2) * 1.2 + 0.6,
        occupied: i < occupiedSpots,
      });
    }
    return result;
  }, [totalSpots, occupiedSpots]);

  return (
    <group position={[0, y, 0]}>
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <boxGeometry args={[10, 0.3, 12]} />
        <meshStandardMaterial
          color={pressureColor}
          emissive={pressureColor}
          emissiveIntensity={0.3 + pressureLevel * 0.5}
          transparent
          opacity={0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(10, 0.3, 12)]} />
        <lineBasicMaterial color={isSelected ? '#00d4ff' : pressureColor} transparent opacity={isSelected ? 1 : 0.5} />
      </lineSegments>

      {spots.map((spot, i) => (
        <mesh key={i} position={[spot.x, 0.25, spot.z]}>
          <boxGeometry args={[0.6, 0.05, 1]} />
          <meshStandardMaterial
            color={spot.occupied ? pressureColor : '#1e293b'}
            emissive={spot.occupied ? pressureColor : '#000000'}
            emissiveIntensity={spot.occupied ? 0.8 : 0}
            roughness={0.3}
          />
        </mesh>
      ))}

      <Float speed={1} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[4.5, 1, 0]}
          fontSize={0.5}
          color="#00d4ff"
          anchorX="center"
          anchorY="middle"
        >
          {`B${floorNumber + 1}`}
          <meshStandardMaterial emissive="#00d4ff" emissiveIntensity={1} />
        </Text>
      </Float>
    </group>
  );
}

interface EntranceMeshProps {
  entranceData: EntranceData;
  position: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

function EntranceMesh({ entranceData, position, rotation, isSelected, onClick }: EntranceMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { pressureLevel, queueLength, blockageStatus, entranceName } = entranceData;
  const pressureColor = pressureToGlowColor(pressureLevel);

  const queueCars = useMemo(() => {
    return Array.from({ length: Math.min(queueLength, 10) }, (_, i) => ({
      z: -1 - i * 0.8,
      scale: 1 - i * 0.05,
    }));
  }, [queueLength]);

  useFrame((state) => {
    if (groupRef.current && blockageStatus === 'blocked') {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        position={[0, 1, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <boxGeometry args={[3, 2, 0.5]} />
        <meshStandardMaterial
          color={isSelected ? '#00d4ff' : pressureColor}
          emissive={isSelected ? '#00d4ff' : pressureColor}
          emissiveIntensity={isSelected ? 0.8 : 0.4 + pressureLevel * 0.4}
          transparent
          opacity={0.6}
        />
      </mesh>

      <Text
        position={[0, 2.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {entranceName}
        <meshStandardMaterial emissive="#00d4ff" emissiveIntensity={0.5} />
      </Text>

      {queueCars.map((car, i) => (
        <mesh key={i} position={[0, 0.3, car.z]} scale={[car.scale, car.scale, car.scale]}>
          <boxGeometry args={[0.4, 0.2, 0.7]} />
          <meshStandardMaterial
            color={pressureColor}
            emissive={pressureColor}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {blockageStatus === 'blocked' && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
          </mesh>
        </Float>
      )}
    </group>
  );
}

function Scene() {
  const { currentRecord, filters, toggleFloorFilter, toggleEntranceFilter } = useParkingStore();
  
  if (!currentRecord) return null;

  const { floors, entrances } = currentRecord;

  const entrancePositions: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
    { pos: [0, 0, 6.5], rot: [0, 0, 0] },
    { pos: [5.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [0, 0, -6.5], rot: [0, Math.PI, 0] },
    { pos: [-5.5, 0, 0], rot: [0, Math.PI / 2, 0] },
  ];

  return (
    <>
      <ambientLight intensity={0.3} color="#60a5fa" />
      <directionalLight position={[10, 10, 5]} intensity={0.8} color="#e0f2fe" />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#f59e0b" />

      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
      <Environment preset="night" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0a1628" roughness={0.8} />
      </mesh>

      <gridHelper args={[30, 30, '#1e3a5f', '#0f172a']} position={[0, -0.49, 0]} />

      {floors.map((floor, i) => (
        <FloorMesh
          key={floor.id}
          floorData={floor}
          y={i * 1.5}
          isSelected={filters.selectedFloors.includes(floor.floorNumber)}
          onClick={() => toggleFloorFilter(floor.floorNumber)}
        />
      ))}

      {entrances.map((entrance, i) => {
        const config = entrancePositions[i] || entrancePositions[0];
        return (
          <EntranceMesh
            key={entrance.id}
            entranceData={entrance}
            position={config.pos}
            rotation={config.rot}
            isSelected={filters.selectedEntrances.includes(entrance.entranceName) || filters.selectedEntrances.length === 0}
            onClick={() => toggleEntranceFilter(entrance.entranceName)}
          />
        );
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.3}
      />

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
          intensity={1.5} 
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function ParkingBuilding3D() {
  const { isLoading } = useParkingStore();

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-parking-bg">
        <div className="text-cyan-400 animate-pulse font-display text-lg">正在加载停车数据...</div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [12, 10, 12], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0a1628, #050a14)' }}
    >
      <Scene />
    </Canvas>
  );
}
