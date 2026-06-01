import type { Matrix2x2, Vector2, TransformBlock } from '../types/matrix';

export const IDENTITY_MATRIX: Matrix2x2 = [
  [1, 0],
  [0, 1]
];

export const EPSILON = 0.0001;

export function multiplyMatrices(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1]
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1]
    ]
  ];
}

export function multiplyMatrixVector(matrix: Matrix2x2, vector: Vector2): Vector2 {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1]
  ];
}

export function multiplyMatrixList(matrices: Matrix2x2[]): Matrix2x2 {
  return matrices.reduce((acc, m) => multiplyMatrices(acc, m), IDENTITY_MATRIX);
}

export function matricesEqual(a: Matrix2x2, b: Matrix2x2, epsilon: number = EPSILON): boolean {
  return (
    Math.abs(a[0][0] - b[0][0]) < epsilon &&
    Math.abs(a[0][1] - b[0][1]) < epsilon &&
    Math.abs(a[1][0] - b[1][0]) < epsilon &&
    Math.abs(a[1][1] - b[1][1]) < epsilon
  );
}

export function matrixDeterminant(m: Matrix2x2): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

export function isSingular(m: Matrix2x2): boolean {
  return Math.abs(matrixDeterminant(m)) < EPSILON;
}

export function createRotationMatrix(angleDegrees: number): Matrix2x2 {
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.round(Math.cos(angle) * 1000) / 1000;
  const sin = Math.round(Math.sin(angle) * 1000) / 1000;
  return [
    [cos, -sin],
    [sin, cos]
  ];
}

export function createScaleMatrix(sx: number, sy: number): Matrix2x2 {
  return [
    [sx, 0],
    [0, sy]
  ];
}

export function createShearMatrix(shx: number, shy: number): Matrix2x2 {
  return [
    [1, shx],
    [shy, 1]
  ];
}

export function createTransformBlock(
  id: string,
  type: 'rotate' | 'scale' | 'shear' | 'identity',
  params: Record<string, number>
): TransformBlock {
  let matrix: Matrix2x2;
  let name: string;
  let description: string;

  switch (type) {
    case 'rotate': {
      const angle = params.angle || 0;
      matrix = createRotationMatrix(angle);
      name = `旋转 ${angle}°`;
      description = `绕原点逆时针旋转 ${angle} 度`;
      break;
    }
    case 'scale': {
      const sx = params.sx ?? 1;
      const sy = params.sy ?? 1;
      matrix = createScaleMatrix(sx, sy);
      if (sx === sy) {
        name = `缩放 ×${sx}`;
        description = `均匀缩放 ${sx} 倍`;
      } else {
        name = `缩放 (${sx},${sy})`;
        description = `x 轴缩放 ${sx} 倍，y 轴缩放 ${sy} 倍`;
      }
      break;
    }
    case 'shear': {
      const shx = params.shx ?? 0;
      const shy = params.shy ?? 0;
      matrix = createShearMatrix(shx, shy);
      name = `错切 (${shx},${shy})`;
      description = `x 方向错切 ${shx}，y 方向错切 ${shy}`;
      break;
    }
    case 'identity':
    default:
      matrix = IDENTITY_MATRIX;
      name = '单位矩阵';
      description = '不改变任何向量';
  }

  return { id, type, matrix, name, description, params };
}

export function formatMatrix(m: Matrix2x2): string {
  return `[${m[0][0]}, ${m[0][1]}]\n[${m[1][0]}, ${m[1][1]}]`;
}

export function matrixToString(m: Matrix2x2): string {
  return `[${m[0][0]},${m[0][1]};${m[1][0]},${m[1][1]}]`;
}

export function roundMatrix(m: Matrix2x2, decimals: number = 3): Matrix2x2 {
  const factor = Math.pow(10, decimals);
  return [
    [Math.round(m[0][0] * factor) / factor, Math.round(m[0][1] * factor) / factor],
    [Math.round(m[1][0] * factor) / factor, Math.round(m[1][1] * factor) / factor]
  ];
}
