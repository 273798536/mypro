import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { getContourLines } from '@/utils/waterLevel';

export default function TerrainMesh() {
  const terrain = useStore((s) => s.terrain);
  const waterLevel = useStore((s) => s.waterLevel);
  const showContourLines = useStore((s) => s.showContourLines);
  const showSubmergedArea = useStore((s) => s.showSubmergedArea);
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, colors } = useMemo(() => {
    if (!terrain) return { geometry: new THREE.BufferGeometry(), colors: new Float32Array() };
    const { width, height } = terrain.gridSize;
    const positions: number[] = [];
    const colorArr: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const elev = terrain.elevations[i]?.[j] ?? 0;
        const x = (j - width / 2) * terrain.cellSize * 0.01;
        const z = (i - height / 2) * terrain.cellSize * 0.01;
        const y = elev * 0.05;
        positions.push(x, y, z);
        const t = (elev - terrain.minElevation) / (terrain.maxElevation - terrain.minElevation + 0.01);
        if (elev < waterLevel && showSubmergedArea) {
          colorArr.push(0.0, 0.4 + t * 0.2, 0.7 + t * 0.15);
        } else {
          const r = 0.15 + t * 0.35;
          const g = 0.35 + t * 0.45;
          const b = 0.1 + t * 0.15;
          colorArr.push(r, g, b);
        }
      }
    }

    for (let i = 0; i < height - 1; i++) {
      for (let j = 0; j < width - 1; j++) {
        const a = i * width + j;
        const b = i * width + j + 1;
        const c = (i + 1) * width + j;
        const d = (i + 1) * width + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return { geometry: geo, colors: new Float32Array(colorArr) };
  }, [terrain, waterLevel, showSubmergedArea]);

  const contourGroup = useMemo(() => {
    if (!terrain || !showContourLines) return null;
    const contours = getContourLines(terrain, 20);
    const group = new THREE.Group();
    for (const contour of contours) {
      if (contour.points.length < 2) continue;
      const pts = contour.points.map(
        ([x, z]) => new THREE.Vector3(
          (x - terrain.gridSize.width / 2) * terrain.cellSize * 0.01,
          contour.level * 0.05 + 0.05,
          (z - terrain.gridSize.height / 2) * terrain.cellSize * 0.01,
        )
      );
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: contour.level < waterLevel ? 0x00bcd4 : 0xaaaaaa,
        transparent: true,
        opacity: contour.level < waterLevel ? 0.8 : 0.3,
      });
      group.add(new THREE.Line(lineGeo, lineMat));
    }
    return group;
  }, [terrain, waterLevel, showContourLines]);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.vertexColors) {
        mat.needsUpdate = true;
      }
    }
  });

  if (!terrain) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      {contourGroup && <primitive object={contourGroup} />}
    </group>
  );
}
