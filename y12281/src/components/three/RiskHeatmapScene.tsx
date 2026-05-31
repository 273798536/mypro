import { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import useAppStore from '@/store/useAppStore';
import { interpolateColor } from '@/utils/colorMapping';

interface BuildingProps {
  region: ReturnType<typeof useAppStore.getState>['regions'][0];
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

function Building({ region, isSelected, isHovered, onClick, onPointerOver, onPointerOut }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const getCurrentMetrics = useAppStore((state) => state.getCurrentMetrics);
  const parameters = useAppStore((state) => state.parameters);
  const metrics = getCurrentMetrics(region.id);

  const { baseHeight, baseColor, depth } = useMemo(() => {
    const baseHeightValue = 0.5;
    const premium = metrics?.premium || 50000000;
    const lossRatio = metrics?.lossRatio || 0.5;
    const hazard = metrics?.hazardExposure || 0.5;

    return {
      baseHeight: baseHeightValue + (premium / 200000000) * parameters.heightScale * 5,
      baseColor: interpolateColor(lossRatio, parameters.lossRatioThresholds),
      depth: 0.6 + hazard * 1.2,
    };
  }, [metrics, parameters]);

  useFrame(() => {
    if (meshRef.current) {
      const targetY = isSelected ? baseHeight / 2 + 0.5 : baseHeight / 2;
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetY,
        0.1
      );

      const targetScaleY = isHovered && !isSelected ? 1.05 : 1;
      meshRef.current.scale.y = THREE.MathUtils.lerp(
        meshRef.current.scale.y,
        targetScaleY,
        0.1
      );
    }
  });

  const emissionIntensity = isSelected ? 0.8 : isHovered ? 0.4 : 0.15;

  return (
    <group position={[region.center[0], 0, region.center[1]]}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={onPointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.8, baseHeight, depth]} />
        <meshPhysicalMaterial
          color={baseColor}
          transparent
          opacity={0.9}
          roughness={0.15}
          metalness={0.25}
          emissive={baseColor}
          emissiveIntensity={emissionIntensity}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, baseHeight + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function SceneContent() {
  const regions = useAppStore((state) => state.regions);
  const selectedRegionId = useAppStore((state) => state.selectedRegionId);
  const hoveredRegionId = useAppStore((state) => state.hoveredRegionId);
  const selectRegion = useAppStore((state) => state.selectRegion);
  const hoverRegion = useAppStore((state) => state.hoverRegion);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 14, 18]} fov={45} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={6}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
      />

      <fog attach="fog" args={['#0A1628', 18, 45]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[12, 25, 12]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-12, 15, -12]} intensity={0.6} color="#4FC3F7" />
      <pointLight position={[0, 20, 0]} intensity={0.3} color="#ffffff" />

      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3b82f6"
        fadeDistance={35}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {regions.map((region) => (
        <Building
          key={region.id}
          region={region}
          isSelected={selectedRegionId === region.id}
          isHovered={hoveredRegionId === region.id}
          onClick={() => selectRegion(selectedRegionId === region.id ? null : region.id)}
          onPointerOver={() => hoverRegion(region.id)}
          onPointerOut={() => hoverRegion(null)}
        />
      ))}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.6}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function RiskHeatmapScene() {
  return (
    <Canvas shadows gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#0A1628']} />
      <SceneContent />
    </Canvas>
  );
}
