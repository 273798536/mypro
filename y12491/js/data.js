export const SECTORS = {
  COAL: '煤炭',
  MANUFACTURING: '制造',
  TECH: '科技',
  FINANCE: '金融',
  STEEL: '钢铁',
  BUILDING: '建材',
};

export const RATING_SCALE = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC', 'CC', 'C', 'D'];

export const RISK_LEVELS = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

export const DATA_SOURCE = { ORIGINAL: 'original', RETROACTIVE: 'retroactive' };

function ratingToNumber(r) {
  const i = RATING_SCALE.indexOf(r);
  return i === -1 ? RATING_SCALE.length : i;
}

export function isRetroactive(change) {
  if (!change.recordDate || !change.changeDate) return false;
  return new Date(change.recordDate) - new Date(change.changeDate) > 30 * 86400000;
}

export const issuers = [
  { id: 'I01', name: '华晨汽车集团', sector: SECTORS.MANUFACTURING, rating: 'BBB', ratingSource: DATA_SOURCE.RETROACTIVE, defaultStatus: true, defaultDate: '2020-10-23', holdingScale: 2800000, bonds: [
    { id: 'B0101', name: '17华晨01', amount: 100000, maturityDate: '2021-03-01' },
    { id: 'B0102', name: '18华晨02', amount: 80000, maturityDate: '2022-06-15' },
    { id: 'B0103', name: '19华晨MTN001', amount: 100000, maturityDate: '2022-09-20' },
  ]},
  { id: 'I02', name: '永城煤电控股集团', sector: SECTORS.COAL, rating: 'BB', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: true, defaultDate: '2020-11-10', holdingScale: 3400000, bonds: [
    { id: 'B0201', name: '20永煤SCP001', amount: 100000, maturityDate: '2021-03-15' },
    { id: 'B0202', name: '20永煤SCP002', amount: 100000, maturityDate: '2021-06-10' },
    { id: 'B0203', name: '19永煤MTN001', amount: 150000, maturityDate: '2022-11-10' },
  ]},
  { id: 'I03', name: '紫光集团', sector: SECTORS.TECH, rating: 'A-', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: true, defaultDate: '2020-11-16', holdingScale: 2100000, bonds: [
    { id: 'B0301', name: '18紫光04', amount: 100000, maturityDate: '2021-10-31' },
    { id: 'B0302', name: '19紫光01', amount: 80000, maturityDate: '2022-04-30' },
  ]},
  { id: 'I04', name: '清华控股', sector: SECTORS.TECH, rating: 'AAA', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 4500000, bonds: [
    { id: 'B0401', name: '16清控02', amount: 200000, maturityDate: '2023-04-20' },
    { id: 'B0402', name: '18清控MTN001', amount: 150000, maturityDate: '2023-09-15' },
  ]},
  { id: 'I05', name: '冀中能源集团', sector: SECTORS.COAL, rating: 'AA', ratingSource: DATA_SOURCE.RETROACTIVE, defaultStatus: false, defaultDate: null, holdingScale: 5200000, bonds: [
    { id: 'B0501', name: '19冀中01', amount: 200000, maturityDate: '2022-08-01' },
    { id: 'B0502', name: '20冀中02', amount: 180000, maturityDate: '2023-02-15' },
  ]},
  { id: 'I06', name: '郑煤集团', sector: SECTORS.COAL, rating: 'AA-', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 1800000, bonds: [
    { id: 'B0601', name: '15郑煤MTN001', amount: 100000, maturityDate: '2022-05-10' },
  ]},
  { id: 'I07', name: '平煤股份', sector: SECTORS.COAL, rating: 'AA-', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 1500000, bonds: [
    { id: 'B0701', name: '18平煤01', amount: 80000, maturityDate: '2023-01-20' },
  ]},
  { id: 'I08', name: '河南能源化工集团', sector: SECTORS.COAL, rating: 'AA', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 3800000, bonds: [
    { id: 'B0801', name: '18豫能化MTN001', amount: 200000, maturityDate: '2023-06-15' },
    { id: 'B0802', name: '19豫能化MTN002', amount: 150000, maturityDate: '2024-03-10' },
  ]},
  { id: 'I09', name: '包商银行', sector: SECTORS.FINANCE, rating: 'D', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: true, defaultDate: '2019-05-24', holdingScale: 2200000, bonds: [
    { id: 'B0901', name: '15包商银行二级', amount: 60000, maturityDate: '2025-12-01' },
  ]},
  { id: 'I10', name: '盛京银行', sector: SECTORS.FINANCE, rating: 'AA', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 8900000, bonds: [
    { id: 'B1001', name: '18盛京银行二级01', amount: 100000, maturityDate: '2028-06-15' },
    { id: 'B1002', name: '19盛京银行小微债01', amount: 80000, maturityDate: '2024-09-20' },
  ]},
  { id: 'I11', name: '华阳集团', sector: SECTORS.MANUFACTURING, rating: 'AA-', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 1200000, bonds: [
    { id: 'B1101', name: '18华阳01', amount: 60000, maturityDate: '2023-04-10' },
  ]},
  { id: 'I12', name: '太原重工', sector: SECTORS.MANUFACTURING, rating: 'A+', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 950000, bonds: [
    { id: 'B1201', name: '12太重01', amount: 50000, maturityDate: '2022-12-01' },
  ]},
  { id: 'I13', name: '首钢集团', sector: SECTORS.STEEL, rating: 'AAA', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 6800000, bonds: [
    { id: 'B1301', name: '19首钢MTN001', amount: 300000, maturityDate: '2024-06-15' },
  ]},
  { id: 'I14', name: '河钢集团', sector: SECTORS.STEEL, rating: 'AA+', ratingSource: DATA_SOURCE.ORIGINAL, defaultStatus: false, defaultDate: null, holdingScale: 7200000, bonds: [
    { id: 'B1401', name: '18河钢MTN002', amount: 250000, maturityDate: '2023-09-20' },
  ]},
  { id: 'I15', name: '山水水泥', sector: SECTORS.BUILDING, rating: 'BBB', ratingSource: DATA_SOURCE.RETROACTIVE, defaultStatus: true, defaultDate: '2019-11-05', holdingScale: 600000, bonds: [
    { id: 'B1501', name: '14山水MTN001', amount: 40000, maturityDate: '2021-07-10' },
  ]},
];

export const guarantees = [
  { id: 'G01', guarantorId: 'I04', guaranteedId: 'I03', amount: 500000, guaranteeType: '连带责任', date: '2018-06-01', isDuplicate: false, duplicateSource: null },
  { id: 'G02', guarantorId: 'I02', guaranteedId: 'I08', amount: 800000, guaranteeType: '连带责任', date: '2019-03-15', isDuplicate: false, duplicateSource: null },
  { id: 'G03', guarantorId: 'I05', guaranteedId: 'I02', amount: 300000, guaranteeType: '一般保证', date: '2019-07-20', isDuplicate: true, duplicateSource: DATA_SOURCE.ORIGINAL, duplicateGroupId: 'DG01' },
  { id: 'G04', guarantorId: 'I05', guaranteedId: 'I02', amount: 300000, guaranteeType: '一般保证', date: '2019-07-20', isDuplicate: true, duplicateSource: DATA_SOURCE.ORIGINAL, duplicateGroupId: 'DG01' },
  { id: 'G05', guarantorId: 'I06', guaranteedId: 'I05', amount: 200000, guaranteeType: '连带责任', date: '2018-11-10', isDuplicate: false, duplicateSource: null },
  { id: 'G06', guarantorId: 'I07', guaranteedId: 'I06', amount: 150000, guaranteeType: '连带责任', date: '2019-01-05', isDuplicate: false, duplicateSource: null },
  { id: 'G07', guarantorId: 'I11', guaranteedId: 'I12', amount: 100000, guaranteeType: '一般保证', date: '2019-05-18', isDuplicate: false, duplicateSource: null },
  { id: 'G08', guarantorId: 'I13', guaranteedId: 'I14', amount: 400000, guaranteeType: '连带责任', date: '2018-09-01', isDuplicate: false, duplicateSource: null },
  { id: 'G09', guarantorId: 'I09', guaranteedId: 'I10', amount: 250000, guaranteeType: '一般保证', date: '2018-04-20', isDuplicate: false, duplicateSource: null },
  { id: 'G10', guarantorId: 'I01', guaranteedId: 'I11', amount: 180000, guaranteeType: '连带责任', date: '2019-08-12', isDuplicate: false, duplicateSource: null },
  { id: 'G11', guarantorId: 'I04', guaranteedId: 'I01', amount: 350000, guaranteeType: '连带责任', date: '2018-03-10', isDuplicate: false, duplicateSource: null },
  { id: 'G12', guarantorId: 'I05', guaranteedId: 'I07', amount: 220000, guaranteeType: '一般保证', date: '2019-09-25', isDuplicate: false, duplicateSource: null },
  { id: 'G13', guarantorId: 'I15', guaranteedId: 'I11', amount: 80000, guaranteeType: '一般保证', date: '2018-12-01', isDuplicate: true, duplicateSource: DATA_SOURCE.ORIGINAL, duplicateGroupId: 'DG02' },
  { id: 'G14', guarantorId: 'I15', guaranteedId: 'I11', amount: 80000, guaranteeType: '一般保证', date: '2018-12-01', isDuplicate: true, duplicateSource: DATA_SOURCE.ORIGINAL, duplicateGroupId: 'DG02' },
  { id: 'G15', guarantorId: 'I01', guaranteedId: 'I12', amount: 120000, guaranteeType: '一般保证', date: '2019-10-08', isDuplicate: false, duplicateSource: null },
];

export const ratingChanges = [
  { id: 'RC01', issuerId: 'I01', oldRating: 'AA', newRating: 'A', changeDate: '2020-08-15', recordDate: '2020-11-20', affectedDetails: ['B0101', 'B0102', 'B0103'] },
  { id: 'RC02', issuerId: 'I01', oldRating: 'A', newRating: 'BBB', changeDate: '2020-10-23', recordDate: '2020-12-15', affectedDetails: ['B0101', 'B0102', 'B0103'] },
  { id: 'RC03', issuerId: 'I02', oldRating: 'AAA', newRating: 'AA+', changeDate: '2020-09-30', recordDate: '2020-09-30', affectedDetails: ['B0201', 'B0202', 'B0203'] },
  { id: 'RC04', issuerId: 'I02', oldRating: 'AA+', newRating: 'BB', changeDate: '2020-11-10', recordDate: '2020-11-10', affectedDetails: ['B0201', 'B0202', 'B0203'] },
  { id: 'RC05', issuerId: 'I03', oldRating: 'AA', newRating: 'A', changeDate: '2020-10-16', recordDate: '2020-10-16', affectedDetails: ['B0301', 'B0302'] },
  { id: 'RC06', issuerId: 'I05', oldRating: 'AA+', newRating: 'AA', changeDate: '2020-12-01', recordDate: '2021-03-15', affectedDetails: ['B0501', 'B0502'] },
  { id: 'RC07', issuerId: 'I10', oldRating: 'AA+', newRating: 'AA', changeDate: '2019-07-15', recordDate: '2019-07-15', affectedDetails: ['B1001', 'B1002'] },
  { id: 'RC08', issuerId: 'I15', oldRating: 'AA', newRating: 'BBB', changeDate: '2019-10-01', recordDate: '2020-02-01', affectedDetails: ['B1501'] },
];

export const contagionPaths = [
  { id: 'CP01', sourceId: 'I01', targetId: 'I04', path: ['I01', 'I04'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.HIGH, triggerDate: '2020-10-23' },
  { id: 'CP02', sourceId: 'I04', targetId: 'I03', path: ['I01', 'I04', 'I03'], pathType: 'indirect', riskLevel: RISK_LEVELS.MEDIUM, triggerDate: '2020-10-23' },
  { id: 'CP03', sourceId: 'I02', targetId: 'I05', path: ['I02', 'I05'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.HIGH, triggerDate: '2020-11-10' },
  { id: 'CP04', sourceId: 'I05', targetId: 'I06', path: ['I02', 'I05', 'I06'], pathType: 'indirect', riskLevel: RISK_LEVELS.MEDIUM, triggerDate: '2020-11-10' },
  { id: 'CP05', sourceId: 'I06', targetId: 'I07', path: ['I02', 'I05', 'I06', 'I07'], pathType: 'indirect', riskLevel: RISK_LEVELS.LOW, triggerDate: '2020-11-10' },
  { id: 'CP06', sourceId: 'I02', targetId: 'I08', path: ['I02', 'I08'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.HIGH, triggerDate: '2020-11-10' },
  { id: 'CP07', sourceId: 'I09', targetId: 'I10', path: ['I09', 'I10'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.MEDIUM, triggerDate: '2019-05-24' },
  { id: 'CP08', sourceId: 'I01', targetId: 'I11', path: ['I01', 'I11'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.HIGH, triggerDate: '2020-10-23' },
  { id: 'CP09', sourceId: 'I11', targetId: 'I12', path: ['I01', 'I11', 'I12'], pathType: 'indirect', riskLevel: RISK_LEVELS.LOW, triggerDate: '2020-10-23' },
  { id: 'CP10', sourceId: 'I15', targetId: 'I11', path: ['I15', 'I11'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.MEDIUM, triggerDate: '2019-11-05' },
  { id: 'CP11', sourceId: 'I05', targetId: 'I07', path: ['I02', 'I05', 'I07'], pathType: 'indirect', riskLevel: RISK_LEVELS.LOW, triggerDate: '2020-11-10' },
  { id: 'CP12', sourceId: 'I01', targetId: 'I12', path: ['I01', 'I12'], pathType: 'direct_guarantee', riskLevel: RISK_LEVELS.MEDIUM, triggerDate: '2020-10-23' },
];

export function detectDuplicateGuarantees(gs = guarantees) {
  const groups = {};
  gs.forEach(g => {
    if (g.duplicateGroupId) {
      if (!groups[g.duplicateGroupId]) groups[g.duplicateGroupId] = [];
      groups[g.duplicateGroupId].push(g);
    }
  });
  return Object.entries(groups).map(([groupId, items]) => {
    const first = items[0];
    const guarantor = issuers.find(i => i.id === first.guarantorId);
    const guaranteed = issuers.find(i => i.id === first.guaranteedId);
    return {
      groupId,
      count: items.length,
      amount: first.amount,
      guarantorName: guarantor?.name || first.guarantorId,
      guaranteedName: guaranteed?.name || first.guaranteedId,
      source: first.duplicateSource,
      items,
    };
  });
}

export function getRetroactiveRatingChanges(rcs = ratingChanges) {
  return rcs.filter(c => isRetroactive(c)).map(c => {
    const issuer = issuers.find(i => i.id === c.issuerId);
    return {
      ...c,
      issuerName: issuer?.name || c.issuerId,
      lagDays: Math.round((new Date(c.recordDate) - new Date(c.changeDate)) / 86400000),
    };
  });
}

export function getAffectedDetailsForRatingChange(changeId) {
  const change = ratingChanges.find(c => c.id === changeId);
  if (!change) return [];
  const issuer = issuers.find(i => i.id === change.issuerId);
  if (!issuer) return [];
  return (change.affectedDetails || []).map(bondId => {
    const bond = issuer.bonds.find(b => b.id === bondId);
    return {
      bondId,
      bondName: bond?.name || bondId,
      amount: bond?.amount || 0,
      maturityDate: bond?.maturityDate || '',
      retroactive: isRetroactive(change),
    };
  });
}

export function getContagionPathsForIssuer(issuerId, cps = contagionPaths) {
  return cps.filter(p => p.sourceId === issuerId || p.targetId === issuerId || p.path.includes(issuerId));
}

export function getGuaranteesForIssuer(issuerId, gs = guarantees) {
  return gs.filter(g => g.guarantorId === issuerId || g.guaranteedId === issuerId);
}

export function filterDataByDate(dateStr) {
  const date = new Date(dateStr);
  const activeIssuers = issuers.filter(i => {
    if (!i.defaultDate) return true;
    return new Date(i.defaultDate) <= date;
  }).map(i => {
    if (i.defaultDate && new Date(i.defaultDate) <= date) {
      return { ...i, defaultStatus: true };
    }
    return { ...i, defaultStatus: false };
  });

  const activeGuarantees = guarantees.filter(g => new Date(g.date) <= date);
  const activeRatingChanges = ratingChanges.filter(c => new Date(c.recordDate) <= date);
  const activePaths = contagionPaths.filter(p => new Date(p.triggerDate) <= date);

  return { issuers: activeIssuers, guarantees: activeGuarantees, ratingChanges: activeRatingChanges, contagionPaths: activePaths };
}

export function computeRiskLevels(currentIssuers, currentPaths) {
  const riskMap = {};
  currentIssuers.forEach(i => { riskMap[i.id] = RISK_LEVELS.LOW; });
  if (currentIssuers.find(i => i.defaultStatus)) {
    currentIssuers.forEach(i => {
      if (i.defaultStatus) riskMap[i.id] = RISK_LEVELS.HIGH;
    });
  }
  currentPaths.forEach(p => {
    if (riskMap[p.targetId] === RISK_LEVELS.LOW || (p.riskLevel === RISK_LEVELS.HIGH && riskMap[p.targetId] !== RISK_LEVELS.HIGH)) {
      riskMap[p.targetId] = p.riskLevel;
    }
  });
  const retroChanges = getRetroactiveRatingChanges(ratingChanges);
  retroChanges.forEach(c => {
    if (riskMap[c.issuerId] === RISK_LEVELS.LOW) {
      riskMap[c.issuerId] = RISK_LEVELS.MEDIUM;
    }
  });
  return riskMap;
}

export function getSummary() {
  const duplicates = detectDuplicateGuarantees();
  const retroChanges = getRetroactiveRatingChanges();
  const defaultCount = issuers.filter(i => i.defaultStatus).length;
  return {
    totalIssuers: issuers.length,
    defaultCount,
    totalGuarantees: guarantees.length,
    duplicateGuaranteeCount: duplicates.length,
    duplicateGuaranteeGroups: duplicates,
    retroactiveRatingCount: retroChanges.length,
    retroactiveRatingChanges: retroChanges,
    totalContagionPaths: contagionPaths.length,
  };
}
