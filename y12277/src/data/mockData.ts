import {
  Institution,
  Indicator,
  RiskScore,
  RiskReport,
  RegionCoord,
  Anomaly,
  IndicatorDimension
} from '../types';

const MONTHS = [
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'
];

export const mockInstitutions: Institution[] = [
  { id: 'inst-001', name: '华夏银行', type: 'bank', region: '华东', coordinateX: -8, coordinateZ: -6 },
  { id: 'inst-002', name: '招商证券', type: 'securities', region: '华南', coordinateX: 6, coordinateZ: -8 },
  { id: 'inst-003', name: '平安保险', type: 'insurance', region: '华南', coordinateX: 8, coordinateZ: 4 },
  { id: 'inst-004', name: '中信信托', type: 'trust', region: '华北', coordinateX: -6, coordinateZ: 8 },
  { id: 'inst-005', name: '工商银行', type: 'bank', region: '华北', coordinateX: 0, coordinateZ: -10 },
  { id: 'inst-006', name: '国泰君安', type: 'securities', region: '华东', coordinateX: 10, coordinateZ: 0 },
  { id: 'inst-007', name: '中国人寿', type: 'insurance', region: '华北', coordinateX: -10, coordinateZ: 0 },
  { id: 'inst-008', name: '华润信托', type: 'trust', region: '华南', coordinateX: 0, coordinateZ: 10 },
  { id: 'inst-009', name: '建设银行', type: 'bank', region: '华东', coordinateX: -4, coordinateZ: -4 },
  { id: 'inst-010', name: '海通证券', type: 'securities', region: '华东', coordinateX: 4, coordinateZ: -4 },
  { id: 'inst-011', name: '太平洋保险', type: 'insurance', region: '华东', coordinateX: 4, coordinateZ: 4 },
  { id: 'inst-012', name: '英大信托', type: 'trust', region: '华北', coordinateX: -4, coordinateZ: 4 }
];

const indicatorNames: Record<IndicatorDimension, string[]> = {
  capital: ['资本充足率', '一级资本充足率', '核心一级资本充足率', '杠杆率'],
  liquidity: ['流动性比例', '流动性覆盖率', '净稳定资金比例', '存贷比'],
  credit: ['不良贷款率', '拨备覆盖率', '贷款拨备率', '关注类贷款占比'],
  market: ['利率风险敏感度', '汇率风险敏感度', '股票风险敏感度', '商品风险敏感度'],
  operational: ['操作风险损失率', '案件发生率', '信息科技风险暴露', '内控评价得分']
};

const materials = [
  '《2025年度监管报表》',
  '《月度风险监测报告》',
  '《资本充足率计量表》',
  '《流动性风险分析报告》',
  '《信用风险分类台账》',
  '《市场风险敞口报告》',
  '《操作风险事件台账》',
  '《内部审计报告》',
  '《外部审计报告》',
  '《现场检查意见书》'
];

function generateIndicators(): Indicator[] {
  const indicators: Indicator[] = [];
  let id = 1;

  mockInstitutions.forEach(inst => {
    (Object.keys(indicatorNames) as IndicatorDimension[]).forEach(dim => {
      indicatorNames[dim].forEach(name => {
        MONTHS.forEach((month, monthIdx) => {
          const isMissing = 
            (inst.id === 'inst-001' && month === '2025-03' && name === '资本充足率') ||
            (inst.id === 'inst-005' && month === '2025-06' && name === '不良贷款率') ||
            (inst.id === 'inst-007' && month === '2025-09' && name === '流动性比例') ||
            (inst.id === 'inst-012' && month === '2025-11' && name === '操作风险损失率');

          const baseValue = 
            dim === 'capital' ? 12 + Math.random() * 6 :
            dim === 'liquidity' ? 30 + Math.random() * 40 :
            dim === 'credit' ? 1 + Math.random() * 4 :
            dim === 'market' ? 5 + Math.random() * 15 :
            60 + Math.random() * 35;

          indicators.push({
            id: `ind-${id.toString().padStart(5, '0')}`,
            institutionId: inst.id,
            name,
            value: Math.round(baseValue * 100) / 100,
            month,
            sourceMaterial: materials[Math.floor(Math.random() * materials.length)],
            isMissing,
            missingMonth: isMissing ? month : undefined,
            missingMaterial: isMissing ? materials[Math.floor(Math.random() * materials.length)] : undefined,
            dimension: dim
          });
          id++;
        });
      });
    });
  });

  return indicators;
}

function generateRiskScores(): RiskScore[] {
  const scores: RiskScore[] = [];
  let id = 1;

  mockInstitutions.forEach(inst => {
    MONTHS.forEach(month => {
      const isHighRisk = inst.id === 'inst-001' || inst.id === 'inst-005' || inst.id === 'inst-007';
      const baseScore = isHighRisk ? 70 + Math.random() * 25 : 20 + Math.random() * 45;
      const isAnomaly = 
        (inst.id === 'inst-005' && month === '2025-08') ||
        (inst.id === 'inst-006' && month === '2025-04') ||
        (inst.id === 'inst-010' && month === '2025-10');

      const score = isAnomaly ? 95 + Math.random() * 5 : baseScore;
      const level = score < 40 ? 'low' : score < 70 ? 'medium' : 'high';

      scores.push({
        id: `score-${id.toString().padStart(5, '0')}`,
        institutionId: inst.id,
        score: Math.round(score * 10) / 10,
        level,
        month,
        reportId: `report-${inst.id}-${month}`,
        isAnomaly,
        expectedMin: isHighRisk ? 50 : 15,
        expectedMax: isHighRisk ? 85 : 65
      });
      id++;
    });
  });

  return scores;
}

function generateRiskReports(): RiskReport[] {
  const reports: RiskReport[] = [];

  mockInstitutions.forEach(inst => {
    MONTHS.forEach(month => {
      reports.push({
        id: `report-${inst.id}-${month}`,
        institutionId: inst.id,
        title: `${inst.name}${month}月度风险评估报告`,
        content: `本报告基于${materials[Math.floor(Math.random() * materials.length)]}编制，对${inst.name}在${month}的各项风险指标进行了全面评估。报告涵盖资本充足性、流动性、信用风险、市场风险和操作风险五个维度，综合得分反映了机构当前的风险状况。`,
        month,
        author: ['张明', '李华', '王芳', '刘伟', '陈静'][Math.floor(Math.random() * 5)],
        exportRecords: []
      });
    });
  });

  return reports;
}

function generateRegionCoords(): RegionCoord[] {
  return mockInstitutions.map((inst, idx) => {
    const overlappingWith: string[] = [];
    
    if (inst.id === 'inst-001') overlappingWith.push('inst-009');
    if (inst.id === 'inst-009') overlappingWith.push('inst-001');
    if (inst.id === 'inst-002') overlappingWith.push('inst-010');
    if (inst.id === 'inst-010') overlappingWith.push('inst-002');
    if (inst.id === 'inst-011') overlappingWith.push('inst-003');
    if (inst.id === 'inst-003') overlappingWith.push('inst-011');

    return {
      id: `coord-${inst.id}`,
      institutionId: inst.id,
      centerX: inst.coordinateX,
      centerZ: inst.coordinateZ,
      radius: 2.5 + Math.random() * 1.5,
      overlappingWith,
      sourceMaterial: materials[(idx + 3) % materials.length]
    };
  });
}

function generateAnomalies(): Anomaly[] {
  return [
    {
      id: 'anom-001',
      institutionId: 'inst-001',
      type: 'missing_month',
      description: '华夏银行2025年03月资本充足率数据缺失，对应材料《2025年度监管报表》未提供该月数据',
      month: '2025-03',
      material: '《2025年度监管报表》',
      relatedObject: '华夏银行-资本充足率指标',
      resolved: false
    },
    {
      id: 'anom-002',
      institutionId: 'inst-005',
      type: 'missing_month',
      description: '工商银行2025年06月不良贷款率数据缺失，对应材料《信用风险分类台账》缺6月记录',
      month: '2025-06',
      material: '《信用风险分类台账》',
      relatedObject: '工商银行-不良贷款率指标',
      resolved: false
    },
    {
      id: 'anom-003',
      institutionId: 'inst-007',
      type: 'missing_month',
      description: '中国人寿2025年09月流动性比例数据缺失，对应材料《流动性风险分析报告》9月版未报送',
      month: '2025-09',
      material: '《流动性风险分析报告》',
      relatedObject: '中国人寿-流动性比例指标',
      resolved: false
    },
    {
      id: 'anom-004',
      institutionId: 'inst-001',
      type: 'region_overlap',
      description: '华夏银行与建设银行在华东区域坐标重叠，重叠区域中心(-6, -5)，半径约2.0，涉及《区域风险分布图》',
      month: '2025-12',
      material: '《区域风险分布图》',
      relatedObject: '华夏银行↔建设银行 区域坐标',
      resolved: false
    },
    {
      id: 'anom-005',
      institutionId: 'inst-002',
      type: 'region_overlap',
      description: '招商证券与海通证券在华东区域坐标重叠，重叠区域中心(5, -4)，半径约1.8，涉及《机构空间布局图》',
      month: '2025-12',
      material: '《机构空间布局图》',
      relatedObject: '招商证券↔海通证券 区域坐标',
      resolved: false
    },
    {
      id: 'anom-006',
      institutionId: 'inst-003',
      type: 'region_overlap',
      description: '平安保险与太平洋保险在华南区域坐标重叠，重叠区域中心(6, 4)，半径约2.2，涉及《区域风险分布图》',
      month: '2025-12',
      material: '《区域风险分布图》',
      relatedObject: '平安保险↔太平洋保险 区域坐标',
      resolved: false
    },
    {
      id: 'anom-007',
      institutionId: 'inst-005',
      type: 'score_anomaly',
      description: '工商银行2025年08月风险得分95.2，超出预期范围[50, 85]，对应报告report-inst-005-2025-08',
      month: '2025-08',
      material: '《工商银行2025-08月度风险评估报告》',
      relatedObject: '工商银行-2025-08综合风险得分',
      resolved: false
    },
    {
      id: 'anom-008',
      institutionId: 'inst-006',
      type: 'score_anomaly',
      description: '国泰君安2025年04月风险得分97.8，超出预期范围[15, 65]，对应报告report-inst-006-2025-04',
      month: '2025-04',
      material: '《国泰君安2025-04月度风险评估报告》',
      relatedObject: '国泰君安-2025-04综合风险得分',
      resolved: false
    },
    {
      id: 'anom-009',
      institutionId: 'inst-010',
      type: 'score_anomaly',
      description: '海通证券2025年10月风险得分96.5，超出预期范围[15, 65]，对应报告report-inst-010-2025-10',
      month: '2025-10',
      material: '《海通证券2025-10月度风险评估报告》',
      relatedObject: '海通证券-2025-10综合风险得分',
      resolved: false
    },
    {
      id: 'anom-010',
      institutionId: 'inst-012',
      type: 'missing_month',
      description: '英大信托2025年11月操作风险损失率数据缺失，对应材料《操作风险事件台账》缺11月记录',
      month: '2025-11',
      material: '《操作风险事件台账》',
      relatedObject: '英大信托-操作风险损失率指标',
      resolved: false
    }
  ];
}

export const mockIndicators = generateIndicators();
export const mockRiskScores = generateRiskScores();
export const mockRiskReports = generateRiskReports();
export const mockRegionCoords = generateRegionCoords();
export const mockAnomalies = generateAnomalies();

export const getInitialMonth = () => MONTHS[MONTHS.length - 1];
export const getAllMonths = () => [...MONTHS];
