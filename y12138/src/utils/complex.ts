import type { ComplexNumber, ComplexMatrix } from '@/types';

export function cAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cSub(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cMul(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function cDiv(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: 0, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function cAbs(a: ComplexNumber): number {
  return Math.sqrt(a.re * a.re + a.im * a.im);
}

export function cAbs2(a: ComplexNumber): number {
  return a.re * a.re + a.im * a.im;
}

export function cExp(theta: ComplexNumber): ComplexNumber {
  const expRe = Math.exp(theta.re);
  return {
    re: expRe * Math.cos(theta.im),
    im: expRe * Math.sin(theta.im),
  };
}

export function cConj(a: ComplexNumber): ComplexNumber {
  return { re: a.re, im: -a.im };
}

export function cReal(r: number): ComplexNumber {
  return { re: r, im: 0 };
}

export function cImag(i: number): ComplexNumber {
  return { re: 0, im: i };
}

export function cSqrt(a: ComplexNumber): ComplexNumber {
  const r = cAbs(a);
  if (r === 0) return { re: 0, im: 0 };
  const cosHalf = Math.sqrt((1 + a.re / r) / 2);
  const sinHalf = Math.sign(a.im) * Math.sqrt((1 - a.re / r) / 2);
  const mag = Math.sqrt(r);
  return { re: mag * cosHalf, im: mag * sinHalf };
}

export function mMul(a: ComplexMatrix, b: ComplexMatrix): ComplexMatrix {
  return {
    m11: cAdd(cMul(a.m11, b.m11), cMul(a.m12, b.m21)),
    m12: cAdd(cMul(a.m11, b.m12), cMul(a.m12, b.m22)),
    m21: cAdd(cMul(a.m21, b.m11), cMul(a.m22, b.m21)),
    m22: cAdd(cMul(a.m21, b.m12), cMul(a.m22, b.m22)),
  };
}

export function mIdentity(): ComplexMatrix {
  return {
    m11: { re: 1, im: 0 },
    m12: { re: 0, im: 0 },
    m21: { re: 0, im: 0 },
    m22: { re: 1, im: 0 },
  };
}

export function cFormat(c: ComplexNumber, precision: number = 4): string {
  const re = c.re.toFixed(precision);
  const im = Math.abs(c.im).toFixed(precision);
  if (Math.abs(c.im) < 1e-10) return re;
  if (Math.abs(c.re) < 1e-10) return `${im}i`;
  const sign = c.im >= 0 ? '+' : '-';
  return `${re}${sign}${im}i`;
}

export function mFormat(m: ComplexMatrix, precision: number = 4): string[][] {
  return [
    [cFormat(m.m11, precision), cFormat(m.m12, precision)],
    [cFormat(m.m21, precision), cFormat(m.m22, precision)],
  ];
}
