import {
  ScanParameter,
  InterfaceResult,
  Anomaly,
  VersionHistory,
  TissueType,
  ArtifactType,
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const now = new Date().toISOString();

export const mockScanParameters: ScanParameter[] = [
  {
    id: 'param-001',
    scanType: 'T1加权成像 (T1WI)',
    tr: 600,
    te: 15,
    flipAngle: 90,
    sliceThickness: 5,
    fov: '240x240',
    matrix: '256x256',
    bandwidth: 32,
    nex: 2,
    tissueType: 'white_matter',
    artifactLabel: 'none',
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'param-002',
    scanType: 'T2加权成像 (T2WI)',
    tr: 3000,
    te: 85,
    flipAngle: 120,
    sliceThickness: 5,
    fov: '240x240',
    matrix: '256x256',
    bandwidth: 32,
    nex: 2,
    tissueType: 'gray_matter',
    artifactLabel: 'motion',
    status: 'anomaly',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'param-003',
    scanType: '弥散加权成像 (DWI)',
    tr: 8000,
    te: 70,
    flipAngle: 90,
    sliceThickness: 4,
    fov: '220x220',
    matrix: '128x128',
    bandwidth: 32,
    nex: 4,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'param-004',
    scanType: '磁敏感加权成像 (SWI)',
    tr: 28,
    te: 20,
    flipAngle: 15,
    sliceThickness: 2,
    fov: '240x240',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'param-005',
    scanType: 'T2加权成像 (T2WI)',
    tr: 4500,
    te: 120,
    flipAngle: 90,
    status: 'anomaly',
    createdAt: now,
    updatedAt: now,
  },
];

const TISSUE_T1_FACTOR: Record<TissueType, number> = {
  white_matter: 1.2, gray_matter: 1.0, csf: 0.6, muscle: 0.8,
  fat: 1.4, bone: 0.3, tumor: 0.7, edema: 0.9, necrosis: 0.5, other: 0.8,
};

const ARTIFACT_PROB_FACTOR: Record<ArtifactType, number> = {
  none: 0.0, motion: 0.25, susceptibility: 0.18,
  chemical_shift: 0.12, aliasing: 0.10, noise: 0.15,
  gradient_nonlinearity: 0.08, rf_feedthrough: 0.06,
};

const INTERFACE_OFFSETS: Record<string, { snrOff: number; cnrOff: number; contrastOff: number; timeFactor: number; confOff: number }> = {
  '标准接口A': { snrOff: 0, cnrOff: 0, contrastOff: 0, timeFactor: 1.0, confOff: 0 },
  '优化接口B': { snrOff: -5, cnrOff: -2, contrastOff: -0.03, timeFactor: 0.85, confOff: -0.04 },
  '快速接口C': { snrOff: -20, cnrOff: -8, contrastOff: -0.10, timeFactor: 0.6, confOff: -0.12 },
};

function hashParam(p: ScanParameter): number {
  const s = `${p.tr}|${p.te}|${p.flipAngle}|${p.sliceThickness || 0}|${p.bandwidth || 0}|${p.nex || 1}|${p.tissueType || 'none'}|${p.artifactLabel || 'none'}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function computeResults(p: ScanParameter): InterfaceResult[] {
  const base = hashParam(p);
  const tissueFactor = p.tissueType ? TISSUE_T1_FACTOR[p.tissueType] : 1.0;
  const artifactFactor = p.artifactLabel ? ARTIFACT_PROB_FACTOR[p.artifactLabel] : 0.0;
  const trFactor = Math.min(p.tr / 1000, 3);
  const teFactor = p.te / 100;
  const nex = p.nex || 1;
  const bandwidth = p.bandwidth || 32;

  const baseSnr = 40 + trFactor * 25 + Math.sqrt(nex) * 15 + bandwidth * 0.3 + tissueFactor * 10;
  const baseCnr = 15 + trFactor * 12 + Math.sqrt(nex) * 6 + tissueFactor * 5;
  const baseContrast = 0.4 + tissueFactor * 0.15 + trFactor * 0.05 - artifactFactor * 0.1;
  const baseTime = (p.tr * nex * (p.sliceThickness || 5)) / 1000 + 30;
  const baseArtifact = artifactFactor + (base % 10) / 100 * 0.05;

  return calculateInterfaceNames.map((name) => {
    const off = INTERFACE_OFFSETS[name];
    const snr = baseSnr + off.snrOff + (base % 7) * 0.3;
    const cnr = baseCnr + off.cnrOff + (base % 5) * 0.2;
    const contrast = Math.min(0.99, Math.max(0.1, baseContrast + off.contrastOff));
    const scanTime = Math.round(baseTime * off.timeFactor);
    const artifactProb = Math.min(0.95, Math.max(0.0, baseArtifact + (base % 3) * 0.01));
    const qualityScore = Math.round(
      Math.min(100, Math.max(0, (1 - artifactProb) * 60 + (snr / 150) * 25 + contrast * 15))
    );
    const confidence = Math.min(0.99, Math.max(0.5, 0.85 + off.confOff + (base % 4) * 0.01));
    const recommended = artifactProb < 0.2 && qualityScore >= 65;

    return {
      id: `${p.id}-${name}`,
      parameterId: p.id,
      interfaceName: name,
      resultData: {
        snr: Math.round(snr * 10) / 10,
        cnr: Math.round(cnr * 10) / 10,
        tissueContrast: Math.round(contrast * 100) / 100,
        scanTime,
        artifactProbability: Math.round(artifactProb * 100) / 100,
        recommended,
        qualityScore,
      },
      confidence: Math.round(confidence * 100) / 100,
      calculatedAt: new Date().toISOString(),
    };
  });
}

export const mockInterfaceResults: InterfaceResult[] = mockScanParameters
  .filter((p) => p.tissueType)
  .flatMap((p) => computeResults(p));

export const mockAnomalies: Anomaly[] = mockScanParameters
  .filter((p) => p.tissueType)
  .flatMap((p) => {
    const results = mockInterfaceResults.filter((r) => r.parameterId === p.id);
    return results.length > 0 ? detectAnomalies(p, results) : [];
  });

export const mockVersionHistories: VersionHistory[] = [
  {
    id: 'version-001',
    parameterId: 'param-001',
    version: 2,
    beforeData: { tissueType: 'gray_matter' as TissueType },
    afterData: { tissueType: 'white_matter' as TissueType },
    modifiedBy: '医学物理讲师',
    changeReason: '根据临床图像重新判断为白质',
    impactAnalysis: {
      artifactInterpretationChange: true,
      qualityScoreChange: 5,
      recommendationChange: false,
    },
    createdAt: now,
  },
  {
    id: 'version-002',
    parameterId: 'param-002',
    version: 1,
    beforeData: { artifactLabel: 'none' as ArtifactType },
    afterData: { artifactLabel: 'motion' as ArtifactType },
    modifiedBy: '医学物理讲师',
    changeReason: '检测到明显运动伪影',
    impactAnalysis: {
      artifactInterpretationChange: true,
      qualityScoreChange: -8,
      recommendationChange: true,
    },
    createdAt: now,
  },
];

export const calculateInterfaceNames = ['标准接口A', '优化接口B', '快速接口C'];

export const calculateInterfaceResult = async (
  parameter: ScanParameter,
  interfaceName: string
): Promise<InterfaceResult> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const all = computeResults(parameter);
  return all.find((r) => r.interfaceName === interfaceName) || all[0];
};

export const detectAnomalies = (
  parameter: ScanParameter,
  results: InterfaceResult[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  const recommendedResults = results.filter((r) => r.resultData.recommended);
  const notRecommendedResults = results.filter((r) => !r.resultData.recommended);

  if (recommendedResults.length > 0 && notRecommendedResults.length > 0) {
    anomalies.push({
      id: generateId(),
      parameterId: parameter.id,
      type: 'conflict',
      severity: recommendedResults.length === notRecommendedResults.length ? 'high' : 'medium',
      description: `接口推荐结果存在分歧：${recommendedResults.map((r) => r.interfaceName).join('、')}推荐，${notRecommendedResults.map((r) => r.interfaceName).join('、')}不推荐`,
      status: 'pending',
      affectedInterfaces: results.map((r) => r.interfaceName),
      createdAt: new Date().toISOString(),
    });
  }

  const maxScanTime = Math.max(...results.map((r) => r.resultData.scanTime || 0));
  if (maxScanTime > 300) {
    anomalies.push({
      id: generateId(),
      parameterId: parameter.id,
      type: 'timeout',
      severity: maxScanTime > 400 ? 'high' : 'medium',
      description: `扫描时间超限：预计扫描时间${maxScanTime}秒，建议最大时长300秒`,
      status: 'pending',
      affectedInterfaces: results
        .filter((r) => (r.resultData.scanTime || 0) > 300)
        .map((r) => r.interfaceName),
      createdAt: new Date().toISOString(),
    });
  }

  const artifactProbs = results.map((r) => r.resultData.artifactProbability || 0);
  const maxDiff = Math.max(...artifactProbs) - Math.min(...artifactProbs);

  if (maxDiff > 0.15) {
    const avgProb = artifactProbs.reduce((a, b) => a + b, 0) / artifactProbs.length;
    anomalies.push({
      id: generateId(),
      parameterId: parameter.id,
      type: 'artifact_misjudgment',
      severity: maxDiff > 0.25 ? 'high' : 'medium',
      description: `伪影判断不一致：各接口伪影概率差异${Math.round(maxDiff * 100)}%，平均概率${Math.round(avgProb * 100)}%`,
      status: 'pending',
      affectedInterfaces: results.map((r) => r.interfaceName),
      createdAt: new Date().toISOString(),
    });
  }

  return anomalies;
};

export { generateId };
