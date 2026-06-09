import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ConnectionRecord } from '@/types';
import { statusColor } from '@/utils/validation';
import { getRegionById } from '@/data/brainRegions';

interface ConnectionLineProps {
  record: ConnectionRecord;
  isSelected: boolean;
  onClick: () => void;
}

export const ConnectionLine = ({
  record,
  isSelected,
  onClick,
}: ConnectionLineProps) => {
  const glowRef = useRef<any>(null);
  const animRef = useRef(Math.random() * Math.PI * 2);

  const { points, color, hasHighRisk } = useMemo(() => {
    const from = getRegionById(record.fromRegion);
    const to = getRegionById(record.toRegion);
    const highRisk =
      record.status === 'invalid' ||
      record.riskNotes.some((n) => n.severity === 'high');
    const baseColor = highRisk ? '#F87171' : statusColor[record.status];
    if (!from || !to) {
      return { points: [] as [number, number, number][], color: baseColor, hasHighRisk: highRisk };
    }

    const start = new THREE.Vector3(...from.position);
    const end = new THREE.Vector3(...to.position);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    mid.y += dist * 0.18;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const vecPoints = curve.getPoints(64);
    const pts: [number, number, number][] = vecPoints.map(
      (p) => [p.x, p.y, p.z] as [number, number, number],
    );
    return { points: pts, color: baseColor, hasHighRisk: highRisk };
  }, [record]);

  useFrame((_, delta) => {
    animRef.current += delta * 0.8;
    if (glowRef.current) {
      const pulse = isSelected ? 0.75 : 0.35 + Math.sin(animRef.current) * 0.2;
      (glowRef.current as any).material.opacity = pulse;
    }
  });

  if (points.length === 0) return null;

  const lineWidth = isSelected ? 2.2 : hasHighRisk ? 1.6 : record.strength * 1.4 + 0.6;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={isSelected ? 1 : 0.65}
      />
      <Line
        ref={glowRef}
        points={points}
        color={color}
        lineWidth={lineWidth * 2.5}
        transparent
        opacity={0.4}
      />
    </group>
  );
};
