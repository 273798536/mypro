import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShipStore } from '@/store/useShipStore';
import { useStabilityStore } from '@/store/useStabilityStore';

export const ShipModel: React.FC = () => {
  const ship = useShipStore((state) => state.currentShip);
  const result = useStabilityStore((state) => state.result);
  const groupRef = useRef<THREE.Group>(null);

  const { hullMesh, deckMesh } = useMemo(() => {
    const hullGeom = new THREE.BoxGeometry(ship.length, ship.depth, ship.width);
    const deckGeom = new THREE.BoxGeometry(ship.length, 0.5, ship.width + 2);
    
    const hullMat = new THREE.MeshStandardMaterial({
      color: ship.modelConfig.hullColor,
      transparent: true,
      opacity: 0.6,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    const deckMat = new THREE.MeshStandardMaterial({
      color: ship.modelConfig.deckColor,
      roughness: 0.5,
      metalness: 0.5,
    });

    return {
      hullMesh: new THREE.Mesh(hullGeom, hullMat),
      deckMesh: new THREE.Mesh(deckGeom, deckMat),
    };
  }, [ship]);

  useFrame((_, delta) => {
    if (groupRef.current && result) {
      const targetHeel = THREE.MathUtils.degToRad(result.heelAngle);
      const targetTrim = THREE.MathUtils.degToRad(result.trimAngle);
      
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        targetHeel,
        delta * 2
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetTrim,
        delta * 2
      );
    }
  });

  const waterLineY = -ship.depth / 2 + ship.draft;

  return (
    <group ref={groupRef}>
      <primitive object={hullMesh} position={[0, -ship.depth / 2, 0]} />
      <primitive object={deckMesh} position={[0, ship.depth / 2 + 0.25, 0]} />
      
      <mesh position={[0, waterLineY, 0]}>
        <boxGeometry args={[ship.length + 2, 0.1, ship.width + 4]} />
        <meshStandardMaterial
          color="#1E40AF"
          transparent
          opacity={0.4}
          emissive="#3B82F6"
          emissiveIntensity={0.2}
        />
      </mesh>

      <group position={[0, waterLineY, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(ship.length, 0.1, ship.width + 4)]} />
          <lineBasicMaterial color="#60A5FA" linewidth={2} />
        </lineSegments>
      </group>

      <mesh position={[-ship.length / 2 - 1, waterLineY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, ship.draft, 8]} />
        <meshBasicMaterial color="#60A5FA" />
      </mesh>

      {[-ship.length * 0.35, ship.length * 0.35].map((x, i) => (
        <mesh key={i} position={[x, -ship.depth * 0.3, 0]}>
          <boxGeometry args={[ship.length * 0.25, ship.draft * 0.5, ship.width * 0.6]} />
          <meshStandardMaterial
            color="#1E3A5F"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      ))}

      <mesh position={[ship.length / 2 + 2, ship.depth / 2 + 3, 0]}>
        <boxGeometry args={[4, 6, ship.width * 0.8]} />
        <meshStandardMaterial color="#1E293B" />
      </mesh>

      <mesh position={[ship.length / 2 + 2, ship.depth / 2 + 6.5, 0]}>
        <boxGeometry args={[3, 1, ship.width * 0.6]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>
    </group>
  );
};
