import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MonitorPoint, TimePeriod } from '../../types';
import { getNoiseColor, getStatusColor } from '../../mock/data';
import { useAppStore, usePointReviews } from '../../store/useAppStore';
import { AlertTriangle, CheckCircle, Clock, Image } from 'lucide-react';

interface MonitorPoint3DProps {
  point: MonitorPoint;
  timePeriod: TimePeriod;
}

export function MonitorPoint3D({ point, timePeriod }: MonitorPoint3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedPointId, setSelectedPointId, materials } = useAppStore();
  const reviews = usePointReviews(point.id);
  const isSelected = selectedPointId === point.id;

  const pointMaterial = materials.find(
    (m) => m.monitorPointId === point.id && m.timePeriod === timePeriod && m.type === 'photo'
  );

  const currentReview = reviews[0];
  const noiseValue = pointMaterial?.noiseValue || currentReview?.measuredValue || 50;
  const noiseColor = getNoiseColor(noiseValue, point.noiseCapacity);
  const statusColor = getStatusColor(point.status);

  const scale = isSelected ? 1.5 : hovered ? 1.2 : 1;

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      const pulse = 1 + Math.sin(time * 2) * 0.1;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedPointId(isSelected ? null : point.id);
  };

  const getStatusIcon = () => {
    switch (point.status) {
      case 'confirmed':
        return <CheckCircle className="w-3 h-3 text-white" />;
      case 'need_evidence':
        return <AlertTriangle className="w-3 h-3 text-white" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-white" />;
      default:
        return <Image className="w-3 h-3 text-white" />;
    }
  };

  return (
    <group position={[point.positionX, point.positionY, point.positionZ]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
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
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={noiseColor}
          emissive={noiseColor}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 32]} />
        <meshStandardMaterial color={statusColor} transparent opacity={0.8} />
      </mesh>

      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0, 1.2, 0]}>
          <div
            className={`
              px-3 py-2 rounded-lg text-white text-xs whitespace-nowrap
              ${isSelected ? 'bg-slate-800 border-2 border-blue-400' : 'bg-slate-700'}
              shadow-lg backdrop-blur-sm
            `}
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            <div className="font-bold mb-1">{point.name}</div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span>{noiseValue} dB / {point.noiseCapacity} dB</span>
            </div>
            <div className="mt-1 text-slate-300 text-[10px]">
              {point.area} · {timePeriod === 'morning' ? '早高峰' : '晚高峰'}
            </div>
          </div>
        </Html>
      )}

      {currentReview?.needManualConfirm && (
        <Html distanceFactor={12} position={[0.5, 0.8, 0]}>
          <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
            待确认
          </div>
        </Html>
      )}
    </group>
  );
}
