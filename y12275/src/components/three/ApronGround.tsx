import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';

export function ApronGround() {
  const gridMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: '#1a2332',
      metalness: 0.1,
      roughness: 0.9,
    });
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <primitive object={gridMaterial} attach="material" />
      </mesh>

      <gridHelper
        args={[120, 60, '#2a3a4a', '#1e2a38']}
        position={[0, 0.01, 0]}
      />

      <mesh position={[0, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 3]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.3} />
      </mesh>

      <mesh position={[0, 0.02, 18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 3]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.3} />
      </mesh>

      {[-25, -15, 15, 25].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 20]} />
          <meshBasicMaterial color="#ff6b35" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}
