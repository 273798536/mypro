import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CrackPoint } from '../../types';

interface CrackMarkerProps {
  crack: CrackPoint;
  allCracks: CrackPoint[];
  isSelected: boolean;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  duplicate: '重复',
  missing_field: '缺字段',
  late_added: '晚补',
};

const STATUS_COLORS: Record<string, string> = {
  normal: '#059669',
  duplicate: '#DC2626',
  missing_field: '#D97706',
  late_added: '#D97706',
};

const STATUS_BG: Record<string, string> = {
  normal: 'rgba(5,150,105,0.15)',
  duplicate: 'rgba(220,38,38,0.15)',
  missing_field: 'rgba(217,119,6,0.15)',
  late_added: 'rgba(217,119,6,0.15)',
};

export function CrackMarker({ crack, allCracks, isSelected, onClick }: CrackMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const duplicateName = useMemo(() => {
    if (!crack.isDuplicate || !crack.duplicateOf) return null;
    const source = allCracks.find((c) => c.id === crack.duplicateOf);
    return source ? source.name : crack.duplicateOf;
  }, [crack.isDuplicate, crack.duplicateOf, allCracks]);

  const statusKey = crack.isDuplicate ? 'duplicate' : crack.status;
  const color = STATUS_COLORS[statusKey] ?? '#059669';

  const size = 0.5 + crack.length * 0.02;
  const displaySize = isSelected ? size * 1.3 : size;

  const labelY = displaySize + (crack.isDuplicate ? 1.2 : 0.6);

  useFrame((state) => {
    if (meshRef.current) {
      if (crack.isDuplicate) {
        const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        meshRef.current.scale.setScalar(s);
      }
      if (isSelected) {
        meshRef.current.position.y =
          0 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  const showDetail = hovered || isSelected;

  return (
    <group position={[crack.x * 0.8, crack.z / 10 + 0.5, crack.y * 0.8]}>
      <mesh
        ref={meshRef}
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
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[displaySize, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || hovered ? 0.6 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.2, 0]}>
          <ringGeometry args={[displaySize + 0.3, displaySize + 0.5, 32]} />
          <meshBasicMaterial color="#3B82F6" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}

      {crack.isDuplicate && (
        <mesh position={[0, displaySize + 0.5, 0]}>
          <coneGeometry args={[0.3, 0.6, 4]} />
          <meshBasicMaterial color="#DC2626" />
        </mesh>
      )}

      <Html
        position={[0, labelY, 0]}
        center
        distanceFactor={60}
        style={{ pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        <div
          className="flex flex-col items-center gap-0.5"
          style={{
            transform: 'translateY(-100%)',
          }}
        >
          <span
            className="font-bold leading-tight px-1.5 py-0.5 rounded"
            style={{
              fontSize: '11px',
              color: '#F1F5F9',
              background: 'rgba(15,23,42,0.85)',
              border: `1px solid ${color}55`,
            }}
          >
            {crack.name}
          </span>

          <span
            className="leading-tight px-1.5 py-0.5 rounded font-medium"
            style={{
              fontSize: '9px',
              color,
              background: STATUS_BG[statusKey] ?? 'rgba(5,150,105,0.15)',
              border: `1px solid ${color}44`,
            }}
          >
            {STATUS_LABELS[statusKey] ?? '正常'}
          </span>

          {crack.isDuplicate && duplicateName && (
            <span
              className="leading-tight px-1.5 py-0.5 rounded font-medium"
              style={{
                fontSize: '9px',
                color: '#FCA5A5',
                background: 'rgba(220,38,38,0.12)',
                border: '1px solid rgba(220,38,38,0.3)',
              }}
            >
              重复于 {duplicateName}
            </span>
          )}

          {showDetail && (
            <>
              <span
                className="leading-tight px-1.5 py-0.5 rounded"
                style={{
                  fontSize: '9px',
                  color: '#94A3B8',
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(51,65,85,0.5)',
                }}
              >
                {crack.x.toFixed(1)}, {crack.y.toFixed(1)} / {crack.z.toFixed(0)}m
              </span>

              {crack.riskLevel === 'high' && (
                <span
                  className="leading-tight px-1.5 py-0.5 rounded font-medium"
                  style={{
                    fontSize: '9px',
                    color: '#FCA5A5',
                    background: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.3)',
                  }}
                >
                  高风险
                </span>
              )}

              {!crack.rainfall && (
                <span
                  className="leading-tight px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: '9px',
                    color: '#FBBF24',
                    background: 'rgba(217,119,6,0.1)',
                    border: '1px solid rgba(217,119,6,0.3)',
                  }}
                >
                  雨量缺测
                </span>
              )}

              {!crack.residentCoords && (
                <span
                  className="leading-tight px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: '9px',
                    color: '#FBBF24',
                    background: 'rgba(217,119,6,0.1)',
                    border: '1px solid rgba(217,119,6,0.3)',
                  }}
                >
                  住户坐标缺失
                </span>
              )}
            </>
          )}
        </div>
      </Html>
    </group>
  );
}
