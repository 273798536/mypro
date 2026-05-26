import { useMemo } from 'react';
import * as THREE from 'three';

export const Axes = () => {
  const axisLength = 50;

  const axesArrows = useMemo(() => {
    return [
      { dir: new THREE.Vector3(1, 0, 0), color: '#ff4444', label: '波动率 X' },
      { dir: new THREE.Vector3(0, 1, 0), color: '#44ff44', label: '最大回撤 Y' },
      { dir: new THREE.Vector3(0, 0, 1), color: '#4444ff', label: '收益率 Z' }
    ];
  }, []);

  return (
    <group>
      {axesArrows.map((axis, i) => (
        <group key={i}>
          <arrowHelper
            args={[
              axis.dir,
              new THREE.Vector3(0, 0, 0),
              axisLength,
              axis.color,
              2,
              1
            ]}
          />
          <sprite position={axis.dir.clone().multiplyScalar(axisLength + 3)}>
            <spriteMaterial
              attach="material"
              color={axis.color}
              transparent
              opacity={0.8}
            />
          </sprite>
        </group>
      ))}
      
      <gridHelper args={[50, 10, '#333333', '#222222']} position={[0, 0, 0]} />
      <gridHelper args={[50, 10, '#333333', '#222222']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
      <gridHelper args={[50, 10, '#333333', '#222222']} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]} />
    </group>
  );
};
