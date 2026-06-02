import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CableTray as CableTrayType, ObjectType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { getStatusColor } from '../../utils/colors';

interface CableTrayProps {
  tray: CableTrayType;
  isAlarmFiltered: boolean;
  onObjectClick: (type: ObjectType, id: string, name: string) => void;
}

export function CableTray({ tray, isAlarmFiltered, onObjectClick }: CableTrayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectedObject } = useSceneStore();
  const isSelected = selectedObject?.id === tray.id;
  const statusColor = getStatusColor(tray.status);

  const { tubeGeometry, cables } = useMemo(() => {
    const points = tray.points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.15, 8, false);

    const cables: { position: [number, number, number]; rotation: [number, number, number] }[] = [];
    const cableCount = Math.min(tray.cableCount, 20);
    
    for (let i = 0; i < cableCount; i++) {
      const t = i / cableCount;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const angle = Math.atan2(tangent.x, tangent.z);
      cables.push({
        position: [point.x, point.y - 0.05 + (i % 3) * 0.02, point.z],
        rotation: [0, -angle, 0],
      });
    }

    return { tubeGeometry, cables };
  }, [tray.points, tray.cableCount]);

  useFrame((state) => {
    if (groupRef.current && tray.status === 'warning') {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onObjectClick('tray', tray.id, tray.name);
  };

  const dimmed = isAlarmFiltered && !isSelected;
  const tubeOpacity = dimmed ? 0.15 : 0.8;

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#3a4a5a"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={tubeOpacity}
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>

      {cables.map((cable, i) => (
        <mesh key={i} position={cable.position} rotation={cable.rotation}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#FF6B6B' : i % 3 === 1 ? '#4ECDC4' : '#45B7D1'}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}

      <mesh position={tray.points[0]}>
        <boxGeometry args={[0.3, 0.15, 0.3]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={tray.status !== 'normal' ? 0.6 : 0.3}
        />
      </mesh>

      {isSelected && (
        <mesh geometry={tubeGeometry.clone().scale(1.1, 1.1, 1.1)}>
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.2} wireframe />
        </mesh>
      )}
    </group>
  );
}
