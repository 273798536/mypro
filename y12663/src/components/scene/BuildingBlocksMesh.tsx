import { useMemo } from "react";
import * as THREE from "three";
import { useDataStore } from "@/store/dataStore";

interface SingleBlockProps {
  position: [number, number, number];
  size: [number, number, number];
  name: string;
  index: number;
}

function SingleBlock({ position, size, name, index }: SingleBlockProps) {
  void name;
  const half = useMemo<[number, number, number]>(
    () => [size[0] / 2, size[1] / 2, size[2] / 2],
    [size],
  );

  const centroid: [number, number, number] = [
    position[0],
    position[1] + half[1],
    position[2],
  ];

  const edgeColor = useMemo(() => {
    const palette = ["#7CFFB2", "#5B9DFF", "#B794FF", "#FFD66E"];
    return palette[index % palette.length];
  }, [index]);

  return (
    <group position={centroid}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshPhysicalMaterial
          color="#1e3a6e"
          transparent
          opacity={0.55}
          roughness={0.45}
          metalness={0.15}
          emissive="#0b2450"
          emissiveIntensity={0.5}
          clearcoat={0.3}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color={edgeColor} transparent opacity={0.95} />
      </lineSegments>
      <sprite position={[0, half[1] + 1.4, 0]} scale={[10, 1.6, 1]}>
        <spriteMaterial
          transparent
          opacity={0.9}
          color={edgeColor}
          depthTest={false}
        />
      </sprite>
    </group>
  );
}

export default function BuildingBlocksMesh() {
  const blocks = useDataStore((s) => s.blocks);
  const activeDatasetId = useDataStore((s) => s.activeDatasetId);
  const visibleBlocks = useMemo(
    () => blocks.filter((b) => !activeDatasetId || b.datasetId === activeDatasetId),
    [blocks, activeDatasetId],
  );

  return (
    <group>
      {visibleBlocks.map((b, i) => (
        <SingleBlock
          key={b.id}
          position={b.position}
          size={b.size}
          name={b.name}
          index={i}
        />
      ))}
    </group>
  );
}
