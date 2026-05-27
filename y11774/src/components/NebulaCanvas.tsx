import { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAssetStore } from '@/store/useAssetStore';
import { useForceLayout } from '@/hooks/useForceLayout';
import { ASSET_TYPE_COLORS } from '@/types';

interface NodeProps {
  assetId: string;
  position: [number, number, number];
  color: string;
  isSelected: boolean;
  isHovered: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

function AssetNode({
  assetId,
  position,
  color,
  isSelected,
  isHovered,
  isHighlighted,
  onClick,
  onPointerOver,
  onPointerOut,
}: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const scale = isSelected ? 1.5 : isHovered ? 1.2 : isHighlighted ? 1.1 : 0.8;
  const glowIntensity = isSelected || isHovered ? 1 : isHighlighted ? 0.5 : 0.2;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2) * 0.05);
      meshRef.current.rotation.y += 0.005;
    }
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = glowIntensity * (0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={glowRef}
        scale={scale * 1.8}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPointerOver();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onPointerOut();
          document.body.style.cursor = 'auto';
        }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isHovered ? 0.8 : 0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

interface EdgeProps {
  start: [number, number, number];
  end: [number, number, number];
  coefficient: number;
  isPositive: boolean;
  opacity: number;
}

function CorrelationEdge({ start, end, coefficient, isPositive, opacity }: EdgeProps) {
  const points = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midVec = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    midVec.add(new THREE.Vector3(0, 0.5, 0));
    
    const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
    return curve.getPoints(20);
  }, [start, end]);

  const color = isPositive ? '#00f5d4' : '#ff6b6b';
  const lineWidth = Math.abs(coefficient) * 2;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}

function SceneContent() {
  const {
    filteredAssets,
    filteredEdges,
    selectedAssetId,
    hoveredAssetId,
    highlightedSector,
    isAutoRotating,
    setSelectedAsset,
    setHoveredAsset,
  } = useAssetStore();

  const { nodes, getNodePosition, isSimulating } = useForceLayout({
    assets: filteredAssets,
    edges: filteredEdges,
    nodeRadius: 1,
    linkDistance: 6,
    chargeStrength: -25,
  });

  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current && isAutoRotating) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.5;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  const nodeElements = useMemo(() => {
    return filteredAssets.map((asset) => {
      const pos = getNodePosition(asset.id);
      const isSelected = selectedAssetId === asset.id;
      const isHovered = hoveredAssetId === asset.id;
      const isHighlighted = highlightedSector === asset.sector || highlightedSector === null;

      return (
        <AssetNode
          key={asset.id}
          assetId={asset.id}
          position={[pos.x, pos.y, pos.z]}
          color={ASSET_TYPE_COLORS[asset.type]}
          isSelected={isSelected}
          isHovered={isHovered}
          isHighlighted={isHighlighted}
          onClick={() => setSelectedAsset(isSelected ? null : asset.id)}
          onPointerOver={() => setHoveredAsset(asset.id)}
          onPointerOut={() => setHoveredAsset(null)}
        />
      );
    });
  }, [filteredAssets, nodes, selectedAssetId, hoveredAssetId, highlightedSector, getNodePosition]);

  const edgeElements = useMemo(() => {
    return filteredEdges.map((edge, index) => {
      const sourcePos = getNodePosition(edge.source);
      const targetPos = getNodePosition(edge.target);
      const isPositive = edge.coefficient > 0;
      const opacity = Math.abs(edge.coefficient) * 0.6;

      return (
        <CorrelationEdge
          key={`${edge.source}-${edge.target}-${index}`}
          start={[sourcePos.x, sourcePos.y, sourcePos.z]}
          end={[targetPos.x, targetPos.y, targetPos.z]}
          coefficient={edge.coefficient}
          isPositive={isPositive}
          opacity={opacity}
        />
      );
    });
  }, [filteredEdges, nodes, getNodePosition]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f5d4" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a55eea" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      
      {edgeElements}
      {nodeElements}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
        autoRotate={isAutoRotating}
        autoRotateSpeed={0.5}
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function NebulaCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 25], fov: 60 }}
      style={{ background: '#0a1628' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
