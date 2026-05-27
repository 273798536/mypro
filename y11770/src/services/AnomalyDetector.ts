import type { MigrationRecord, AnomalyRecord, RatingLevel } from '../types';

export const detectLowSample = (records: MigrationRecord[], threshold = 5): AnomalyRecord[] => {
  const ratingCounts = records.reduce((acc, r) => {
    acc[r.fromRating] = (acc[r.fromRating] || 0) + 1;
    acc[r.toRating] = (acc[r.toRating] || 0) + 1;
    return acc;
  }, {} as Record<RatingLevel, number>);

  const lowSampleRatings = Object.entries(ratingCounts)
    .filter(([_, count]) => count < threshold)
    .map(([rating]) => rating as RatingLevel);

  if (lowSampleRatings.length === 0) return [];

  const affectedRecords = records.filter(r =>
    lowSampleRatings.includes(r.fromRating) || lowSampleRatings.includes(r.toRating)
  );

  return affectedRecords.map(record => ({
    id: `low-sample-${record.id}`,
    migrationId: record.id,
    type: 'LOW_SAMPLE' as const,
    severity: 'warning' as const,
    description: `涉及评级${lowSampleRatings.join('/')}样本量不足${threshold}，统计结果可能存在偏差`,
    isResolved: false,
  }));
};

export const detectDuplicateBalance = (records: MigrationRecord[]): AnomalyRecord[] => {
  const seen = new Map<string, MigrationRecord>();
  const duplicates: AnomalyRecord[] = [];

  records.forEach(record => {
    const key = `${record.customerId}-${record.month}-${record.balance}`;
    if (seen.has(key)) {
      duplicates.push({
        id: `dup-${record.id}`,
        migrationId: record.id,
        type: 'DUPLICATE_BALANCE' as const,
        severity: 'warning' as const,
        description: `同一客户同一月份存在余额重复记录`,
        isResolved: false,
      });
    } else {
      seen.set(key, record);
    }
  });

  return duplicates;
};

export const detectNegativeBalance = (records: MigrationRecord[]): AnomalyRecord[] => {
  return records
    .filter(r => r.balance < 0)
    .map(record => ({
      id: `neg-balance-${record.id}`,
      migrationId: record.id,
      type: 'NEGATIVE_BALANCE' as const,
      severity: 'error' as const,
      description: `余额为负数(${record.balance}万元)，数据可能有误`,
      isResolved: false,
    }));
};

export const detectInvalidMigrationCount = (records: MigrationRecord[]): AnomalyRecord[] => {
  return records
    .filter(r => r.migrationCount < 1 || r.migrationCount > 100)
    .map(record => ({
      id: `invalid-count-${record.id}`,
      migrationId: record.id,
      type: 'INVALID_MIGRATION_COUNT' as const,
      severity: 'error' as const,
      description: `迁徙次数${record.migrationCount}异常，正常范围应为1-100`,
      isResolved: false,
    }));
};

export const detectMissingIndustry = (records: MigrationRecord[]): AnomalyRecord[] => {
  return records
    .filter(r => !r.industry)
    .map(record => ({
      id: `missing-industry-${record.id}`,
      migrationId: record.id,
      type: 'MISSING_INDUSTRY' as const,
      severity: 'warning' as const,
      description: `行业标签为空，建议补充完整`,
      isResolved: false,
    }));
};

export const detectAllAnomalies = (records: MigrationRecord[]): Map<string, AnomalyRecord[]> => {
  const anomaliesByRecord = new Map<string, AnomalyRecord[]>();

  const allDetectors = [
    detectLowSample,
    detectDuplicateBalance,
    detectNegativeBalance,
    detectInvalidMigrationCount,
    detectMissingIndustry,
  ];

  allDetectors.forEach(detector => {
    const anomalies = detector(records);
    anomalies.forEach(anomaly => {
      const existing = anomaliesByRecord.get(anomaly.migrationId) || [];
      existing.push(anomaly);
      anomaliesByRecord.set(anomaly.migrationId, existing);
    });
  });

  return anomaliesByRecord;
};

export const getAnomalySummary = (records: MigrationRecord[]) => {
  const anomaliesMap = detectAllAnomalies(records);
  const allAnomalies = Array.from(anomaliesMap.values()).flat();

  const counts = allAnomalies.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRecords: records.length,
    recordsWithAnomalies: anomaliesMap.size,
    totalAnomalies: allAnomalies.length,
    errorCount: allAnomalies.filter(a => a.severity === 'error').length,
    warningCount: allAnomalies.filter(a => a.severity === 'warning').length,
    byType: counts,
  };
};
