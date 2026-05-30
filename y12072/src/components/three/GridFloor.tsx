import { Grid } from '@react-three/drei';

export function GridFloor() {
  return (
    <group position={[4.5, -1, 4.5]}>
      <Grid
        args={[12, 12]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2A2A3A"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#3A3A4A"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]}>
        <planeGeometry args={[12, 105]} />
        <meshBasicMaterial 
          color="#121218" 
          transparent 
          opacity={0.6}
          side={2}
        />
      </mesh>
    </group>
  );
}
