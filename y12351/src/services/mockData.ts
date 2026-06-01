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

export const mockInterfaceResults: InterfaceResult[] = [
  {
    id: 'result-001',
    parameterId: 'param-001',
    interfaceName: '标准接口A',
    resultData: {
      snr: 125.5,
      cnr: 45.2,
      tissueContrast: 0.85,
      scanTime: 180,
      artifactProbability: 0.05,
      recommended: true,
      qualityScore: 88,
    },
    confidence: 0.92,
    calculatedAt: now,
  },
  {
    id: 'result-002',
    parameterId: 'param-001',
    interfaceName: '优化接口B',
    resultData: {
      snr: 118.3,
      cnr: 42.8,
      tissueContrast: 0.82,
      scanTime: 165,
      artifactProbability: 0.08,
      recommended: true,
      qualityScore: 85,
    },
    confidence: 0.88,
    calculatedAt: now,
  },
  {
    id: 'result-003',
    parameterId: 'param-001',
    interfaceName: '快速接口C',
    resultData: {
      snr: 95.8,
      cnr: 38.5,
      tissueContrast: 0.75,
      scanTime: 120,
      artifactProbability: 0.12,
      recommended: false,
      qualityScore: 72,
    },
    confidence: 0.78,
    calculatedAt: now,
  },
  {
    id: 'result-004',
    parameterId: 'param-002',
    interfaceName: '标准接口A',
    resultData: {
      snr: 88.2,
      cnr: 35.6,
      tissueContrast: 0.72,
      scanTime: 240,
      artifactProbability: 0.25,
      recommended: false,
      qualityScore: 68,
    },
    confidence: 0.85,
    calculatedAt: now,
  },
  {
    id: 'result-005',
    parameterId: 'param-002',
    interfaceName: '优化接口B',
    resultData: {
      snr: 92.4,
      cnr: 38.1,
      tissueContrast: 0.76,
      scanTime: 220,
      artifactProbability: 0.22,
      recommended: true,
      qualityScore: 75,
    },
    confidence: 0.82,
    calculatedAt: now,
  },
  {
    id: 'result-006',
    parameterId: 'param-002',
    interfaceName: '快速接口C',
    resultData: {
      snr: 75.1,
      cnr: 28.3,
      tissueContrast: 0.65,
      scanTime: 180,
      artifactProbability: 0.35,
      recommended: false,
      qualityScore: 58,
    },
    confidence: 0.70,
    calculatedAt: now,
  },
  {
    id: 'result-007',
    parameterId: 'param-003',
    interfaceName: '标准接口A',
    resultData: {
      snr: 45.8,
      cnr: 18.2,
      tissueContrast: 0.68,
      scanTime: 300,
      artifactProbability: 0.18,
      recommended: true,
      qualityScore: 70,
    },
    confidence: 0.80,
    calculatedAt: now,
  },
  {
    id: 'result-008',
    parameterId: 'param-003',
    interfaceName: '优化接口B',
    resultData: {
      snr: 48.5,
      cnr: 19.8,
      tissueContrast: 0.70,
      scanTime: 280,
      artifactProbability: 0.15,
      recommended: true,
      qualityScore: 72,
    },
    confidence: 0.78,
    calculatedAt: now,
  },
  {
    id: 'result-009',
    parameterId: 'param-003',
    interfaceName: '快速接口C',
    resultData: {
      snr: 38.2,
      cnr: 14.5,
      tissueContrast: 0.58,
      scanTime: 240,
      artifactProbability: 0.28,
      recommended: false,
      qualityScore: 55,
    },
    confidence: 0.65,
    calculatedAt: now,
  },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 'anomaly-001',
    parameterId: 'param-002',
    type: 'conflict',
    severity: 'high',
    description: '接口A与接口C的推荐结果存在严重分歧：接口A不推荐，接口B推荐',
    status: 'pending',
    affectedInterfaces: ['标准接口A', '优化接口B'],
    createdAt: now,
  },
  {
    id: 'anomaly-002',
    parameterId: 'param-002',
    type: 'artifact_misjudgment',
    severity: 'medium',
    description: '伪影类型判断不一致：接口A检测为运动伪影概率25%，接口B为22%，但临床观察存在差异',
    status: 'pending',
    affectedInterfaces: ['标准接口A', '优化接口B', '快速接口C'],
    createdAt: now,
  },
  {
    id: 'anomaly-003',
    parameterId: 'param-005',
    type: 'timeout',
    severity: 'high',
    description: '扫描时间超限：预计扫描时间360秒，超出建议最大时长300秒',
    status: 'confirmed',
    affectedInterfaces: ['标准接口A'],
    createdAt: now,
  },
  {
    id: 'anomaly-004',
    parameterId: 'param-005',
    type: 'conflict',
    severity: 'medium',
    description: 'TE参数超出组织类型建议范围：灰质T2WI建议TE范围60-100ms，当前120ms',
    status: 'pending',
    affectedInterfaces: ['标准接口A', '优化接口B'],
    createdAt: now,
  },
];

export const mockVersionHistories: VersionHistory[] = [
  {
    id: 'version-001',
    parameterId: 'param-001',
    version: 2,
    beforeData: {
      tissueType: 'gray_matter' as TissueType,
    },
    afterData: {
      tissueType: 'white_matter' as TissueType,
    },
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
    beforeData: {
      artifactLabel: 'none' as ArtifactType,
    },
    afterData: {
      artifactLabel: 'motion' as ArtifactType,
    },
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
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

  const baseSnr = 80 + Math.random() * 60;
  const baseCnr = 30 + Math.random() * 30;
  const baseContrast = 0.6 + Math.random() * 0.3;
  const baseTime = 120 + Math.random() * 200;
  const artifactProb = 0.05 + Math.random() * 0.3;

  return {
    id: generateId(),
    parameterId: parameter.id,
    interfaceName,
    resultData: {
      snr: Math.round(baseSnr * 10) / 10,
      cnr: Math.round(baseCnr * 10) / 10,
      tissueContrast: Math.round(baseContrast * 100) / 100,
      scanTime: Math.round(baseTime),
      artifactProbability: Math.round(artifactProb * 100) / 100,
      recommended: artifactProb < 0.25,
      qualityScore: Math.round((1 - artifactProb) * 100),
    },
    confidence: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
    calculatedAt: new Date().toISOString(),
  };
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
      description: `接口推荐结果存在分歧：${recommendedResults.length}个接口推荐，${notRecommendedResults.length}个接口不推荐`,
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
  const avgArtifactProb = artifactProbs.reduce((a, b) => a + b, 0) / artifactProbs.length;
  const maxDiff = Math.max(...artifactProbs) - Math.min(...artifactProbs);

  if (maxDiff > 0.2) {
    anomalies.push({
      id: generateId(),
      parameterId: parameter.id,
      type: 'artifact_misjudgment',
      severity: maxDiff > 0.3 ? 'high' : 'medium',
      description: `伪影判断不一致：各接口伪影概率差异${Math.round(maxDiff * 100)}%，平均概率${Math.round(avgArtifactProb * 100)}%`,
      status: 'pending',
      affectedInterfaces: results.map((r) => r.interfaceName),
      createdAt: new Date().toISOString(),
    });
  }

  return anomalies;
};

export { generateId };
