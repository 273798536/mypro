import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { COLORS } from '../../utils/color';

interface NebulaAxesProps {
  showAxes: boolean;
  showGrid: boolean;
}

const AXIS_LENGTH = 12;
const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;

export function NebulaAxes({ showAxes, showGrid }: NebulaAxesProps) {
  const axesMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: COLORS.axes, transparent: true, opacity: 0.6 }),
    []
  );
  
  const xAxisGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-AXIS_LENGTH / 2, 0, 0),
      new THREE.Vector3(AXIS_LENGTH / 2, 0, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  
  const yAxisGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, AXIS_LENGTH, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  
  const zAxisGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 0, -AXIS_LENGTH / 2),
      new THREE.Vector3(0, 0, AXIS_LENGTH / 2),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  
  if (!showAxes && !showGrid) return null;
  
  return (
    <group>
      {showGrid && (
        <gridHelper
          args={[GRID_SIZE, GRID_DIVISIONS, COLORS.grid, COLORS.grid]}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
      
      {showAxes && (
        <>
          <primitive object={new THREE.Line(xAxisGeometry, axesMaterial)} />
          <primitive object={new THREE.Line(yAxisGeometry, axesMaterial)} />
          <primitive object={new THREE.Line(zAxisGeometry, axesMaterial)} />
          
          <Text
            position={[AXIS_LENGTH / 2 + 0.5, 0, 0]}
            fontSize={0.3}
            color={COLORS.axes}
            anchorX="left"
            anchorY="middle"
          >
            收益 ↑
          </Text>
          
          <Text
            position={[0, AXIS_LENGTH + 0.5, 0]}
            fontSize={0.3}
            color={COLORS.axes}
            anchorX="center"
            anchorY="bottom"
          >
            波动 ↑
          </Text>
          
          <Text
            position={[0, 0, AXIS_LENGTH / 2 + 0.5]}
            fontSize={0.3}
            color={COLORS.axes}
            anchorX="center"
            anchorY="middle"
          >
            回撤 ↑
          </Text>
          
          {Array.from({ length: 6 }, (_, i) => {
            const x = -5 + i * 2;
            return (
              <Text
                key={`x-${i}`}
                position={[x, -0.3, 0]}
                fontSize={0.2}
                color={COLORS.text.muted}
                anchorX="center"
                anchorY="top"
              >
                {x.toFixed(0)}%
              </Text>
            );
          })}
          
          {Array.from({ length: 6 }, (_, i) => {
            const y = i * 2;
            return (
              <Text
                key={`y-${i}`}
                position={[-0.3, y, 0]}
                fontSize={0.2}
                color={COLORS.text.muted}
                anchorX="right"
                anchorY="middle"
              >
                {y.toFixed(0)}%
              </Text>
            );
          })}
          
          {Array.from({ length: 6 }, (_, i) => {
            const z = -5 + i * 2;
            return (
              <Text
                key={`z-${i}`}
                position={[0, -0.3, z]}
                fontSize={0.2}
                color={COLORS.text.muted}
                anchorX="center"
                anchorY="top"
              >
                {Math.abs(z).toFixed(0)}%
              </Text>
            );
          })}
        </>
      )}
    </group>
  );
}
