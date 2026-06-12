import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SamplePoint } from '@/types';
import { riskColors } from '@/utils/color';
import { useSceneStore } from '@/store/sceneStore';
import { useMissionStore } from '@/store/missionStore';
import { useFilterStore } from '@/store/filterStore';
import { statusColors } from '@/utils/color';

interface SampleBubblesProps {
  clipPlanes?: THREE.Plane[];
}

export default function SampleBubbles({ clipPlanes = [] }: SampleBubblesProps) {
  const currentMission = useMissionStore((s) => s.currentMission);
  const selectedPointId = useSceneStore((s) => s.selectedPointId);
  const setSelectedPointId = useSceneStore((s) => s.setSelectedPointId);
  const selectPoint = useMissionStore((s) => s.selectPoint);
  const { riskLevels, statuses, searchQuery, getFilteredPoints } = useFilterStore();
  const timelineProgress = useSceneStore((s) => s.timelineProgress);

  const filteredPoints = useMemo(() => {
    if (!currentMission) return [];
    return currentMission.samplePoints.filter((p) => {
      if (!riskLevels.includes(p.riskLevel)) return false;
      if (!statuses.includes(p.status)) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [currentMission, riskLevels, statuses, searchQuery]);

  const visibleCount = Math.ceil(filteredPoints.length * timelineProgress);

  const handleClick = useCallback(
    (point: SamplePoint) => {
      setSelectedPointId(point.id);
      selectPoint(point);
    },
    [setSelectedPointId, selectPoint],
  );

  if (!currentMission) return null;

  return (
    <group>
      {filteredPoints.map((point, idx) => {
        const visible = idx < visibleCount;
        return (
          <SampleBubble
            key={point.id}
            point={point}
            visible={visible}
            isSelected={selectedPointId === point.id}
            onClick={handleClick}
            clipPlanes={clipPlanes}
            index={idx}
          />
        );
      })}
    </group>
  );
}

interface SampleBubbleProps {
  point: SamplePoint;
  visible: boolean;
  isSelected: boolean;
  onClick: (point: SamplePoint) => void;
  clipPlanes: THREE.Plane[];
  index: number;
}

function SampleBubble({ point, visible, isSelected, onClick, clipPlanes, index }: SampleBubbleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(riskColors[point.riskLevel]), [point.riskLevel]);
  const statusColor = useMemo(() => new THREE.Color(statusColors[point.status]), [point.status]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + index * 0.3;
    const baseScale = isSelected ? 1.5 : 1;
    const pulse = 1 + Math.sin(t * 1.5) * 0.08;
    const floatY = Math.sin(t * 0.8) * 0.3;

    if (meshRef.current) {
      meshRef.current.scale.setScalar(baseScale * pulse);
      meshRef.current.position.y = floatY;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar((isSelected ? 2.8 : 1.8) * pulse);
      glowRef.current.position.y = floatY;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isSelected
        ? 0.25 + Math.sin(t * 2) * 0.1
        : 0.1 + Math.sin(t * 1.5) * 0.05;
    }
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.y = t * 0.8;
      ringRef.current.position.y = floatY;
    }
  });

  if (!visible) return null;

  return (
    <group position={[point.position.x, -point.position.depth, point.position.y]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(point);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.2 : 0.4}
          transparent
          opacity={0.92}
          clippingPlanes={clipPlanes}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {isSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.03, 8, 48]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.8} clippingPlanes={clipPlanes} />
        </mesh>
      )}
    </group>
  );
}
