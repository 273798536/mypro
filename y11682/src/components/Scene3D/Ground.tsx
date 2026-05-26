import { Grid } from '@react-three/drei';

interface GroundProps {
  size?: number;
  showGrid: boolean;
}

export function Ground({ size = 200, showGrid }: GroundProps) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0.9}
        />
      </mesh>

      {showGrid && (
        <Grid
          args={[size, size, 50, 50]}
          cellSize={5}
          cellThickness={0.5}
          cellColor="#2d3748"
          sectionSize={25}
          sectionThickness={1}
          sectionColor="#4a5568"
          fadeDistance={size / 2}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}
