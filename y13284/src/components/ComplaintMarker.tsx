import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { StandardComplaint, ComplaintStatus } from '@/shared/types';
import { useBusinessStore } from '@/stores/useBusinessStore';
import { lngLatToXZ } from '@/utils/lngLatTo3d';

interface ComplaintMarkerProps {
  complaint: StandardComplaint;
  isFocused: boolean;
}

const STATUS_COLOR: Record<ComplaintStatus, string> = {
  '待确认': '#f59e0b',
  '处理中': '#22d3ee',
  '已结案': '#10b981',
  '已归并': '#a855f7',
  '坐标异常': '#ef4444',
};

const STATUS_HEIGHT: Record<ComplaintStatus, number> = {
  '待确认': 12,
  '处理中': 14,
  '已结案': 8,
  '已归并': 10,
  '坐标异常': 16,
};

export default function ComplaintMarker({ complaint, isFocused }: ComplaintMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const setSelected = useBusinessStore((s) => s.setSelected);

  const { x, z } = lngLatToXZ(complaint.lng, complaint.lat);
  const color = STATUS_COLOR[complaint.status];
  const baseHeight = STATUS_HEIGHT[complaint.status];
  const height = isFocused ? baseHeight * 1.5 : baseHeight;
  const hasCoordIssue = !!complaint.coordIssue;
  const emissiveIntensity = isFocused ? 1.5 : 0.8;
  const targetScale = hovered ? 1.2 : 1.0;

  useFrame(({ clock }) => {
    if (markerRef.current) {
      const currentScale = markerRef.current.scale.x;
      const nextScale = currentScale + (targetScale - currentScale) * 0.15;
      markerRef.current.scale.setScalar(nextScale);
    }
    if (hasCoordIssue && markerRef.current) {
      const t = clock.getElapsedTime();
      markerRef.current.position.y = height / 2 + Math.sin(t * 2) * 0.5;
    }
    if (haloRef.current) {
      const t = clock.getElapsedTime();
      haloRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <mesh
        ref={markerRef}
        position={[0, height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setSelected(complaint.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <cylinderGeometry args={[1, 2, height, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
        />
      </mesh>

      {isFocused && (
        <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[3, 5, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {hasCoordIssue && (
        <mesh position={[0, 6, 0]}>
          <sphereGeometry args={[6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}

      {hovered && (
        <Html
          position={[0, height + 4, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid #22d3ee',
              borderRadius: '8px',
              padding: '10px 14px',
              minWidth: '180px',
              color: '#e2e8f0',
              fontSize: '12px',
              lineHeight: '1.6',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
            }}
          >
            <div style={{ color: '#94a3b8', marginBottom: '4px' }}>投诉时间</div>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>{complaint.occurredAt}</div>
            <div style={{ color: '#94a3b8', marginBottom: '4px' }}>街口</div>
            <div style={{ marginBottom: '8px' }}>{complaint.intersection}</div>
            <div style={{ color: '#94a3b8', marginBottom: '4px' }}>状态</div>
            <div style={{ marginBottom: '8px', color }}>{complaint.status}</div>
            <div style={{ color: '#94a3b8', marginBottom: '4px' }}>来源</div>
            <div>{complaint.source}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
