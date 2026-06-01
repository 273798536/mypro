import { useRef, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Line, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  floors,
  halls,
  stairways,
  getHallCenter,
  getStairwayCenter,
  ExhibitionHall,
  Stairway,
} from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function FloorPlane({ elevation }: { elevation: number }) {
  const points = [
    [-10, elevation, -8] as [number, number, number],
    [10, elevation, -8] as [number, number, number],
    [10, elevation, 8] as [number, number, number],
    [-10, elevation, 8] as [number, number, number],
    [-10, elevation, -8] as [number, number, number],
  ];

  return (
    <group>
      <mesh
        position={[0, elevation, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial
          color="#1a2634"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line points={points} color="#3a5a7a" lineWidth={1} />
    </group>
  );
}

function HallBox({ hall }: { hall: ExhibitionHall }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectedFloor, selectedHall, setSelectedHall, validationIssues } =
    useMuseumStore();

  const isSelectedFloor = hall.floorId === selectedFloor;
  const isSelectedHall = hall.id === selectedHall;
  const floorElevation =
    floors.find((f) => f.id === hall.floorId)?.elevation ?? 0;
  const { x, z, width, depth, height } = hall.geometry;

  const hallIssues = validationIssues.filter((issue) =>
    issue.affectedHalls.includes(hall.id)
  );
  const hasWarning = hallIssues.some((i) => i.severity === 'warning');
  const hasError = hallIssues.some((i) => i.severity === 'error');

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    []
  );
  const onPointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
  }, []);
  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setSelectedHall(hall.id);
    },
    [setSelectedHall, hall.id]
  );

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[x + width / 2, floorElevation + height / 2, z + depth / 2]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#2a3a4a"
          transparent={!isSelectedFloor}
          opacity={isSelectedFloor ? 1 : 0.15}
          emissive={isSelectedHall ? '#00E676' : '#000000'}
          emissiveIntensity={isSelectedHall ? 0.4 : 0}
        />
      </mesh>
      {isSelectedFloor && (
        <Html
          position={[
            x + width / 2,
            floorElevation + height + 0.4,
            z + depth / 2,
          ]}
          center
          distanceFactor={15}
          style={{
            color: '#e0e0e0',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {hall.name}
        </Html>
      )}
      {hasError && (
        <mesh
          position={[
            x + width / 2,
            floorElevation + height + 0.6,
            z + depth / 2,
          ]}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#FF5722"
            emissive="#FF5722"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      {!hasError && hasWarning && (
        <mesh
          position={[
            x + width / 2,
            floorElevation + height + 0.6,
            z + depth / 2,
          ]}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#FFB300"
            emissive="#FFB300"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

function StairwayCylinder({ stair }: { stair: Stairway }) {
  const { setSelectedStairway } = useMuseumStore();
  const fromElevation =
    floors.find((f) => f.id === stair.fromFloorId)?.elevation ?? 0;
  const toElevation =
    floors.find((f) => f.id === stair.toFloorId)?.elevation ?? 0;
  const midY = (fromElevation + toElevation) / 2;
  const height = Math.abs(toElevation - fromElevation);

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      setSelectedStairway(stair.id);
    },
    [setSelectedStairway, stair.id]
  );

  return (
    <mesh
      position={[stair.position.x, midY, stair.position.z]}
      onClick={onClick}
    >
      <cylinderGeometry args={[0.4, 0.4, height, 16]} />
      <meshStandardMaterial
        color="#FFB300"
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

export default function MuseumBuilding() {
  return (
    <group>
      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2.2}
        minDistance={8}
        maxDistance={40}
      />
      {floors.map((floor) => (
        <FloorPlane key={floor.id} elevation={floor.elevation} />
      ))}
      {halls.map((hall) => (
        <HallBox key={hall.id} hall={hall} />
      ))}
      {stairways.map((stair) => (
        <StairwayCylinder key={stair.id} stair={stair} />
      ))}
    </group>
  );
}
