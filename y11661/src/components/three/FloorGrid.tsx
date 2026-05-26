import { Grid } from '@react-three/drei';

interface FloorGridProps {
  size?: number;
  divisions?: number;
}

export function FloorGrid({ size = 100, divisions = 50 }: FloorGridProps) {
  return (
    <group>
      <Grid
        args={[size, divisions]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#4B5563"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#6B7280"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.01, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#1F2937" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
