import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

const cache = new Map<number, ReturnType<typeof createNoise2D>>();

function getNoise(seed: number) {
  let n = cache.get(seed);
  if (!n) {
    const rnd = mulberry32(seed);
    n = createNoise2D(rnd);
    cache.set(seed, n);
  }
  return n;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function terrainHeight(x: number, z: number, seed = 1): number {
  const n = getNoise(seed);
  const low = n(x * 0.035, z * 0.035) * 3.5;
  const mid = n(x * 0.12, z * 0.12) * 1.2;
  const high = n(x * 0.5, z * 0.5) * 0.35;
  const craters = craterField(x, z, seed);
  return low + mid + high + craters;
}

function craterField(x: number, z: number, seed: number): number {
  const n = getNoise(seed + 99);
  const c = n(x * 0.08, z * 0.08);
  if (c > 0.45) {
    const d = (c - 0.45) * 3;
    return -Math.pow(d, 1.5) * 4;
  }
  return 0;
}

export function buildTerrainGeometry(size = 80, segments = 200, seed = 1) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeight(x, z, seed);
    pos.setY(i, y);
    const shade = 0.45 + (y / 8) * 0.35 + Math.random() * 0.04;
    const r = Math.min(1, Math.max(0.08, shade));
    const g = Math.min(1, Math.max(0.08, shade * 0.92));
    const b = Math.min(1, Math.max(0.1, shade * 0.85));
    colors.push(r, g, b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
