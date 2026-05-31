import { db } from '../db.js';
import type { GroupStats } from '../../shared/types.js';

type GroupDimension = 'teacher' | 'courseType' | 'age' | 'renewalPeriod';

export function getGroupStats(dimension: GroupDimension): GroupStats[] {
  const lastVersion = db.prepare(`
    SELECT * FROM warning_versions 
    ORDER BY created_at DESC LIMIT 1
  `).get() as { id: string } | undefined;
  
  if (!lastVersion) return [];
  
  let groupSql = '';
  let joinSql = '';
  
  switch (dimension) {
    case 'teacher':
      groupSql = 's.teacher_id as groupKey, u.name as groupName';
      joinSql = 'LEFT JOIN users u ON s.teacher_id = u.id';
      break;
    case 'courseType':
      groupSql = 's.course_type as groupKey, s.course_type as groupName';
      joinSql = '';
      break;
    case 'age':
      groupSql = `
        CASE 
          WHEN s.age < 6 THEN '0-5岁'
          WHEN s.age < 10 THEN '6-9岁'
          WHEN s.age < 14 THEN '10-13岁'
          ELSE '14岁以上'
        END as groupKey,
        CASE 
          WHEN s.age < 6 THEN '0-5岁'
          WHEN s.age < 10 THEN '6-9岁'
          WHEN s.age < 14 THEN '10-13岁'
          ELSE '14岁以上'
        END as groupName
      `;
      joinSql = '';
      break;
    case 'renewalPeriod':
      groupSql = `
        CASE 
          WHEN s.renewal_date IS NULL THEN '未设置'
          WHEN DATE(s.renewal_date) < DATE('now') THEN '已过期'
          WHEN DATE(s.renewal_date) < DATE('now', '+14 days') THEN '0-14天'
          WHEN DATE(s.renewal_date) < DATE('now', '+30 days') THEN '15-30天'
          ELSE '30天以上'
        END as groupKey,
        CASE 
          WHEN s.renewal_date IS NULL THEN '未设置'
          WHEN DATE(s.renewal_date) < DATE('now') THEN '已过期'
          WHEN DATE(s.renewal_date) < DATE('now', '+14 days') THEN '0-14天'
          WHEN DATE(s.renewal_date) < DATE('now', '+30 days') THEN '15-30天'
          ELSE '30天以上'
        END as groupName
      `;
      joinSql = '';
      break;
    default:
      return [];
  }
  
  const sql = `
    SELECT 
      ${groupSql},
      COUNT(DISTINCT s.id) as studentCount,
      SUM(CASE WHEN ws.level = 'red' THEN 1 ELSE 0 END) as redCount,
      SUM(CASE WHEN ws.level = 'yellow' THEN 1 ELSE 0 END) as yellowCount,
      SUM(CASE WHEN ws.level = 'green' THEN 1 ELSE 0 END) as greenCount,
      AVG(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absenceRate,
      AVG(p.completion_rate) as practiceCompletionRate,
      AVG(f.sentiment_score) as avgFeedbackSentiment
    FROM students s
    ${joinSql}
    LEFT JOIN warning_scores ws ON s.id = ws.student_id AND ws.version_id = ?
    LEFT JOIN (
      SELECT student_id, status, lesson_date,
             ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY lesson_date DESC) as rn
      FROM attendance_records
      WHERE lesson_date >= DATE('now', '-30 days')
    ) a ON s.id = a.student_id AND a.rn <= 10
    LEFT JOIN (
      SELECT student_id, completion_rate, practice_date,
             ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY practice_date DESC) as rn
      FROM practice_records
      WHERE practice_date >= DATE('now', '-30 days')
    ) p ON s.id = p.student_id AND p.rn <= 10
    LEFT JOIN (
      SELECT student_id, sentiment_score, feedback_date,
             ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY feedback_date DESC) as rn
      FROM feedback_records
      WHERE feedback_date >= DATE('now', '-30 days')
    ) f ON s.id = f.student_id AND f.rn <= 5
    GROUP BY groupKey, groupName
    HAVING studentCount > 0
    ORDER BY studentCount DESC
  `;
  
  const results = db.prepare(sql).all(lastVersion.id) as Array<{
    groupKey: string;
    groupName: string;
    studentCount: number;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    absenceRate: number;
    practiceCompletionRate: number;
    avgFeedbackSentiment: number;
  }>;
  
  return results.map(r => ({
    groupKey: r.groupKey || '未分组',
    groupName: r.groupName || '未分组',
    studentCount: r.studentCount,
    warningRate: r.studentCount > 0 ? (r.redCount + r.yellowCount) / r.studentCount : 0,
    redRate: r.studentCount > 0 ? r.redCount / r.studentCount : 0,
    yellowRate: r.studentCount > 0 ? r.yellowCount / r.studentCount : 0,
    greenRate: r.studentCount > 0 ? r.greenCount / r.studentCount : 0,
    absenceRate: r.absenceRate || 0,
    practiceCompletionRate: r.practiceCompletionRate || 0,
    avgFeedbackSentiment: r.avgFeedbackSentiment || 0
  }));
}
