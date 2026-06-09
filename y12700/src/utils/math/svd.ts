import { Matrix, cloneMatrix, transpose, norm, EPSILON } from './matrix';

function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

function hypot(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (a > b) {
    const t = b / a;
    return a * Math.sqrt(1 + t * t);
  }
  if (b === 0) return 0;
  const t = a / b;
  return b * Math.sqrt(1 + t * t);
}

export function svd(Ain: Matrix): { U: Matrix; S: number[]; V: Matrix } {
  const A = cloneMatrix(Ain);
  const m = A.length;
  const n = A[0].length;
  const nu = Math.min(m, n);

  const U: Matrix = Array.from({ length: m }, () => Array(nu).fill(0));
  const V: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const S: number[] = Array(n).fill(0);
  const e: number[] = Array(n).fill(0);
  const work: number[] = Array(m).fill(0);

  let wantu = true;
  let wantv = true;

  let nct = Math.min(m - 1, n);
  let nrt = Math.max(0, Math.min(n - 2, m));
  let lu = Math.max(nct, nrt);

  for (let k = 0; k < lu; k++) {
    if (k < nct) {
      S[k] = 0;
      for (let i = k; i < m; i++) S[k] = hypot(S[k], A[i][k]);
      if (S[k] !== 0) {
        if (A[k][k] < 0) S[k] = -S[k];
        for (let i = k; i < m; i++) A[i][k] /= S[k];
        A[k][k] += 1;
      }
      S[k] = -S[k];
    }
    for (let j = k + 1; j < n; j++) {
      if (k < nct && S[k] !== 0) {
        let t = 0;
        for (let i = k; i < m; i++) t += A[i][k] * A[i][j];
        t = -t / A[k][k];
        for (let i = k; i < m; i++) A[i][j] += t * A[i][k];
      }
      e[j] = A[k][j];
    }
    if (wantu && k < nct) {
      for (let i = k; i < m; i++) U[i][k] = A[i][k];
    }
    if (k < nrt) {
      e[k] = 0;
      for (let i = k + 1; i < n; i++) e[k] = hypot(e[k], e[i]);
      if (e[k] !== 0) {
        if (e[k + 1] < 0) e[k] = -e[k];
        for (let i = k + 1; i < n; i++) e[i] /= e[k];
        e[k + 1] += 1;
      }
      e[k] = -e[k];
      if (k + 1 < m && e[k] !== 0) {
        for (let i = k + 1; i < m; i++) work[i] = 0;
        for (let j = k + 1; j < n; j++) {
          for (let i = k + 1; i < m; i++) work[i] += e[j] * A[i][j];
        }
        for (let j = k + 1; j < n; j++) {
          const t = -e[j] / e[k + 1];
          for (let i = k + 1; i < m; i++) A[i][j] += t * work[i];
        }
      }
      if (wantv) {
        for (let i = k + 1; i < n; i++) V[i][k] = e[i];
      }
    }
  }

  let p = Math.min(n, m + 1);
  if (nct < n) S[nct] = A[nct][nct];
  if (m < p) S[p - 1] = 0;
  if (nrt + 1 < p) e[nrt] = A[nrt][p - 1];
  e[p - 1] = 0;

  if (wantu) {
    for (let j = nct; j < nu; j++) {
      for (let i = 0; i < m; i++) U[i][j] = 0;
      U[j][j] = 1;
    }
    for (let k = nct - 1; k >= 0; k--) {
      if (S[k] !== 0) {
        for (let j = k + 1; j < nu; j++) {
          let t = 0;
          for (let i = k; i < m; i++) t += U[i][k] * U[i][j];
          t = -t / U[k][k];
          for (let i = k; i < m; i++) U[i][j] += t * U[i][k];
        }
        for (let i = k; i < m; i++) U[i][k] = -U[i][k];
        U[k][k] += 1;
        for (let i = 0; i < k; i++) U[i][k] = 0;
      } else {
        for (let i = 0; i < m; i++) U[i][k] = 0;
        U[k][k] = 1;
      }
    }
  }

  if (wantv) {
    for (let k = n - 1; k >= 0; k--) {
      if (k < nrt && e[k] !== 0) {
        for (let j = k + 1; j < nu; j++) {
          let t = 0;
          for (let i = k + 1; i < n; i++) t += V[i][k] * V[i][j];
          t = -t / V[k + 1][k];
          for (let i = k + 1; i < n; i++) V[i][j] += t * V[i][k];
        }
      }
      for (let i = 0; i < n; i++) V[i][k] = 0;
      V[k][k] = 1;
    }
  }

  const pp = p - 1;
  let iter = 0;
  const eps = EPSILON;
  const tiny = 1e-300;

  while (p > 0) {
    let k;
    let flag;
    for (k = p - 2; k >= -1; k--) {
      if (k === -1) break;
      if (Math.abs(e[k]) <= tiny + eps * (Math.abs(S[k]) + Math.abs(S[k + 1]))) {
        e[k] = 0;
        break;
      }
    }
    if (k === p - 2) {
      flag = 1;
    } else {
      let ks;
      for (ks = p - 1; ks >= k; ks--) {
        if (ks === k) break;
        const t = (ks !== p ? Math.abs(e[ks]) : 0) + (ks !== k + 1 ? Math.abs(e[ks - 1]) : 0);
        if (Math.abs(S[ks]) <= tiny + eps * t) {
          S[ks] = 0;
          break;
        }
      }
      if (ks === k) {
        flag = 3;
      } else if (ks === p - 1) {
        flag = 4;
      } else {
        flag = 2;
        k = ks;
      }
    }
    k++;

    switch (flag) {
      case 1: {
        let f = e[p - 2];
        e[p - 2] = 0;
        for (let j = p - 2; j >= k; j--) {
          let t = hypot(S[j], f);
          const cs = S[j] / t;
          const sn = f / t;
          S[j] = t;
          if (j !== k) {
            f = -sn * e[j - 1];
            e[j - 1] = cs * e[j - 1];
          }
          if (wantv) {
            for (let i = 0; i < n; i++) {
              t = cs * V[i][j] + sn * V[i][p - 1];
              V[i][p - 1] = -sn * V[i][j] + cs * V[i][p - 1];
              V[i][j] = t;
            }
          }
        }
        break;
      }
      case 2: {
        let f = e[k - 1];
        e[k - 1] = 0;
        for (let j = k; j < p; j++) {
          let t = hypot(S[j], f);
          const cs = S[j] / t;
          const sn = f / t;
          S[j] = t;
          f = -sn * e[j];
          e[j] = cs * e[j];
          if (wantu) {
            for (let i = 0; i < m; i++) {
              t = cs * U[i][j] + sn * U[i][k - 1];
              U[i][k - 1] = -sn * U[i][j] + cs * U[i][k - 1];
              U[i][j] = t;
            }
          }
        }
        break;
      }
      case 3: {
        const scale = Math.max(
          Math.abs(S[p - 1]),
          Math.abs(S[p - 2]),
          Math.abs(e[p - 2]),
          Math.abs(S[k]),
          Math.abs(e[k])
        );
        const sp = S[p - 1] / scale;
        const spm1 = S[p - 2] / scale;
        const epm1 = e[p - 2] / scale;
        const sk = S[k] / scale;
        const ek = e[k] / scale;
        const b = ((spm1 + sp) * (spm1 - sp) + epm1 * epm1) / 2;
        const c = sp * epm1 * (sp * epm1);
        let shift = 0;
        if (b !== 0 || c !== 0) {
          shift = Math.sqrt(b * b + c);
          if (b < 0) shift = -shift;
          shift = c / (b + shift);
        }
        let f = (sk + sp) * (sk - sp) - shift;
        let g = sk * ek;
        for (let j = k; j < p - 1; j++) {
          let t = hypot(f, g);
          let cs = f / t;
          let sn = g / t;
          if (j !== k) e[j - 1] = t;
          f = cs * S[j] + sn * e[j];
          e[j] = cs * e[j] - sn * S[j];
          g = sn * S[j + 1];
          S[j + 1] = cs * S[j + 1];
          if (wantv) {
            for (let i = 0; i < n; i++) {
              t = cs * V[i][j] + sn * V[i][j + 1];
              V[i][j + 1] = -sn * V[i][j] + cs * V[i][j + 1];
              V[i][j] = t;
            }
          }
          t = hypot(f, g);
          cs = f / t;
          sn = g / t;
          S[j] = t;
          f = cs * e[j] + sn * S[j + 1];
          S[j + 1] = -sn * e[j] + cs * S[j + 1];
          g = sn * e[j + 1];
          e[j + 1] = cs * e[j + 1];
          if (wantu && j < m - 1) {
            for (let i = 0; i < m; i++) {
              t = cs * U[i][j] + sn * U[i][j + 1];
              U[i][j + 1] = -sn * U[i][j] + cs * U[i][j + 1];
              U[i][j] = t;
            }
          }
        }
        e[p - 2] = f;
        iter = iter + 1;
        break;
      }
      case 4: {
        if (S[k] < 0) {
          S[k] = -S[k];
          if (wantv) {
            for (let i = 0; i <= pp; i++) V[i][k] = -V[i][k];
          }
        }
        while (k < pp) {
          if (S[k] >= S[k + 1]) break;
          const t = S[k];
          S[k] = S[k + 1];
          S[k + 1] = t;
          if (wantv && k < n - 1) {
            for (let i = 0; i < n; i++) {
              const t2 = V[i][k];
              V[i][k] = V[i][k + 1];
              V[i][k + 1] = t2;
            }
          }
          if (wantu && k < m - 1) {
            for (let i = 0; i < m; i++) {
              const t2 = U[i][k];
              U[i][k] = U[i][k + 1];
              U[i][k + 1] = t2;
            }
          }
          k++;
        }
        iter = 0;
        p--;
        break;
      }
    }
  }

  const singular = S.slice(0, Math.min(m, n)).sort((a, b) => Math.abs(b) - Math.abs(a));

  return { U, S: singular, V: transpose(V) };
}
