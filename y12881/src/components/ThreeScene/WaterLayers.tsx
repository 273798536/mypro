export default function WaterLayers() {
  return (
    <group>
      <mesh position={[0, 15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#1B6B8E"
          transparent
          opacity={0.08}
          side={2}
        />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#154E69"
          transparent
          opacity={0.08}
          side={2}
        />
      </mesh>
      <mesh position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#0F2F44"
          transparent
          opacity={0.1}
          side={2}
        />
      </mesh>

      <group position={[32, 0, 0]}>
        <mesh position={[0, 15, 0]}>
          <boxGeometry args={[0.3, 0.1, 8]} />
          <meshBasicMaterial color="#2E8FB4" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[0.3, 0.1, 8]} />
          <meshBasicMaterial color="#154E69" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, -8, 0]}>
          <boxGeometry args={[0.3, 0.1, 8]} />
          <meshBasicMaterial color="#0F2F44" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}
