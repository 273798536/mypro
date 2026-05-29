import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { TerrainData } from '../../types';

interface AxisGridProps {
  terrainData: TerrainData;
}

export function AxisGrid({ terrainData }: AxisGridProps) {
  const xLabels = useMemo(() => {
    const { xRange } = terrainData;
    return [0, 0.25, 0.5, 0.75, 1].map(t => ({
      position: [(t - 0.5) * 10, 0, -5.5] as [number, number, number],
      value: (xRange[0] + t * (xRange[1] - xRange[0])).toFixed(1)
    }));
  }, [terrainData]);

  const zLabels = useMemo(() => {
    const { yRange } = terrainData;
    return [0, 0.25, 0.5, 0.75, 1].map(t => ({
      position: [-5.5, 0, (t - 0.5) * 10] as [number, number, number],
      value: Math.pow(10, yRange[0] + t * (yRange[1] - yRange[0])).toExponential(1)
    }));
  }, [terrainData]);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, -5, 5, 0, -5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00D4FF" linewidth={2} />
      </line>
      <Html position={[0, -0.3, -5.8]} center>
        <span className="text-primary-400 text-xs font-mono">训练步骤 →</span>
      </Html>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, -5, -5, 0, 5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#FF6B6B" linewidth={2} />
      </line>
      <Html position={[-5.8, -0.3, 0]} center rotation={[0, Math.PI / 2, 0]}>
        <span className="text-red-400 text-xs font-mono">学习率 →</span>
      </Html>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, -5, -5, 5, -5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00FF88" linewidth={2} />
      </line>
      <Html position={[-5.8, 2.5, -5]} center>
        <span className="text-green-400 text-xs font-mono">↑ 损失值</span>
      </Html>

      {xLabels.map((label, i) => (
        <Html key={`x-${i}`} position={label.position} center>
          <span className="text-gray-400 text-xs font-mono">{label.value}</span>
        </Html>
      ))}

      {zLabels.map((label, i) => (
        <Html key={`z-${i}`} position={label.position} center>
          <span className="text-gray-400 text-xs font-mono">{label.value}</span>
        </Html>
      ))}
    </group>
  );
}
