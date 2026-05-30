import { Institution, RiskScore, Anomaly, TimeFrame, getScoreLevel, InstitutionType } from '../types';

const regionCoordinates: Record<string, { x: number; z: number }> = {
  '华北': { x: 0, z: -3 },
  '华东': { x: 3, z: 0 },
  '华南': { x: 0, z: 3 },
  '华中': { x: -2, z: 0 },
  '西南': { x: -3, z: 2 },
  '西北': { x: -3, z: -2 },
  '东北': { x: 2, z: -3 },
};

const institutionNames: Record<InstitutionType, string[]> = {
  bank: ['工商银行', '建设银行', '农业银行', '中国银行', '招商银行', '浦发银行', '兴业银行'],
  insurance: ['平安保险', '中国人寿', '太平洋保险', '泰康保险', '新华保险'],
  securities: ['中信证券', '华泰证券', '国泰君安', '海通证券', '广发证券'],
  fund: ['南方基金', '华夏基金', '嘉实基金', '易方达', '博时基金'],
  trust: ['中信信托', '平安信托', '中融信托', '华润信托', '江苏信托'],
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateMockInstitutions = (): Institution[] => {
  const institutions: Institution[] = [];
  const types: InstitutionType[] = ['bank', 'insurance', 'securities', 'fund', 'trust'];
  const regions = Object.keys(regionCoordinates);

  types.forEach((type) => {
    const names = institutionNames[type];
    names.forEach((name, index) => {
      const region = getRandomItem(regions);
      const baseCoord = regionCoordinates[region];
      const offsetX = (Math.random() - 0.5) * 1.5;
      const offsetZ = (Math.random() - 0.5) * 1.5;

      institutions.push({
        id: generateId(),
        name,
        type,
        region,
        x: baseCoord.x + offsetX,
        z: baseCoord.z + offsetZ,
      });
    });
  });

  institutions[5].x = institutions[0].x + 0.1;
  institutions[5].z = institutions[0].z + 0.1;

  institutions[10].x = institutions[6].x + 0.08;
  institutions[10].z = institutions[6].z + 0.08;

  return institutions;
};

export const generateMockRiskScores = (institutions: Institution[], batch: 1 | 2): RiskScore[] => {
  const timeFrames = generateTimeFrames();
  const scores: RiskScore[] = [];

  institutions.forEach((institution, idx) => {
    timeFrames.forEach((timeFrame) => {
      let baseScore: number;

      if (idx === 15) {
        baseScore = -1;
      } else if (idx === 20) {
        baseScore = batch === 1 ? 15 : 85;
      } else if (idx === 8) {
        const timeIndex = timeFrames.findIndex((t) => t.timestamp === timeFrame.timestamp);
        baseScore = timeIndex < 3 ? 25 : 78;
      } else {
        baseScore = 20 + Math.random() * 60;
      }

      const score = Math.min(100, Math.max(0, baseScore + (Math.random() - 0.5) * 10));

      scores.push({
        id: generateId(),
        institutionId: institution.id,
        score: Math.round(score * 10) / 10,
        level: getScoreLevel(score),
        timestamp: timeFrame.timestamp,
        batch,
      });
    });
  });

  return scores;
};

export const generateTimeFrames = (): TimeFrame[] => {
  const frames: TimeFrame[] = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < 6; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + i);
    frames.push({
      timestamp: date.toISOString().split('T')[0],
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
    });
  }

  return frames;
};

export const generateMockAnomalies = (institutions: Institution[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  anomalies.push({
    id: generateId(),
    type: 'missing_metric',
    institutionId: institutions[15].id,
    description: '机构风险得分数据缺失，无法计算风险等级',
    severity: 'error',
  });

  anomalies.push({
    id: generateId(),
    type: 'region_overlap',
    institutionId: institutions[0].id,
    description: `与 ${institutions[5].name} 区域重叠，坐标距离小于阈值`,
    severity: 'warning',
    relatedInstitutions: [institutions[5].id],
  });

  anomalies.push({
    id: generateId(),
    type: 'region_overlap',
    institutionId: institutions[5].id,
    description: `与 ${institutions[0].name} 区域重叠，坐标距离小于阈值`,
    severity: 'warning',
    relatedInstitutions: [institutions[0].id],
  });

  anomalies.push({
    id: generateId(),
    type: 'region_overlap',
    institutionId: institutions[6].id,
    description: `与 ${institutions[10].name} 区域重叠，坐标距离小于阈值`,
    severity: 'warning',
    relatedInstitutions: [institutions[10].id],
  });

  anomalies.push({
    id: generateId(),
    type: 'score_abnormal',
    institutionId: institutions[20].id,
    description: '风险得分在批次间突变超过60分，超出正常波动范围',
    severity: 'error',
  });

  anomalies.push({
    id: generateId(),
    type: 'score_abnormal',
    institutionId: institutions[8].id,
    description: '风险得分在时间序列中突变超过50分，需人工复核',
    severity: 'error',
  });

  return anomalies;
};

export const addIndustryTags = (institutions: Institution[]): Institution[] => {
  const industries = ['制造业', '房地产', '金融服务', '科技', '能源', '消费', '医疗', '交通运输'];

  return institutions.map((inst) => ({
    ...inst,
    industry: getRandomItem(industries),
  }));
};
