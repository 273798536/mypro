import { useMemo } from 'react';
import * as THREE from 'three';
import type { Turbine } from '../../data/types';
import { useStore } from '../../store/useStore';

interface WakeConeProps {
  turbine: Turbine;
}

export default function WakeCone({ turbine }: WakeConeProps) {
  const windDirection = useStore((s) => s.windDirection);
  const showWake = useStore((s) => s.showWake);
  const wakeResults = useStore((s) => s.wakeResults);
  const scale = 0.01;

  const geometry = useMemo(() => {
    if (!showWake) return null;

    const windRad = (windDirection * Math.PI) / 180;
    const dirX = Math.sin(windRad);
    const dirZ = -Math.cos(windRad);

    const wakeData = wakeResults.find((w) => w.turbineId === turbine.id);
    if (!wakeData) return null;

    const maxLength = 1200 * scale;
    const startRadius = (turbine.rotorDiameter / 2) * scale * 0.6;
    const endRadius = startRadius + 0.04 * (maxLength / scale) * scale;

    const segments = 16;
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const dist = t * maxLength;
      const radius = startRadius + (endRadius - startRadius) * t;

      for (let j = 0; j <= 24; j++) {
        const angle = (j / 24) * Math.PI * 2;
        const px = turbine.x * scale + dirX * dist + Math.cos(angle) * radius;
        const py = (turbine.hubHeight / 120) * 8 * scale;
        const pz = turbine.y * scale + dirZ * dist + Math.sin(angle) * radius;
        positions.push(px, py, pz);

        const deficit = wakeData.deficit;
        if (deficit < 0.1) {
          colors.push(0, 0.83, 0.67, 0.12 * (1 - t));
        } else if (deficit < 0.25) {
          colors.push(1, 0.42, 0.21, 0.2 * (1 - t));
        } else {
          colors.push(0.94, 0.27, 0.27, 0.3 * (1 - t));
        }
      }
    }

    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < 24; j++) {
        const a = i * 25 + j;
        const b = a + 1;
        const c = a + 25;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [turbine, windDirection, showWake, wakeResults, scale]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
