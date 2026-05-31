import * as THREE from 'three';
import { ImplicitFunction, Point3D } from './implicitParser';

export interface MarchingCubesResult {
  vertices: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export function colormapFunction(t: number, colormap: string): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const colormaps: Record<string, [number, number, number][]> = {
    viridis: [
      [0.267, 0.004, 0.329], [0.283, 0.141, 0.458], [0.253, 0.265, 0.529],
      [0.207, 0.372, 0.553], [0.164, 0.471, 0.558], [0.128, 0.567, 0.551],
      [0.135, 0.659, 0.518], [0.267, 0.753, 0.441], [0.478, 0.821, 0.318],
      [0.741, 0.873, 0.150], [0.993, 0.906, 0.144],
    ],
    plasma: [
      [0.052, 0.029, 0.529], [0.180, 0.028, 0.663], [0.314, 0.020, 0.745],
      [0.439, 0.002, 0.788], [0.557, 0.038, 0.788], [0.667, 0.109, 0.749],
      [0.764, 0.194, 0.684], [0.846, 0.287, 0.606], [0.911, 0.388, 0.521],
      [0.960, 0.496, 0.435], [0.993, 0.612, 0.357], [0.999, 0.733, 0.293],
      [0.983, 0.857, 0.261], [0.940, 0.976, 0.277],
    ],
    inferno: [
      [0.001, 0.001, 0.003], [0.040, 0.028, 0.064], [0.087, 0.033, 0.134],
      [0.144, 0.027, 0.202], [0.203, 0.019, 0.261], [0.262, 0.008, 0.308],
      [0.322, 0.003, 0.344], [0.380, 0.017, 0.368], [0.436, 0.045, 0.381],
      [0.489, 0.084, 0.385], [0.540, 0.129, 0.381], [0.587, 0.178, 0.372],
      [0.633, 0.230, 0.357], [0.675, 0.284, 0.340], [0.714, 0.340, 0.321],
      [0.750, 0.397, 0.302], [0.783, 0.455, 0.285], [0.814, 0.514, 0.271],
      [0.842, 0.575, 0.261], [0.868, 0.636, 0.256], [0.891, 0.699, 0.257],
      [0.912, 0.763, 0.265], [0.930, 0.827, 0.282], [0.946, 0.892, 0.307],
      [0.960, 0.958, 0.342],
    ],
    magma: [
      [0.002, 0.001, 0.014], [0.031, 0.017, 0.096], [0.075, 0.023, 0.181],
      [0.126, 0.018, 0.267], [0.179, 0.009, 0.346], [0.234, 0.004, 0.416],
      [0.290, 0.024, 0.472], [0.344, 0.075, 0.512], [0.396, 0.135, 0.540],
      [0.446, 0.197, 0.559], [0.494, 0.259, 0.572], [0.540, 0.320, 0.581],
      [0.585, 0.380, 0.587], [0.628, 0.440, 0.592], [0.670, 0.499, 0.596],
      [0.710, 0.559, 0.599], [0.749, 0.619, 0.602], [0.786, 0.679, 0.606],
      [0.823, 0.740, 0.612], [0.858, 0.801, 0.620], [0.891, 0.862, 0.633],
      [0.923, 0.924, 0.651], [0.954, 0.986, 0.676],
    ],
  };

  const colors = colormaps[colormap] || colormaps.viridis;
  const idx = t * (colors.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;

  if (i >= colors.length - 1) {
    return colors[colors.length - 1];
  }

  const c1 = colors[i];
  const c2 = colors[i + 1];

  return [
    c1[0] + f * (c2[0] - c1[0]),
    c1[1] + f * (c2[1] - c1[1]),
    c1[2] + f * (c2[2] - c1[2]),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function lerp3(a: Point3D, b: Point3D, t: number): Point3D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

const cubeCorners = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];

const cubeEdges = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const edgeTable = new Uint16Array([
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x099, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
]);

const triTable = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

export function marchingCubes(
  implicitFunc: ImplicitFunction,
  parameters: Record<string, number>,
  bounds: { min: Point3D; max: Point3D },
  resolution: number = 48,
  colorMode: 'curvature' | 'height' | 'normal' | 'gradient' = 'normal',
  colormap: string = 'viridis'
): MarchingCubesResult {
  const vertices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const vertexCache = new Map<string, number>();

  const stepX = (bounds.max.x - bounds.min.x) / resolution;
  const stepY = (bounds.max.y - bounds.min.y) / resolution;
  const stepZ = (bounds.max.z - bounds.min.z) / resolution;

  const getOrCreateVertex = (edgeIndex: number, cubeX: number, cubeY: number, cubeZ: number, values: Float32Array, corners: Point3D[]): number => {
    const edge = cubeEdges[edgeIndex];
    const i1 = edge[0];
    const i2 = edge[1];
    
    const v1 = values[i1];
    const v2 = values[i2];
    
    const key = `${cubeX},${cubeY},${cubeZ},${edgeIndex}`;
    
    if (vertexCache.has(key)) {
      return vertexCache.get(key)!;
    }

    let t = 0.5;
    if (Math.abs(v2 - v1) > 1e-10) {
      t = -v1 / (v2 - v1);
    }

    const p1 = corners[i1];
    const p2 = corners[i2];
    const x = lerp(p1.x, p2.x, t);
    const y = lerp(p1.y, p2.y, t);
    const z = lerp(p1.z, p2.z, t);

    const grad = implicitFunc.evaluateGradient(x, y, z, parameters);
    let nx = -grad.x;
    let ny = -grad.y;
    let nz = -grad.z;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    let cr = 0.5, cg = 0.5, cb = 0.5;
    switch (colorMode) {
      case 'height':
        const ht = (y - bounds.min.y) / (bounds.max.y - bounds.min.y);
        [cr, cg, cb] = colormapFunction(ht, colormap);
        break;
      case 'normal':
        const nt = (ny + 1) / 2;
        [cr, cg, cb] = colormapFunction(nt, colormap);
        break;
      case 'gradient':
        const gt = Math.min(Math.sqrt(grad.x ** 2 + grad.y ** 2 + grad.z ** 2), 1);
        [cr, cg, cb] = colormapFunction(gt, colormap);
        break;
      default:
        [cr, cg, cb] = colormapFunction((ny + 1) / 2, colormap);
    }

    const vertexIndex = vertices.length / 3;
    vertices.push(x, y, z);
    normals.push(nx, ny, nz);
    colors.push(cr, cg, cb);
    vertexCache.set(key, vertexIndex);

    return vertexIndex;
  };

  const values = new Float32Array(8);
  const corners: Point3D[] = new Array(8);

  for (let ix = 0; ix < resolution; ix++) {
    for (let iy = 0; iy < resolution; iy++) {
      for (let iz = 0; iz < resolution; iz++) {
        for (let i = 0; i < 8; i++) {
          const [ox, oy, oz] = cubeCorners[i];
          const x = bounds.min.x + (ix + ox) * stepX;
          const y = bounds.min.y + (iy + oy) * stepY;
          const z = bounds.min.z + (iz + oz) * stepZ;
          corners[i] = { x, y, z };
          values[i] = implicitFunc.evaluate(x, y, z, parameters);
        }

        let cubeIndex = 0;
        for (let i = 0; i < 8; i++) {
          if (values[i] < 0) cubeIndex |= (1 << i);
        }

        if (cubeIndex === 0 || cubeIndex === 255) continue;

        const edgeFlags = edgeTable[cubeIndex];
        if (edgeFlags === 0) continue;

        const triRow = triTable[cubeIndex];
        if (!triRow) continue;

        for (let i = 0; triRow[i] !== -1 && i < triRow.length; i += 3) {
          if (triRow[i + 1] === -1 || triRow[i + 2] === -1) break;
          
          const v0 = getOrCreateVertex(triRow[i], ix, iy, iz, values, corners);
          const v1 = getOrCreateVertex(triRow[i + 1], ix, iy, iz, values, corners);
          const v2 = getOrCreateVertex(triRow[i + 2], ix, iy, iz, values, corners);

          indices.push(v0, v1, v2);
        }
      }
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}
