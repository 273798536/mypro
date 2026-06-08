import { useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ContainerPosition, AnomalyRecord } from '../../types';

interface ContainerBoxProps {
  container: ContainerPosition;
  anomaly?: AnomalyRecord;
  highlighted?: boolean;
}

export default function ContainerBox({ container, anomaly, highlighted }: ContainerBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const getColor = () => {
    if (anomaly && anomaly.severity === 'high') return '#ef4444';
    if (anomaly && anomaly.severity === 'medium') return '#f59e0b';
    if (anomaly && anomaly.severity === 'low') return '#eab308';
    if (highlighted) return '#3b82f6';
    if (hovered) return '#60a5fa';
    return '#94a3b8';
  };

  const getOpacity = () => {
    if (anomaly) return 0.9;
    if (highlighted) return 0.85;
    if (hovered) return 0.8;
    return 0.7;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  return (
    <group position={[container.x, container.y + container.height / 2, container.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[container.width, container.height, container.depth]} />
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={getOpacity()}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {highlighted && (
        <mesh position={[0, container.height / 2 + 0.5, 0]}>
          <boxGeometry args={[container.width + 1, 0.5, container.depth + 1]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      )}

      {anomaly && (
        <>
          <mesh position={[0, container.height / 2 + 2, 0]}>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial color={getColor()} />
          </mesh>

          <lineSegments position={[0, 0, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(container.width, container.height, container.depth)]} />
            <lineBasicMaterial color={getColor()} linewidth={2} />
          </lineSegments>
        </>
      )}

      {showTooltip && (
        <Html position={[0, container.height + 3, 0]} center>
          <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 min-w-[200px]">
            <h4 className="font-bold text-lg mb-2">{container.name}</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-slate-400">位置:</span>{' '}
                <span className="font-mono">
                  ({container.x.toFixed(1)}, {container.z.toFixed(1)})
                </span>
              </p>
              <p>
                <span className="text-slate-400">尺寸:</span>{' '}
                <span className="font-mono">
                  {container.width}×{container.height}×{container.depth}
                </span>
              </p>
              {anomaly && (
                <>
                  <p>
                    <span className="text-slate-400">异常:</span>{' '}
                    <span className="text-red-400 font-semibold">{anomaly.type}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">严重程度:</span>{' '}
                    <span
                      className={`font-semibold ${
                        anomaly.severity === 'high'
                          ? 'text-red-500'
                          : anomaly.severity === 'medium'
                          ? 'text-amber-500'
                          : 'text-yellow-500'
                      }`}
                    >
                      {anomaly.severity === 'high'
                        ? '高危'
                        : anomaly.severity === 'medium'
                        ? '中危'
                        : '低危'}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
