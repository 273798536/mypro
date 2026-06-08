import * as THREE from 'three';

export default function AxisGrid() {
  const size = 10;
  const divisions = 20;
  return (
    <group>
      <gridHelper args={[size, divisions, new THREE.Color('#1E3A5F'), new THREE.Color('#132B4D')]} position={[0, -6, 0]}>
        <meshBasicMaterial attach="material" transparent opacity={0.35} />
      </gridHelper>
      <group position={[-size / 2 + 0.3, -5.7, -size / 2 + 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
          <meshBasicMaterial color="#FF4D6D" />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshBasicMaterial color="#FF4D6D" />
        </mesh>
        <mesh position={[0.85, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
          <meshBasicMaterial color="#3DDC97" />
        </mesh>
        <mesh position={[1.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshBasicMaterial color="#3DDC97" />
        </mesh>
        <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
          <meshBasicMaterial color="#00D4FF" />
        </mesh>
        <mesh position={[0, 0, 1.7]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshBasicMaterial color="#00D4FF" />
        </mesh>
      </group>
    </group>
  );
}
