import { db, generateId } from '../db.js';
import type { ManualCorrection, WarningLevel, CreateCorrectionRequest, CorrectionEffectiveness } from '../../shared/types.js';

export function createCorrection(
  request: CreateCorrectionRequest,
  correctedBy: string
): ManualCorrection {
  const existingScore = db.prepare(`
    SELECT * FROM warning_scores 
    WHERE student_id = ? AND version_id = ?
  `).get(request.studentId, request.versionId) as { overall_score: number; level: string } | undefined;
  
  if (!existingScore) {
    throw new Error('未找到对应的预警评分');
  }
  
  const correctionId = generateId('correction');
  
  db.prepare(`
    INSERT INTO manual_corrections (
      id, student_id, version_id, original_score, corrected_score,
      original_level, corrected_level, reason, corrected_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    correctionId,
    request.studentId,
    request.versionId,
    existingScore.overall_score,
    request.correctedScore,
    existingScore.level,
    request.correctedLevel,
    request.reason,
    correctedBy
  );
  
  if (request.adjustAttribution && request.adjustAttribution.length > 0) {
    db.prepare(`
      UPDATE warning_scores 
      SET attribution = ?
      WHERE student_id = ? AND version_id = ?
    `).run(
      JSON.stringify(request.adjustAttribution),
      request.studentId,
      request.versionId
    );
  }
  
  return getCorrectionById(correctionId)!;
}

export function getCorrectionById(id: string): ManualCorrection | undefined {
  const correction = db.prepare(`
    SELECT mc.*, s.name as studentName, wv.version, u.name as correctedByName
    FROM manual_corrections mc
    JOIN students s ON mc.student_id = s.id
    JOIN warning_versions wv ON mc.version_id = wv.id
    JOIN users u ON mc.corrected_by = u.id
    WHERE mc.id = ?
  `).get(id) as ManualCorrection | undefined;
  
  return correction;
}

export function getCorrections(filters?: {
  studentId?: string;
  correctedBy?: string;
  renewalResult?: string;
  limit?: number;
  offset?: number;
}): { list: ManualCorrection[]; total: number } {
  const whereClauses: string[] = [];
  const params: any[] = [];
  
  if (filters?.studentId) {
    whereClauses.push('mc.student_id = ?');
    params.push(filters.studentId);
  }
  
  if (filters?.correctedBy) {
    whereClauses.push('mc.corrected_by = ?');
    params.push(filters.correctedBy);
  }
  
  if (filters?.renewalResult) {
    whereClauses.push('mc.renewal_result = ?');
    params.push(filters.renewalResult);
  }
  
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM manual_corrections mc ${whereSql}
  `).get(...params) as { count: number };
  
  let sql = `
    SELECT mc.*, s.name as studentName, wv.version, u.name as correctedByName
    FROM manual_corrections mc
    JOIN students s ON mc.student_id = s.id
    JOIN warning_versions wv ON mc.version_id = wv.id
    JOIN users u ON mc.corrected_by = u.id
    ${whereSql}
    ORDER BY mc.created_at DESC
  `;
  
  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }
  
  const corrections = db.prepare(sql).all(...params) as ManualCorrection[];
  
  return { list: corrections, total: total.count };
}

export function updateRenewalResult(
  correctionId: string,
  result: 'renewed' | 'not_renewed' | 'pending'
): void {
  db.prepare(`
    UPDATE manual_corrections 
    SET renewal_result = ?
    WHERE id = ?
  `).run(result, correctionId);
}

export function getCorrectionEffectiveness(): CorrectionEffectiveness {
  const totalCorrections = db.prepare(`
    SELECT COUNT(*) as count FROM manual_corrections
  `).get() as { count: number };
  
  const withResult = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(CASE WHEN renewal_result = 'renewed' THEN 1 ELSE 0 END) as renewed,
      AVG(ABS(corrected_score - original_score)) as avgAdjustment
    FROM manual_corrections
    WHERE renewal_result IS NOT NULL
  `).get() as { count: number; renewed: number; avgAdjustment: number };
  
  const accurateCorrections = db.prepare(`
    SELECT COUNT(*) as count
    FROM manual_corrections
    WHERE (renewal_result = 'renewed' AND corrected_level IN ('green', 'yellow'))
       OR (renewal_result = 'not_renewed' AND corrected_level = 'red')
  `).get() as { count: number };
  
  const commonReasons = db.prepare(`
    SELECT reason, COUNT(*) as count
    FROM manual_corrections
    GROUP BY reason
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ reason: string; count: number }>;
  
  return {
    totalCorrections: totalCorrections.count,
    correctionAccuracy: withResult.count > 0 ? accurateCorrections.count / withResult.count : 0,
    avgScoreAdjustment: withResult.avgAdjustment || 0,
    renewalRateAfterCorrection: withResult.count > 0 ? withResult.renewed / withResult.count : 0,
    commonReasons: commonReasons.map(r => ({ reason: r.reason, count: r.count }))
  };
}
