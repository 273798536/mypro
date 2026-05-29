import { Grid } from '@react-three/drei'

export default function GroundGrid() {
  return (
    <group>
      <Grid
        position={[0, -0.01, 0]}
        args={[200, 200]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1a3a4a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#0d5e6e"
        fadeDistance={150}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#060d13" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
