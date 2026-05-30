import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Streamline as StreamlineType } from '@/types';
import { STATUS_COLORS } from '@/utils/color';

interface StreamlineProps {
  streamline: StreamlineType;
  color?: string;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function Streamline({
  streamline,
  color,
  selected = false,
  highlighted = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: StreamlineProps) {
  const { tubeMesh, anomalyMeshes } = useMemo(() => {
    const points = streamline.points.map(
      (p) => new THREE.Vector3(p.position[0], p.position[2], p.position[1])
    );

    const lineColor = new THREE.Color(
      color || STATUS_COLORS[streamline.status]
    );

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, Math.min(points.length * 2, 200), 0.03, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: highlighted || selected ? 0.9 : 0.6,
    });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);

    const anomalyMeshes: THREE.Mesh[] = [];
    streamline.anomalies.forEach((anomaly) => {
      const point = streamline.points[anomaly.pointIndex];
      if (point) {
        const anomalyGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const anomalyMaterial = new THREE.MeshBasicMaterial({
          color: STATUS_COLORS[anomaly.type],
          transparent: true,
          opacity: 0.9,
        });
        const mesh = new THREE.Mesh(anomalyGeometry, anomalyMaterial);
        mesh.position.set(point.position[0], point.position[2], point.position[1]);
        mesh.userData = { anomalyId: anomaly.id, streamlineId: streamline.id };
        anomalyMeshes.push(mesh);
      }
    });

    return { tubeMesh, anomalyMeshes };
  }, [streamline, color, highlighted, selected]);

  if (streamline.points.length < 2) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut?.();
      }}
    >
      <primitive object={tubeMesh} />
      {anomalyMeshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
}
