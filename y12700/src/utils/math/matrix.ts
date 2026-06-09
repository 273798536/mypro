export type Matrix = number[][];

export function createMatrix(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

export function cloneMatrix(A: Matrix): Matrix {
  return A.map(row => row.slice());
}

export function transpose(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0].length;
  const T = createMatrix(cols, rows);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

export function multiply(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  if (n !== B.length) throw new Error('Matrix dimensions mismatch');
  const C = createMatrix(m, p);
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      for (let j = 0; j < p; j++) {
        C[i][j] += a * B[k][j];
      }
    }
  }
  return C;
}

export function norm(v: number[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

export function eye(n: number): Matrix {
  const E = createMatrix(n, n);
  for (let i = 0; i < n; i++) E[i][i] = 1;
  return E;
}

export const EPSILON = Number.EPSILON || 2.220446049250313e-16;
