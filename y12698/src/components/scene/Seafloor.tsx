import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm } from '../../utils/noise';

const SIZE = 200;
const SEG = 128;

export default function Seafloor() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const baseColor = new THREE.Color('#0A1628');
    const ridgeColor = new THREE.Color('#1a2a44');
    const ventColor = new THREE.Color('#3a2a1a');
    const ventCenters = [
      { x: 0, z: 0, r: 18, depth: 15 },
      { x: 30, z: -20, r: 10, depth: 8 },
      { x: -25, z: 25, r: 12, depth: 10 },
    ];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      let depth = fbm(x * 0.02, z * 0.02, 5) * 8 + 4;
      for (const vc of ventCenters) {
        const d = Math.sqrt((x - vc.x) ** 2 + (z - vc.z) ** 2);
        if (d < vc.r) {
          const t = 1 - d / vc.r;
          depth -= vc.depth * t * t;
        }
      }
      pos.setZ(i, -depth);
      let col = baseColor.clone();
      const ridgeMix = Math.max(0, (depth + 2) / 10);
      col.lerp(ridgeColor, ridgeMix * 0.5);
      for (const vc of ventCenters) {
        const d = Math.sqrt((x - vc.x) ** 2 + (z - vc.z) ** 2);
        if (d < vc.r * 1.5) {
          col.lerp(ventColor, (1 - d / (vc.r * 1.5)) * 0.6);
        }
      }
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.95} metalness={0.05} />
    </mesh>
  );
}
