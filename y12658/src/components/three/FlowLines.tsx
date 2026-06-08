import { useMemo } from 'react';
import * as THREE from 'three';
import { useDataStore } from '@/store/useDataStore';
import { createViridisScale } from '@/utils/colorScale';

export default function FlowLines() {
  const records = useDataStore((s) => s.records);
  const range = useDataStore((s) => s.valueRange);

  const { geometry } = useMemo(() => {
    const scale = createViridisScale(range.min, range.max);
    const positions: number[] = [];
    const colors: number[] = [];
    const groups = new Map<string, typeof records>();
    records.forEach((r) => {
      const k = r.deviceId;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    });
    groups.forEach((list) => {
      list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const curvePts: THREE.Vector3[] = [];
      list.forEach((r) => {
        curvePts.push(new THREE.Vector3(r.x, r.y, r.z));
      });
      if (curvePts.length < 2) return;
      const sampled = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.4).getPoints(Math.max(curvePts.length * 3, 20));
      for (let i = 0; i < sampled.length; i++) {
        const p = sampled[i];
        positions.push(p.x, p.y, p.z);
        const t = i / (sampled.length - 1);
        const v = range.min + t * (range.max - range.min);
        const c = scale.getColor(v);
        colors.push(c.r, c.g, c.b);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return { geometry: geo };
  }, [records, range.min, range.max]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.55} linewidth={1} />
    </lineSegments>
  );
}
