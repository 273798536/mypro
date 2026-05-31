import { db } from '../db.js';
import type { WarningVersion, WarningScore, WarningLevel, VersionComparison } from '../../shared/types.js';

export function getVersions(filters?: {
  trigger?: string;
  limit?: number;
  offset?: number;
}): { list: WarningVersion[]; total: number } {
  const whereClauses: string[] = [];
  const params: any[] = [];
  
  if (filters?.trigger) {
    whereClauses.push('trigger = ?');
    params.push(filters.trigger);
  }
  
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM warning_versions ${whereSql}
  `).get(...params) as { count: number };
  
  let sql = `
    SELECT * FROM warning_versions 
    ${whereSql}
    ORDER BY created_at DESC
  `;
  
  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }
  
  const versions = db.prepare(sql).all(...params) as WarningVersion[];
  
  return { list: versions, total: total.count };
}

export function getVersionDetail(versionId: string): (WarningVersion & { scores: WarningScore[] }) | null {
  const version = db.prepare(`
    SELECT * FROM warning_versions WHERE id = ?
  `).get(versionId) as WarningVersion | undefined;
  
  if (!version) return null;
  
  const scores = db.prepare(`
    SELECT ws.*, s.name as studentName
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    WHERE ws.version_id = ?
    ORDER BY ws.overall_score DESC
  `).all(versionId) as (WarningScore & { dimensions: string; attribution: string; changeFromPrev?: string })[];
  
  const parsedScores = scores.map(s => ({
    ...s,
    dimensions: JSON.parse(s.dimensions),
    attribution: JSON.parse(s.attribution),
    changeFromPrev: s.changeFromPrev ? JSON.parse(s.changeFromPrev) : undefined
  }));
  
  return { ...version, scores: parsedScores };
}

export function compareVersions(versionId1: string, versionId2: string): VersionComparison | null {
  const v1 = db.prepare(`
    SELECT * FROM warning_versions WHERE id = ?
  `).get(versionId1) as WarningVersion | undefined;
  
  const v2 = db.prepare(`
    SELECT * FROM warning_versions WHERE id = ?
  `).get(versionId2) as WarningVersion | undefined;
  
  if (!v1 || !v2) return null;
  
  const scoresV1 = db.prepare(`
    SELECT ws.*, s.name as studentName
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    WHERE ws.version_id = ?
  `).all(versionId1) as Array<WarningScore & { studentName: string; dimensions: string; attribution: string }>;
  
  const scoresV2 = db.prepare(`
    SELECT ws.*, s.name as studentName
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    WHERE ws.version_id = ?
  `).all(versionId2) as Array<WarningScore & { studentName: string; dimensions: string; attribution: string }>;
  
  const scoreMapV1 = new Map(scoresV1.map(s => [s.studentId, s]));
  const scoreMapV2 = new Map(scoresV2.map(s => [s.studentId, s]));
  
  const scoreChanges: VersionComparison['scoreChanges'] = [];
  const levelTransitions: Record<string, number> = {};
  
  let totalDiff = 0;
  let changedCount = 0;
  
  const allStudentIds = new Set([...scoreMapV1.keys(), ...scoreMapV2.keys()]);
  
  for (const studentId of allStudentIds) {
    const s1 = scoreMapV1.get(studentId);
    const s2 = scoreMapV2.get(studentId);
    
    if (s1 && s2) {
      const diff = s2.overallScore - s1.overallScore;
      totalDiff += diff;
      if (Math.abs(diff) >= 5) changedCount++;
      
      const transition = `${s1.level}→${s2.level}`;
      levelTransitions[transition] = (levelTransitions[transition] || 0) + 1;
      
      const reasons: string[] = [];
      const dim1 = JSON.parse(s1.dimensions);
      const dim2 = JSON.parse(s2.dimensions);
      
      if (dim2.absence - dim1.absence >= 10) reasons.push('缺课增加');
      if (dim2.absence - dim1.absence <= -10) reasons.push('缺课减少');
      if (dim2.practice - dim1.practice >= 10) reasons.push('练习量下降');
      if (dim2.practice - dim1.practice <= -10) reasons.push('练习量提升');
      if (dim2.feedback - dim1.feedback >= 10) reasons.push('反馈变差');
      if (dim2.feedback - dim1.feedback <= -10) reasons.push('反馈改善');
      if (reasons.length === 0 && Math.abs(diff) >= 10) reasons.push('多维度综合变化');
      
      scoreChanges.push({
        studentId,
        studentName: s2.studentName,
        scoreV1: s1.overallScore,
        scoreV2: s2.overallScore,
        levelV1: s1.level as WarningLevel,
        levelV2: s2.level as WarningLevel,
        diff: Math.round(diff * 10) / 10,
        reasons
      });
    }
  }
  
  scoreChanges.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  
  let overallTrend: VersionComparison['overallTrend'] = 'stable';
  if (totalDiff > changedCount * 3) overallTrend = 'worsening';
  else if (totalDiff < -changedCount * 3) overallTrend = 'improving';
  
  return {
    version1: v1,
    version2: v2,
    scoreChanges,
    levelTransitions,
    overallTrend
  };
}
