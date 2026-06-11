export function AxisHelper() {
  const axisLength = 1.5
  const origin = [-6, 0.02, -4] as [number, number, number]

  return (
    <group position={origin}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 64]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh position={[axisLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, axisLength, 8]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>
      <mesh position={[axisLength, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      <mesh position={[0, axisLength / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, axisLength, 8]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>
      <mesh position={[0, axisLength, 0]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>

      <mesh position={[0, 0, axisLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, axisLength, 8]} />
        <meshBasicMaterial color="#3B82F6" />
      </mesh>
      <mesh position={[0, 0, axisLength]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color="#3B82F6" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#94A3B8" />
      </mesh>
    </group>
  )
}
