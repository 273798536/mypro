export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const calculateStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
};

export const calculateTTest = (control: number[], experimental: number[]): { pValue: number; tStatistic: number } => {
  const n1 = control.length;
  const n2 = experimental.length;
  const mean1 = calculateMean(control);
  const mean2 = calculateMean(experimental);
  const std1 = calculateStdDev(control);
  const std2 = calculateStdDev(experimental);

  const pooledStdError = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
  const tStatistic = (mean2 - mean1) / pooledStdError;

  const df = n1 + n2 - 2;
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(tStatistic), df));

  return { pValue, tStatistic };
};

const tDistributionCDF = (t: number, df: number): number => {
  const x = df / (df + t * t);
  return 1 - 0.5 * regularizedIncompleteBeta(df / 2, 0.5, x);
};

const regularizedIncompleteBeta = (a: number, b: number, x: number): number => {
  const bt = x === 0 || x === 1
    ? 0
    : Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x));

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  } else {
    return 1 - bt * betaCF(b, a, 1 - x) / b;
  }
};

const gammaLn = (n: number): number => {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = n;
  let x = n;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};

const betaCF = (a: number, b: number, x: number): number => {
  const maxIter = 100;
  const eps = 3e-7;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    h *= d * c;
  }
  return h;
};

export const adjustPValues = (pValues: number[]): number[] => {
  const sorted = pValues.map((p, i) => ({ p, index: i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array(pValues.length);
  const n = pValues.length;

  for (let i = 0; i < sorted.length; i++) {
    adjusted[sorted[i].index] = Math.min(1, sorted[i].p * n / (i + 1));
  }

  return adjusted;
};

export const calculateFoldChange = (controlMean: number, experimentalMean: number): number => {
  if (controlMean === 0) return experimentalMean > 0 ? Infinity : 0;
  return experimentalMean / controlMean;
};

export const calculateLog2FoldChange = (controlMean: number, experimentalMean: number): number => {
  const foldChange = calculateFoldChange(controlMean, experimentalMean);
  if (foldChange <= 0) return -Infinity;
  return Math.log2(foldChange);
};
