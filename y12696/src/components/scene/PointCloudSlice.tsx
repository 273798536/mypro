import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/useSceneStore';

export function PointCloudSlice() {
  const sectionPlanes = useSceneStore((s) => s.sectionPlanes);
  const waterLevel = useSceneStore((s) => s.waterLevel);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pts: number[] = [];
    const cols: number[] = [];

    // 闸室内部生成点云点
    const countX = 20;
    const countY = 30;
    const countZ = 20;

    for (let i = 0; i < countX; i++) {
      for (let j = 0; j < countY; j++) {
        for (let k = 0; k < countZ; k++) {
          const x = -4.5 + (i / (countX - 1)) * 9;
          const y = 0.2 + (j / (countY - 1)) * 9;
          const z = -4.5 + (k / (countZ - 1)) * 9;

          // 模拟一些离群点（真实数据中常见的小麻烦）
          const noise = (Math.random() - 0.5) * 0.08;
          const isOutlier = Math.random() < 0.015;

          const finalY = isOutlier ? y + Math.random() * 2.5 : y + noise;

          pts.push(x + noise * 0.5, finalY, z + noise * 0.5);

          // 颜色：水面附近蓝色，越深越暗，离群点红色
          let r: number, g: number, b: number;
          if (isOutlier) {
            r = 1; g = 0.3; b = 0.3;
          } else if (y > waterLevel.currentLevel - 0.2) {
            r = 0; g = 0.7; b = 1;
          } else if (y < 1) {
            r = 0.4; g = 0.45; b = 0.55;
          } else {
            const t = y / waterLevel.currentLevel;
            r = 0.05 * t;
            g = 0.25 + t * 0.2;
            b = 0.5 + t * 0.25;
          }
          cols.push(r, g, b);
        }
      }
    }

    // 额外加几个明显的离群漂浮点（用户要求的"真实小麻烦"）
    for (let o = 0; o < 5; o++) {
      const ox = (Math.random() - 0.5) * 8;
      const oy = waterLevel.currentLevel + 1 + Math.random() * 2;
      const oz = (Math.random() - 0.5) * 8;
      pts.push(ox, oy, oz);
      cols.push(1, 0.2, 0.2);
    }

    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
    };
  }, [waterLevel.currentLevel]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  // 只在启用任意剖切时显示点云切片
  const anyEnabled = (['x', 'y', 'z'] as const).some((a) => sectionPlanes[a].enabled);
  if (!anyEnabled) return null;

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* 剖切后显示的网格截面 */}
      {(['y'] as const).map((axis) => {
        if (!sectionPlanes[axis].enabled) return null;
        const y = sectionPlanes[axis].position;
        return (
          <group key={`grid-${axis}`} position={[0, y, 0]}>
            <gridHelper args={[10, 20, '#339af033', '#339af011']} />
          </group>
        );
      })}
    </group>
  );
}
