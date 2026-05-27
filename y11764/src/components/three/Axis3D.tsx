import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { getAxisLabel } from '../../utils/formatters';
import type { AxisMapping } from '../../types/portfolio';

interface Axis3DProps {
  xAxis: AxisMapping;
  yAxis: AxisMapping;
  zAxis: AxisMapping;
  scale?: number;
}

export const Axis3D: React.FC<Axis3DProps> = ({
  xAxis,
  yAxis,
  zAxis,
  scale = 1
}) => {
  const axisConfig = useMemo(() => {
    const halfScale = scale / 2;
    
    return {
      x: {
        start: new THREE.Vector3(-halfScale, -halfScale, -halfScale),
        end: new THREE.Vector3(halfScale, -halfScale, -halfScale),
        label: getAxisLabel(xAxis),
        labelPos: new THREE.Vector3(halfScale + 0.1, -halfScale, -halfScale)
      },
      y: {
        start: new THREE.Vector3(-halfScale, -halfScale, -halfScale),
        end: new THREE.Vector3(-halfScale, halfScale, -halfScale),
        label: getAxisLabel(yAxis),
        labelPos: new THREE.Vector3(-halfScale, halfScale + 0.1, -halfScale)
      },
      z: {
        start: new THREE.Vector3(-halfScale, -halfScale, -halfScale),
        end: new THREE.Vector3(-halfScale, -halfScale, halfScale),
        label: getAxisLabel(zAxis),
        labelPos: new THREE.Vector3(-halfScale, -halfScale, halfScale + 0.1)
      }
    };
  }, [xAxis, yAxis, zAxis, scale]);

  const tickMarks = useMemo(() => {
    const halfScale = scale / 2;
    const ticks: { points: [THREE.Vector3, THREE.Vector3]; color: string }[] = [];
    const tickLength = 0.03;
    
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const pos = (i / 4) * halfScale;
      
      ticks.push({
        points: [
          new THREE.Vector3(pos, -halfScale - tickLength, -halfScale),
          new THREE.Vector3(pos, -halfScale + tickLength, -halfScale)
        ],
        color: '#d4af37'
      });
      
      ticks.push({
        points: [
          new THREE.Vector3(-halfScale - tickLength, pos, -halfScale),
          new THREE.Vector3(-halfScale + tickLength, pos, -halfScale)
        ],
        color: '#d4af37'
      });
      
      ticks.push({
        points: [
          new THREE.Vector3(-halfScale, -halfScale - tickLength, pos),
          new THREE.Vector3(-halfScale, -halfScale + tickLength, pos)
        ],
        color: '#d4af37'
      });
    }
    
    return ticks;
  }, [scale]);

  const gridHelper = useMemo(() => {
    const halfScale = scale / 2;
    const gridSize = scale;
    const gridDivisions = 10;
    const lines: { points: [THREE.Vector3, THREE.Vector3]; color: string }[] = [];
    
    for (let i = 0; i <= gridDivisions; i++) {
      const pos = -halfScale + (i / gridDivisions) * gridSize;
      
      lines.push({
        points: [
          new THREE.Vector3(-halfScale, -halfScale, pos),
          new THREE.Vector3(halfScale, -halfScale, pos)
        ],
        color: 'rgba(212, 175, 55, 0.15)'
      });
      
      lines.push({
        points: [
          new THREE.Vector3(pos, -halfScale, -halfScale),
          new THREE.Vector3(pos, -halfScale, halfScale)
        ],
        color: 'rgba(212, 175, 55, 0.15)'
      });
    }
    
    return lines;
  }, [scale]);

  return (
    <group>
      {gridHelper.map((line, i) => (
        <Line
          key={`grid-${i}`}
          points={line.points}
          color={line.color}
          lineWidth={1}
        />
      ))}
      
      <Line
        points={[axisConfig.x.start, axisConfig.x.end]}
        color="#d4af37"
        lineWidth={2}
      />
      <Line
        points={[axisConfig.y.start, axisConfig.y.end]}
        color="#d4af37"
        lineWidth={2}
      />
      <Line
        points={[axisConfig.z.start, axisConfig.z.end]}
        color="#d4af37"
        lineWidth={2}
      />
      
      {tickMarks.map((tick, i) => (
        <Line
          key={`tick-${i}`}
          points={tick.points}
          color={tick.color}
          lineWidth={1}
        />
      ))}
      
      <mesh position={axisConfig.x.end}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>
      <mesh position={axisConfig.y.end} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>
      <mesh position={axisConfig.z.end} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>
      
      <Text
        position={axisConfig.x.labelPos}
        fontSize={0.05}
        color="#d4af37"
        anchorX="left"
        anchorY="middle"
      >
        {axisConfig.x.label}
      </Text>
      <Text
        position={axisConfig.y.labelPos}
        fontSize={0.05}
        color="#d4af37"
        anchorX="center"
        anchorY="bottom"
      >
        {axisConfig.y.label}
      </Text>
      <Text
        position={axisConfig.z.labelPos}
        fontSize={0.05}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
      >
        {axisConfig.z.label}
      </Text>
    </group>
  );
};
