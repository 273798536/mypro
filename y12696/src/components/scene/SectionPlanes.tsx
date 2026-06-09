import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/useSceneStore';

export function SectionPlanes({ clipPlanes }: { clipPlanes: THREE.Plane[] }) {
  const sectionPlanes = useSceneStore((s) => s.sectionPlanes);

  const axisColor: Record<string, string> = {
    x: '#ff6b6b',
    y: '#51cf66',
    z: '#339af0',
  };

  const axisRotation: Record<string, [number, number, number]> = {
    x: [0, 0, -Math.PI / 2],
    y: [-Math.PI / 2, 0, 0],
    z: [0, 0, 0],
  };

  const getPlanePosition = (axis: string, pos: number): [number, number, number] => {
    if (axis === 'x') return [pos, 5, 0];
    if (axis === 'y') return [0, pos, 0];
    return [0, 5, pos];
  };

  const getPlaneSize = (axis: string): [number, number] => {
    if (axis === 'x') return [14, 12];
    if (axis === 'y') return [24, 14];
    return [24, 12];
  };

  const activePlanes = (['x', 'y', 'z'] as const).filter((a) => sectionPlanes[a].enabled);

  return (
    <group>
      {activePlanes.map((axis) => {
        const plane = sectionPlanes[axis];
        const color = axisColor[axis];
        const [w, h] = getPlaneSize(axis);

        return (
          <group key={axis} position={getPlanePosition(axis, plane.position)} rotation={axisRotation[axis]}>
            {/* 剖切可视化平面 */}
            <mesh>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.12}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* 边框线 */}
            <lineSegments>
              <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
              <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} />
            </lineSegments>
            {/* 中心十字 */}
            <group>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[w * 0.02, h * 0.6]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[w * 0.6, h * 0.02]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} />
              </mesh>
            </group>
            {/* 轴标签 */}
            <mesh position={[w / 2 - 0.5, h / 2 - 0.5, 0.02]}>
              <circleGeometry args={[0.3, 24]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
