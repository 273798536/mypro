import { useBusinessStore } from '@/stores/useBusinessStore';

export default function CityBlocks() {
  const blocks = useBusinessStore((s) => s.blocks);

  return (
    <group>
      {blocks.map((block) => (
        <mesh key={block.id} position={block.position}>
          <boxGeometry args={block.size} />
          <meshStandardMaterial
            color={block.color}
            roughness={0.8}
            metalness={0.1}
            transparent={false}
          />
        </mesh>
      ))}
    </group>
  );
}
