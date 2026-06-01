import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiskPoint } from '../../types';

interface RiskMarkersProps {
  risks: RiskPoint[];
  showLabels: boolean;
}

const RISK_COLORS: Record<string, string> = {
  angle_violation: '#ff4757',
  oversampling: '#ffa502',
  reverse_flow: '#3742fa',
};

export function RiskMarkers({ risks, showLabels }: RiskMarkersProps) {
  const markersRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (markersRef.current) {
      markersRef.current.children.forEach((child, i) => {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2;
        child.scale.setScalar(scale);
      });
    }
  });

  return (
    <group ref={markersRef}>
      {risks.map((risk) => (
        <group key={risk.id} position={risk.position}>
          <mesh>
            <sphereGeometry args={[risk.severity === 'high' ? 0.15 : risk.severity === 'medium' ? 0.1 : 0.07, 16, 16]} />
            <meshBasicMaterial
              color={RISK_COLORS[risk.type]}
              transparent
              opacity={0.8}
            />
          </mesh>

          <mesh>
            <ringGeometry args={[0.18, 0.22, 32]} />
            <meshBasicMaterial
              color={RISK_COLORS[risk.type]}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>

          {showLabels && (
            <sprite position={[0, 0.3, 0]} scale={[1.5, 0.5, 1]}>
              <spriteMaterial>
                <canvasTexture
                  attach="map"
                  image={(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d')!;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.roundRect(0, 0, 256, 64, 8);
                    ctx.fill();
                    ctx.fillStyle = RISK_COLORS[risk.type];
                    ctx.font = 'bold 20px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                      risk.type === 'angle_violation' ? '角度越界' :
                      risk.type === 'oversampling' ? '采样过密' : '尾流反向',
                      128,
                      30
                    );
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '14px monospace';
                    ctx.fillText(
                      risk.type === 'angle_violation' ? `${risk.value}°` :
                      risk.type === 'oversampling' ? `${risk.value}m` : `${Math.round(risk.value * 100)}%`,
                      128,
                      52
                    );
                    return canvas;
                  })()}
                />
              </spriteMaterial>
            </sprite>
          )}
        </group>
      ))}
    </group>
  );
}
