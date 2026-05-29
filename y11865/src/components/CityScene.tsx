import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Effects } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../store';
import type { Building, FireStation, CoverageResult } from '../types';

interface BuildingMeshProps {
  building: Building;
  result?: CoverageResult;
  isSelected: boolean;
  comparisonResult?: CoverageResult;
  viewMode: 'single' | 'comparison' | 'difference';
  onClick: () => void;
}

function BuildingMesh({
  building,
  result,
  isSelected,
  comparisonResult,
  viewMode,
  onClick,
}: BuildingMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    if (viewMode === 'difference' && comparisonResult && result) {
      const diff = comparisonResult.responseTime - result.responseTime;
      if (diff < -1) return new THREE.Color(0x22c55e);
      if (diff > 1) return new THREE.Color(0xef4444);
      return new THREE.Color(0x3b82f6);
    }

    if (!result) return new THREE.Color(0x3b82f6);

    if (result.isBlind) {
      return new THREE.Color(0xef4444);
    }

    const ratio = Math.min(result.responseTime / 10, 1);
    return new THREE.Color().setHSL(0.35 - ratio * 0.35, 0.8, 0.5);
  }, [result, comparisonResult, viewMode]);

  useFrame((state) => {
    if (meshRef.current) {
      const targetY = isSelected ? building.height * 0.05 : 0;
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetY,
        0.1
      );
    }
    if (glowRef.current && isSelected) {
      const glow = glowRef.current.material as THREE.MeshBasicMaterial;
      glow.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <group position={[building.position[0], 0, building.position[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[4, building.height, 4]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.3}
          emissive={color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </mesh>
      {isSelected && (
        <mesh ref={glowRef} position={[0, building.height / 2, 0]}>
          <boxGeometry args={[4.5, building.height + 1, 4.5]} />
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

interface FireStationMarkerProps {
  station: FireStation;
  isSelected: boolean;
  onClick: () => void;
}

function FireStationMarker({ station, isSelected, onClick }: FireStationMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
    if (markerRef.current) {
      markerRef.current.position.y =
        8 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group position={[station.position[0], 0, station.position[2]]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <cylinderGeometry args={[3, 4, 1, 8]} />
        <meshStandardMaterial
          color={0xe63946}
          roughness={0.3}
          metalness={0.8}
          emissive={0xe63946}
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[2.5, 4, 8]} />
        <meshStandardMaterial
          color={0xffffff}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      <group ref={groupRef} position={[0, 0, 0]}>
        <mesh ref={markerRef} position={[6, 0, 0]}>
          <octahedronGeometry args={[0.8]} />
          <meshBasicMaterial color={0xff6b6b} />
        </mesh>
        <mesh position={[-6, 0, 0]}>
          <octahedronGeometry args={[0.8]} />
          <meshBasicMaterial color={0xff6b6b} />
        </mesh>
      </group>

      {isSelected && (
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5, 6, 32]} />
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

interface RoadNetworkProps {
  nodes: { id: string; position: [number, number] }[];
  edges: { from: string; to: string; isBlocked: boolean }[];
}

function RoadNetwork({ nodes, edges }: RoadNetworkProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    nodes.forEach((n) => map.set(n.id, n.position));
    return map;
  }, [nodes]);

  const lines = useMemo(() => {
    return edges.map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return null;

      const points = [
        new THREE.Vector3(from[0], 0.1, from[1]),
        new THREE.Vector3(to[0], 0.1, to[1]),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = edge.isBlocked ? 0xff0000 : 0x4a5568;

      return { geometry, color, edge };
    });
  }, [edges, nodeMap]);

  return (
    <group>
      {lines.map((line, i) =>
        line ? (
          <lineSegments key={i} geometry={line.geometry}>
            <lineBasicMaterial color={line.color} linewidth={2} />
          </lineSegments>
        ) : null
      )}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={0x0f172a} roughness={0.9} />
    </mesh>
  );
}

function SceneContent() {
  const {
    currentSimulation,
    comparisonSimulation,
    selectedBuildingId,
    selectedFireStationId,
    viewMode,
    setSelectedBuildingId,
    setSelectedFireStationId,
  } = useAppStore();

  const resultMap = useMemo(() => {
    const map = new Map<string, CoverageResult>();
    currentSimulation?.results.forEach((r) => map.set(r.buildingId, r));
    return map;
  }, [currentSimulation?.results]);

  const comparisonResultMap = useMemo(() => {
    const map = new Map<string, CoverageResult>();
    comparisonSimulation?.results.forEach((r) => map.set(r.buildingId, r));
    return map;
  }, [comparisonSimulation?.results]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 30, 0]} intensity={0.5} color={0x60a5fa} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <Ground />

      {currentSimulation && (
        <RoadNetwork
          nodes={currentSimulation.roadNodes}
          edges={currentSimulation.roadEdges}
        />
      )}

      {currentSimulation?.buildings.map((building) => (
        <BuildingMesh
          key={building.id}
          building={building}
          result={resultMap.get(building.id)}
          isSelected={selectedBuildingId === building.id}
          comparisonResult={comparisonResultMap.get(building.id)}
          viewMode={viewMode}
          onClick={() => setSelectedBuildingId(building.id)}
        />
      ))}

      {currentSimulation?.fireStations.map((station) => (
        <FireStationMarker
          key={station.id}
          station={station}
          isSelected={selectedFireStationId === station.id}
          onClick={() => setSelectedFireStationId(station.id)}
        />
      ))}

      <OrbitControls
        makeDefault
        minDistance={20}
        maxDistance={150}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.05}
      />

      <Effects>
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Effects>
    </>
  );
}

export default function CityScene() {
  return (
    <Canvas
      camera={{ position: [60, 60, 60], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => {
        useAppStore.getState().setSelectedBuildingId(null);
        useAppStore.getState().setSelectedFireStationId(null);
      }}
    >
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 80, 180]} />
      <SceneContent />
    </Canvas>
  );
}
