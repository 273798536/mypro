import type {
  ComplexMatrix,
  ComplexNumber,
  LayerMatrixSnapshot,
  LayerRow,
  AngleParams,
  WavelengthResult,
} from '@/types';
import {
  cReal,
  cAdd,
  cSub,
  cMul,
  cDiv,
  cAbs2,
  cSqrt,
  mMul,
  mIdentity,
} from './complex';

function complexN(nReal: number, nImag: number): ComplexNumber {
  return { re: nReal, im: nImag };
}

function computeSnellAngle(n1: number, n2Real: number, theta1Rad: number): ComplexNumber {
  const sinTheta1 = Math.sin(theta1Rad);
  const sinTheta2sq = (n1 * n1 * sinTheta1 * sinTheta1) / (n2Real * n2Real);
  const cosTheta2sq = cSub(cReal(1), complexN(sinTheta2sq, 0));
  return cSqrt(cosTheta2sq);
}

function computeEta(
  nReal: number,
  nImag: number,
  cosTheta: ComplexNumber,
  polarization: 's' | 'p'
): ComplexNumber {
  const n = complexN(nReal, nImag);
  if (polarization === 's') {
    return cMul(n, cosTheta);
  }
  return cDiv(n, cosTheta);
}

function computePhaseThickness(
  nReal: number,
  nImag: number,
  d: number,
  cosTheta: ComplexNumber,
  wavelength: number
): ComplexNumber {
  const factor = (2 * Math.PI * d) / wavelength;
  const nCosTheta = cMul(complexN(nReal, nImag), cosTheta);
  return { re: factor * nCosTheta.re, im: factor * nCosTheta.im };
}

function computeLayerMatrix(delta: ComplexNumber, eta: ComplexNumber): ComplexMatrix {
  const cosDelta: ComplexNumber = {
    re: Math.cos(delta.re) * Math.cosh(delta.im),
    im: -Math.sin(delta.re) * Math.sinh(delta.im),
  };

  const iSinDelta: ComplexNumber = {
    re: -Math.cos(delta.re) * Math.sinh(delta.im),
    im: Math.sin(delta.re) * Math.cosh(delta.im),
  };

  const iSinDeltaOverEta = cDiv(iSinDelta, eta);
  const iEtaSinDelta = cMul(eta, iSinDelta);

  return {
    m11: cosDelta,
    m12: iSinDeltaOverEta,
    m21: iEtaSinDelta,
    m22: { re: cosDelta.re, im: cosDelta.im },
  };
}

export function calculateReflectance(
  layers: LayerRow[],
  angle: AngleParams,
  wavelength: number,
  ambientN: number,
  substrateN: number
): WavelengthResult & { layerMatrices: LayerMatrixSnapshot[] } {
  const theta0Rad = (angle.angleDeg * Math.PI) / 180;
  const validLayers = layers.filter(
    (l) =>
      !l.status.isEmpty &&
      !l.status.isComment &&
      !l.status.missingColumns &&
      !l.status.zeroThickness &&
      !l.status.missingRefractiveIndex &&
      l.n !== null &&
      l.d !== null &&
      l.d > 0
  );

  const cosTheta0 = Math.cos(theta0Rad);
  const eta0 = computeEta(ambientN, 0, cReal(cosTheta0), angle.polarization);
  const cosThetaSub = computeSnellAngle(ambientN, substrateN, theta0Rad);
  const etaS = computeEta(substrateN, 0, cosThetaSub, angle.polarization);

  let M: ComplexMatrix = mIdentity();
  const layerMatrices: LayerMatrixSnapshot[] = [];

  for (const layer of validLayers) {
    const nReal = layer.n!;
    const nImag = layer.k ?? 0;
    const d = layer.d!;

    const cosThetaL = computeSnellAngle(ambientN, nReal, theta0Rad);
    const delta = computePhaseThickness(nReal, nImag, d, cosThetaL, wavelength);
    const eta = computeEta(nReal, nImag, cosThetaL, angle.polarization);
    const layerMatrix = computeLayerMatrix(delta, eta);

    layerMatrices.push({
      layerIndex: layer.rowIndex,
      material: layer.material,
      n: nReal,
      k: nImag,
      d,
      delta,
      matrix: layerMatrix,
    });

    M = mMul(M, layerMatrix);
  }

  const B = cAdd(M.m11, cMul(M.m12, etaS));
  const C = cAdd(M.m21, cMul(M.m22, etaS));
  const eta0B = cMul(eta0, B);

  const numerator = cSub(eta0B, C);
  const denominator = cAdd(eta0B, C);

  const r = cDiv(numerator, denominator);
  const R = cAbs2(r);

  const T = (4 * eta0.re * etaS.re) / cAbs2(denominator);

  const A = Math.max(0, 1 - R - T);

  const traceId = `wl_${wavelength.toFixed(1)}_${Date.now().toString(36)}`;

  return {
    wavelength,
    reflectance: R,
    transmittance: T,
    absorptance: A,
    layerMatrices,
    cumulativeMatrix: M,
    traceId,
  };
}

export function calculateSpectrum(
  layers: LayerRow[],
  angle: AngleParams,
  wavelengthStart: number,
  wavelengthEnd: number,
  wavelengthStep: number,
  ambientN: number,
  substrateN: number
): WavelengthResult[] {
  const results: WavelengthResult[] = [];
  const step = wavelengthStep > 0 ? wavelengthStep : 1;
  for (let wl = wavelengthStart; wl <= wavelengthEnd + step * 0.01; wl += step) {
    const result = calculateReflectance(layers, angle, wl, ambientN, substrateN);
    results.push(result);
  }
  return results;
}
