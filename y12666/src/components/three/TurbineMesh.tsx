import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Turbine, WakeResult } from '@/types';
import { normalizeTurbineToLocal } from '@/utils/coordinateTransform';
import { wakeLossToColor } from '@/utils/wakeCalculation';

interface TurbineMeshProps {
  turbine: Turbine;
  wakeResult?: WakeResult;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
}

export default function TurbineMesh({
  turbine,
  wakeResult,
  selected,
  highlighted,
  onClick,
}: TurbineMeshProps) {
  const bladesRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const local = useMemo(() => normalizeTurbineToLocal(turbine), [turbine]);

  useFrame((_, delta) => {
    if (bladesRef.current) {
      bladesRef.current.rotation.z += delta * 1.2;
    }
  });

  const accentColor = highlighted
    ? '#F46036'
    : selected
    ? '#E2B03A'
    : hovered
    ? '#1B998B'
    : wakeResult?.isOutOfBounds
    ? '#F46036'
    : '#ffffff';

  const lossColor = wakeResult ? wakeLossToColor(wakeResult.wakeLossPercent) : '#1B998B';

  return (
    <group position={[local.x, 0, local.y]}>
      <mesh position={[0, turbine.hubHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[2, 3, turbine.hubHeight, 16]} />
        <meshStandardMaterial color="#d8dee4" metalness={0.4} roughness={0.5} />
      </mesh>

      <mesh position={[0, turbine.hubHeight + 2, 0]} castShadow>
        <sphereGeometry args={[3.5, 20, 20]} />
        <meshStandardMaterial color="#b8c1cb" metalness={0.5} roughness={0.4} />
      </mesh>

      <group ref={bladesRef} position={[0, turbine.hubHeight + 2, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[0, 0, (i * Math.PI * 2) / 3]}
            position={[turbine.rotorDiameter / 4, 0, 0]}
            castShadow
          >
            <boxGeometry args={[turbine.rotorDiameter / 2, 2, 0.8]} />
            <meshStandardMaterial color="#e9edf1" metalness={0.3} roughness={0.6} />
          </mesh>
        ))}
      </group>

      <mesh
        position={[0, 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <cylinderGeometry args={[6, 6, 4, 16]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.15} />
      </mesh>

      {(selected || hovered || highlighted || turbine.isOffset) && (
        <Html
          position={[0, turbine.hubHeight + 20, 0]}
          center
          distanceFactor={12}
          zIndexRange={[10, 0]}
        >
          <div className="bg-ocean-slate/90 text-sea-mist px-3 py-1.5 rounded font-engineering text-xs border border-wake-teal/40 whitespace-nowrap shadow-lg">
            <div className="font-semibold text-sea-mist">{turbine.name}</div>
            <div className="text-wake-teal mt-0.5">
              尾流损失: {wakeResult ? wakeResult.wakeLossPercent.toFixed(1) : 0}%
            </div>
            {turbine.isOffset && (
              <div className="text-alert-orange mt-0.5">⚠ 坐标含人工备注</div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: lossColor }}
              />
              <span className="text-[10px] opacity-70">
                {wakeResult?.isOutOfBounds ? '越界告警' : '正常范围'}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
