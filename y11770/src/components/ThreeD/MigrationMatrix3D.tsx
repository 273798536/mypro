import { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { MatrixCubeData } from '../../types';
import { useAppStore, useFilteredRecords } from '../../store/useAppStore';
import { buildMatrixData, getMatrixStats } from '../../services/MatrixBuilder';
import { getMigrationColor, calculateCubeScale } from '../../utils/colorMapping';
import { RATING_ORDER } from '../../utils/ratingUtils';

interface CubeInstanceProps {
  cube: MatrixCubeData;
  scale: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (cube: MatrixCubeData) => void;
  onPointerOver: (cube: MatrixCubeData) => void;
  onPointerOut: () => void;
  showAnomalies: boolean;
}

function CubeInstance({
  cube,
  scale,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
  showAnomalies,
}: CubeInstanceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = getMigrationColor(cube.fromRating, cube.toRating);
  const hasAnomalies = cube.anomalies.length > 0;
  const isError = cube.anomalies.some((a) => a.severity === 'error');

  const finalScale = useMemo(() => {
    let s = scale;
    if (isSelected) s *= 1.15;
    else if (isHovered) s *= 1.1;
    return s;
  }, [scale, isSelected, isHovered]);

  useFrame((state) => {
    if (meshRef.current && showAnomalies && hasAnomalies) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(finalScale * pulse);
    }
  });

  const displayColor = useMemo(() => {
    if (showAnomalies && hasAnomalies) {
      return isError ? '#dc2626' : '#fbbf24';
    }
    return baseColor;
  }, [showAnomalies, hasAnomalies, isError, baseColor]);

  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.5;
    if (isHovered) return 0.3;
    if (showAnomalies && hasAnomalies) return isError ? 0.4 : 0.2;
    return 0.1;
  }, [isSelected, isHovered, showAnomalies, hasAnomalies, isError]);

  return (
    <mesh
      ref={meshRef}
      position={[cube.x - 4.5, cube.y - 4.5, cube.z - 5.5]}
      scale={finalScale}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(cube);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onPointerOver(cube);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onPointerOut();
        document.body.style.cursor = 'auto';
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.85, 0.85, 0.85]} />
      <meshStandardMaterial
        color={displayColor}
        emissive={displayColor}
        emissiveIntensity={emissiveIntensity}
        metalness={0.3}
        roughness={0.5}
        transparent
        opacity={cube.isVisible ? 1 : 0.2}
      />
    </mesh>
  );
}

function AxisLabels() {
  const labelPositions = useMemo(() => {
    return RATING_ORDER.map((rating, i) => ({
      rating,
      x: i - 4.5,
      y: i - 4.5,
    }));
  }, []);

  return (
    <group>
      {labelPositions.map(({ rating, x }) => (
        <Text
          key={`x-${rating}`}
          position={[x, -5.5, -6]}
          fontSize={0.4}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {rating}
        </Text>
      ))}
      {labelPositions.map(({ rating, y }) => (
        <Text
          key={`y-${rating}`}
          position={[-5.5, y, -6]}
          fontSize={0.4}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          {rating}
        </Text>
      ))}
      <Text
        position={[0, -6.5, -6]}
        fontSize={0.5}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        期初评级 →
      </Text>
      <Text
        position={[-6.5, 0, -6]}
        fontSize={0.5}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, Math.PI / 2]}
      >
        ← 期末评级
      </Text>
      <Text
        position={[-5.5, -5.5, 0]}
        fontSize={0.5}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, 0]}
      >
        时间 →
      </Text>
    </group>
  );
}

function SceneContent() {
  const {
    months,
    currentMonth,
    selectedCube,
    hoveredCube,
    setSelectedCube,
    setHoveredCube,
    balanceWeightEnabled,
    showAnomalies,
  } = useAppStore();

  const filteredRecords = useFilteredRecords();

  const cubes = useMemo(() => {
    return buildMatrixData(filteredRecords, months, currentMonth);
  }, [filteredRecords, months, currentMonth]);

  const stats = useMemo(() => getMatrixStats(cubes), [cubes]);

  return (
    <>
      <ambientLight intensity={0.4} color="#93c5fd" />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[10, 5, 10]} intensity={0.5} color="#a78bfa" />

      <gridHelper args={[20, 20, '#334155', '#1e293b']} position={[0, -5, 0]} />

      {cubes.map((cube) => (
        <CubeInstance
          key={`${cube.x}-${cube.y}-${cube.z}`}
          cube={cube}
          scale={calculateCubeScale(
            cube.count,
            cube.totalBalance,
            balanceWeightEnabled,
            Math.max(stats.maxCount, 1),
            Math.max(stats.maxBalance, 1)
          )}
          isSelected={selectedCube?.x === cube.x && selectedCube?.y === cube.y && selectedCube?.z === cube.z}
          isHovered={hoveredCube?.x === cube.x && hoveredCube?.y === cube.y && hoveredCube?.z === cube.z}
          onClick={setSelectedCube}
          onPointerOver={setHoveredCube}
          onPointerOut={() => setHoveredCube(null)}
          showAnomalies={showAnomalies}
        />
      ))}

      <AxisLabels />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.6} />
        <FXAA />
      </EffectComposer>
    </>
  );
}

export default function MigrationMatrix3D() {
  return (
    <Canvas
      camera={{ position: [15, 12, 20], fov: 60 }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f172a 100%)' }}
      gl={{ antialias: true, alpha: true }}
      onClick={() => useAppStore.getState().setSelectedCube(null)}
    >
      <fog attach="fog" args={['#0a1628', 20, 50]} />
      <SceneContent />
    </Canvas>
  );
}
