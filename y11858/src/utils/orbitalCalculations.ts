import type { OrbitalParams, VisualizationSettings } from '../types';

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function doubleFactorial(n: number): number {
  if (n <= 0) return 1;
  let result = 1;
  for (let i = n; i > 0; i -= 2) result *= i;
  return result;
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

function associatedLaguerre(n: number, alpha: number, x: number): number {
  let sum = 0;
  for (let k = 0; k <= n; k++) {
    const coeff = (-1) ** k * binomial(n + alpha, n - k) / factorial(k);
    sum += coeff * x ** k;
  }
  return sum;
}

function realSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const absM = Math.abs(m);
  const normFactor = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM))
  );
  const associatedLegendre = (l: number, m: number, x: number): number => {
    if (l === 0 && m === 0) return 1;
    if (l === m) {
      return (-1) ** m * doubleFactorial(2 * m - 1) * (1 - x * x) ** (m / 2);
    }
    if (l === m + 1) {
      return x * (2 * m + 1) * ((-1) ** m * doubleFactorial(2 * m - 1)) * (1 - x * x) ** (m / 2);
    }
    const pPrev = associatedLegendre(l - 1, m, x);
    const pPrevPrev = associatedLegendre(l - 2, m, x);
    return ((2 * l - 1) * x * pPrev - (l + m - 1) * pPrevPrev) / (l - m);
  };

  const cosTheta = Math.cos(theta);
  const plm = associatedLegendre(l, absM, cosTheta);

  if (m === 0) {
    return normFactor * plm;
  } else if (m > 0) {
    return Math.SQRT2 * normFactor * plm * Math.cos(absM * phi);
  } else {
    return Math.SQRT2 * normFactor * plm * Math.sin(absM * phi);
  }
}

function radialWavefunction(n: number, l: number, r: number): number {
  const a0 = 1;
  const rho = 2 * r / (n * a0);
  const normFactor = Math.sqrt(
    ((2 / (n * a0)) ** 3 * factorial(n - l - 1)) /
    (2 * n * (factorial(n + l)) ** 3)
  );
  const laguerre = associatedLaguerre(n - l - 1, 2 * l + 1, rho);
  return normFactor * Math.exp(-rho / 2) * rho ** l * laguerre;
}

export function wavefunction(
  n: number, l: number, m: number,
  r: number, theta: number, phi: number
): number {
  const R = radialWavefunction(n, l, r);
  const Y = realSphericalHarmonic(l, m, theta, phi);
  return R * Y;
}

export function probabilityDensity(
  n: number, l: number, m: number,
  r: number, theta: number, phi: number,
  normFactor = 1
): number {
  const psi = wavefunction(n, l, m, r, theta, phi);
  return psi * psi * normFactor * normFactor;
}

export function generateVolumeData(
  params: OrbitalParams,
  settings: VisualizationSettings
): Float32Array {
  const { resolution, gridSize } = settings;
  const { n, l, m } = params;
  const normFactor = params.isNormalized ? 1 : (params.normalizationFactor ?? 1);
  const data = new Float32Array(resolution * resolution * resolution);
  const halfSize = gridSize;
  const step = (2 * halfSize) / (resolution - 1);

  let maxVal = 0;
  for (let iz = 0; iz < resolution; iz++) {
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const x = -halfSize + ix * step;
        const y = -halfSize + iy * step;
        const z = -halfSize + iz * step;

        const r = Math.sqrt(x * x + y * y + z * z);
        const theta = r > 1e-10 ? Math.acos(z / r) : 0;
        const phi = Math.atan2(y, x);

        const density = r > 1e-10
          ? probabilityDensity(n, l, m, r, theta, phi, normFactor)
          : (l === 0 ? probabilityDensity(n, l, m, 1e-10, 0, 0, normFactor) : 0);

        const idx = iz * resolution * resolution + iy * resolution + ix;
        data[idx] = density;
        if (density > maxVal) maxVal = density;
      }
    }
  }

  if (maxVal > 0) {
    for (let i = 0; i < data.length; i++) {
      data[i] /= maxVal;
    }
  }

  return data;
}

export function numericalIntegral(
  data: Float32Array,
  gridSize: number,
  resolution: number
): number {
  const step = (2 * gridSize) / (resolution - 1);
  const dV = step * step * step;
  let integral = 0;

  for (let iz = 0; iz < resolution; iz++) {
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        const x = -gridSize + ix * step;
        const y = -gridSize + iy * step;
        const z = -gridSize + iz * step;
        const r = Math.sqrt(x * x + y * y + z * z);
        const jacobian = r > 1e-10 ? r * r : 0;
        const idx = iz * resolution * resolution + iy * resolution + ix;
        integral += data[idx] * jacobian * dV;
      }
    }
  }

  return integral * 4 * Math.PI;
}
