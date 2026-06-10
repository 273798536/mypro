import { runQuery } from '../db/database';
import { StatisticsResult } from '../types';

export class StatisticsRepository {
  static calculateGroupStatistics(batchId: string): StatisticsResult[] {
    const results = runQuery(
      `SELECT
        group_name,
        COUNT(*) as sample_count,
        AVG(germination_rate) as avg_rate,
        MAX(germination_rate) as max_rate,
        MIN(germination_rate) as min_rate,
        SUM(CASE WHEN abnormal = 1 THEN 1 ELSE 0 END) as abnormal_count,
        SUM(CASE WHEN qc_passed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as qc_pass_rate
      FROM samples
      WHERE batch_id = ?
      GROUP BY group_name
      ORDER BY group_name`,
      [batchId]
    );

    return results.map(row => ({
      batchId,
      groupName: row.group_name,
      sampleCount: row.sample_count,
      avgGerminationRate: Math.round(row.avg_rate * 100) / 100,
      maxGerminationRate: Math.round(row.max_rate * 100) / 100,
      minGerminationRate: Math.round(row.min_rate * 100) / 100,
      abnormalCount: row.abnormal_count,
      qcPassRate: Math.round(row.qc_pass_rate * 100) / 100
    }));
  }

  static calculateOverallStatistics(batchId: string): {
    totalSamples: number;
    avgGerminationRate: number;
    overallQcPassRate: number;
    abnormalRate: number;
    groupStats: StatisticsResult[];
  } {
    const groupStats = this.calculateGroupStatistics(batchId);

    const overall = runQuery(
      `SELECT
        COUNT(*) as total,
        AVG(germination_rate) as avg_rate,
        SUM(CASE WHEN qc_passed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as qc_pass_rate,
        SUM(CASE WHEN abnormal = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as abnormal_rate
      FROM samples
      WHERE batch_id = ?`,
      [batchId]
    );

    return {
      totalSamples: overall[0]?.total || 0,
      avgGerminationRate: Math.round((overall[0]?.avg_rate || 0) * 100) / 100,
      overallQcPassRate: Math.round((overall[0]?.qc_pass_rate || 0) * 100) / 100,
      abnormalRate: Math.round((overall[0]?.abnormal_rate || 0) * 100) / 100,
      groupStats
    };
  }

  static getStatisticsBySeedType(batchId: string): Array<{
    seedType: string;
    sampleCount: number;
    avgGerminationRate: number;
  }> {
    const results = runQuery(
      `SELECT
        seed_type,
        COUNT(*) as sample_count,
        AVG(germination_rate) as avg_rate
      FROM samples
      WHERE batch_id = ?
      GROUP BY seed_type
      ORDER BY seed_type`,
      [batchId]
    );

    return results.map(row => ({
      seedType: row.seed_type,
      sampleCount: row.sample_count,
      avgGerminationRate: Math.round(row.avg_rate * 100) / 100
    }));
  }

  static getTimePointCompleteness(batchId: string): {
    totalSamples: number;
    missingSowingDate: number;
    missingGerminationDates: number;
    completeTimePoints: number;
    completenessRate: number;
  } {
    const results = runQuery(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN sowing_date IS NULL OR sowing_date = '' THEN 1 ELSE 0 END) as missing_sowing,
        SUM(CASE WHEN germination_dates IS NULL OR germination_dates = '[]' THEN 1 ELSE 0 END) as missing_germination,
        SUM(CASE WHEN sowing_date IS NOT NULL AND sowing_date != ''
                  AND germination_dates IS NOT NULL AND germination_dates != '[]'
             THEN 1 ELSE 0 END) as complete
      FROM samples
      WHERE batch_id = ?`,
      [batchId]
    );

    const row = results[0] || { total: 0, missing_sowing: 0, missing_germination: 0, complete: 0 };
    return {
      totalSamples: row.total,
      missingSowingDate: row.missing_sowing,
      missingGerminationDates: row.missing_germination,
      completeTimePoints: row.complete,
      completenessRate: row.total > 0 ? Math.round((row.complete / row.total) * 10000) / 100 : 0
    };
  }
}
