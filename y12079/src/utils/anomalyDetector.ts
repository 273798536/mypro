import { Institution, RiskScore, Anomaly, RiskLevel, getScoreLevel } from '../types';

const OVERLAP_THRESHOLD = 0.2;
const SCORE_ABNORMAL_THRESHOLD = 50;
const SCORE_OUTLIER_THRESHOLD = 2;

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const detectMissingMetrics = (
  institutions: Institution[],
  riskScores: RiskScore[],
  timestamp: string
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  institutions.forEach((institution) => {
    const score = riskScores.find(
      (s) => s.institutionId === institution.id && s.timestamp === timestamp
    );

    if (!score || score.score < 0 || score.score > 100) {
      anomalies.push({
        id: generateId(),
        type: 'missing_metric',
        institutionId: institution.id,
        description: '机构风险得分数据缺失或超出有效范围(0-100)',
        severity: 'error',
      });
    }
  });

  return anomalies;
};

export const detectRegionOverlap = (institutions: Institution[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < institutions.length; i++) {
    for (let j = i + 1; j < institutions.length; j++) {
      const inst1 = institutions[i];
      const inst2 = institutions[j];

      const distance = Math.sqrt(
        Math.pow(inst1.x - inst2.x, 2) + Math.pow(inst1.z - inst2.z, 2)
      );

      if (distance < OVERLAP_THRESHOLD) {
        const pairKey = `${inst1.id}-${inst2.id}`;
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);

          anomalies.push({
            id: generateId(),
            type: 'region_overlap',
            institutionId: inst1.id,
            description: `与 ${inst2.name} 区域重叠，坐标距离小于阈值`,
            severity: 'warning',
            relatedInstitutions: [inst2.id],
          });

          anomalies.push({
            id: generateId(),
            type: 'region_overlap',
            institutionId: inst2.id,
            description: `与 ${inst1.name} 区域重叠，坐标距离小于阈值`,
            severity: 'warning',
            relatedInstitutions: [inst1.id],
          });
        }
      }
    }
  }

  return anomalies;
};

export const detectScoreAbnormal = (
  institutions: Institution[],
  riskScores: RiskScore[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  institutions.forEach((institution) => {
    const scores = riskScores
      .filter((s) => s.institutionId === institution.id)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (scores.length < 2) return;

    for (let i = 1; i < scores.length; i++) {
      const scoreChange = Math.abs(scores[i].score - scores[i - 1].score);
      if (scoreChange > SCORE_ABNORMAL_THRESHOLD) {
        anomalies.push({
          id: generateId(),
          type: 'score_abnormal',
          institutionId: institution.id,
          description: `风险得分在 ${scores[i - 1].timestamp} 至 ${scores[i].timestamp} 期间突变 ${scoreChange.toFixed(1)} 分`,
          severity: 'error',
        });
        break;
      }
    }
  });

  return anomalies;
};

export const detectAllAnomalies = (
  institutions: Institution[],
  riskScores: RiskScore[],
  currentTimestamp: string
): Anomaly[] => {
  const missingMetrics = detectMissingMetrics(institutions, riskScores, currentTimestamp);
  const regionOverlaps = detectRegionOverlap(institutions);
  const scoreAbnormals = detectScoreAbnormal(institutions, riskScores);

  return [...missingMetrics, ...regionOverlaps, ...scoreAbnormals];
};

export const getInstitutionAnomalies = (
  institutionId: string,
  anomalies: Anomaly[]
): Anomaly[] => {
  return anomalies.filter((a) => a.institutionId === institutionId);
};

export const hasAnomaly = (
  institutionId: string,
  anomalies: Anomaly[]
): boolean => {
  return anomalies.some((a) => a.institutionId === institutionId);
};
