import { db, generateId } from '../db.js';
import type { Student, AttendanceRecord, PracticeRecord, FeedbackRecord, FollowUpRecord, TimelineEvent, MakeupRequest, MakeupResponse } from '../../shared/types.js';
import { calculateWarningScores, getMakeupConclusion } from './warning.service.js';

export function getStudents(filters?: {
  teacherId?: string;
  courseType?: string;
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { list: Student[]; total: number } {
  const whereClauses: string[] = [];
  const params: any[] = [];
  
  if (filters?.teacherId) {
    whereClauses.push('s.teacher_id = ?');
    params.push(filters.teacherId);
  }
  
  if (filters?.courseType) {
    whereClauses.push('s.course_type = ?');
    params.push(filters.courseType);
  }
  
  if (filters?.search) {
    whereClauses.push('s.name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  
  let joinSql = '';
  if (filters?.level) {
    joinSql = `
      JOIN warning_scores ws ON s.id = ws.student_id
      JOIN (SELECT MAX(created_at) as max_date FROM warning_versions) wv_max
      JOIN warning_versions wv ON wv.created_at = wv_max.max_date AND ws.version_id = wv.id
    `;
    whereClauses.push('ws.level = ?');
    params.push(filters.level);
  }
  
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const total = db.prepare(`
    SELECT COUNT(DISTINCT s.id) as count FROM students s ${joinSql} ${whereSql}
  `).get(...params) as { count: number };
  
  let sql = `
    SELECT s.*, u.name as teacherName
    FROM students s
    LEFT JOIN users u ON s.teacher_id = u.id
    ${joinSql}
    ${whereSql}
    ORDER BY s.updated_at DESC
  `;
  
  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }
  
  const students = db.prepare(sql).all(...params) as Student[];
  
  const lastVersion = db.prepare(`
    SELECT * FROM warning_versions ORDER BY created_at DESC LIMIT 1
  `).get() as { id: string } | undefined;
  
  if (lastVersion) {
    for (const student of students) {
      const score = db.prepare(`
        SELECT * FROM warning_scores 
        WHERE student_id = ? AND version_id = ?
      `).get(student.id, lastVersion.id) as any;
      
      if (score) {
        student.latestScore = {
          ...score,
          dimensions: JSON.parse(score.dimensions),
          attribution: JSON.parse(score.attribution),
          changeFromPrev: score.change_from_prev ? JSON.parse(score.change_from_prev) : undefined
        };
      }
    }
  }
  
  return { list: students, total: total.count };
}

export function getStudentDetail(studentId: string): (Student & {
  attendance: AttendanceRecord[];
  practice: PracticeRecord[];
  feedback: FeedbackRecord[];
  followUps: FollowUpRecord[];
  warningHistory: any[];
  timeline: TimelineEvent[];
}) | null {
  const student = db.prepare(`
    SELECT s.*, u.name as teacherName
    FROM students s
    LEFT JOIN users u ON s.teacher_id = u.id
    WHERE s.id = ?
  `).get(studentId) as Student | undefined;
  
  if (!student) return null;
  
  const attendance = db.prepare(`
    SELECT * FROM attendance_records 
    WHERE student_id = ? 
    ORDER BY lesson_date DESC
  `).all(studentId) as AttendanceRecord[];
  
  const practice = db.prepare(`
    SELECT * FROM practice_records 
    WHERE student_id = ? 
    ORDER BY practice_date DESC
  `).all(studentId) as PracticeRecord[];
  
  const feedback = db.prepare(`
    SELECT * FROM feedback_records 
    WHERE student_id = ? 
    ORDER BY feedback_date DESC
  `).all(studentId) as FeedbackRecord[];
  
  const followUps = db.prepare(`
    SELECT fur.*, u.name as followUpByName
    FROM follow_up_records fur
    JOIN users u ON fur.follow_up_by = u.id
    WHERE fur.student_id = ? 
    ORDER BY follow_up_date DESC
  `).all(studentId) as FollowUpRecord[];
  
  const warningHistory = db.prepare(`
    SELECT ws.*, wv.version, wv.created_at as versionCreatedAt
    FROM warning_scores ws
    JOIN warning_versions wv ON ws.version_id = wv.id
    WHERE ws.student_id = ?
    ORDER BY wv.created_at DESC
  `).all(studentId).map((s: any) => ({
    ...s,
    dimensions: JSON.parse(s.dimensions),
    attribution: JSON.parse(s.attribution),
    changeFromPrev: s.change_from_prev ? JSON.parse(s.change_from_prev) : undefined
  }));
  
  const timeline: TimelineEvent[] = [];
  
  attendance.slice(0, 20).forEach(a => {
    const isAbnormal = a.status === 'absent' || a.status === 'late';
    timeline.push({
      id: a.id,
      type: a.status === 'absent' ? 'absence' : 'attendance',
      date: a.lessonDate,
      title: a.status === 'attended' ? '出勤' : a.status === 'absent' ? '缺课' : a.status === 'late' ? '迟到' : '补课',
      description: a.notes || (a.absentReason ? `原因: ${a.absentReason}` : ''),
      isAbnormal,
      linkedId: a.id
    });
  });
  
  practice.slice(0, 10).forEach(p => {
    const isAbnormal = p.completionRate < 0.5 || p.isLate;
    timeline.push({
      id: p.id,
      type: 'practice',
      date: p.practiceDate,
      title: `练习打卡 ${p.durationMinutes}分钟`,
      description: `完成度: ${Math.round(p.completionRate * 100)}%${p.isLate ? ' (延迟提交)' : ''}`,
      isAbnormal,
      linkedId: p.id
    });
  });
  
  feedback.slice(0, 10).forEach(f => {
    const isAbnormal = f.sentimentScore < 0 || f.isDuplicate;
    timeline.push({
      id: f.id,
      type: 'feedback',
      date: f.feedbackDate,
      title: '家长反馈',
      description: f.content.substring(0, 50) + (f.content.length > 50 ? '...' : ''),
      isAbnormal,
      linkedId: f.id
    });
  });
  
  followUps.slice(0, 5).forEach(f => {
    timeline.push({
      id: f.id,
      type: 'followup',
      date: f.followUpDate,
      title: `跟进记录 (${f.method})`,
      description: f.content.substring(0, 50) + (f.content.length > 50 ? '...' : ''),
      isAbnormal: false,
      linkedId: f.id
    });
  });
  
  warningHistory.slice(0, 5).forEach(w => {
    const isAbnormal = w.level === 'red';
    timeline.push({
      id: w.id,
      type: 'warning',
      date: w.versionCreatedAt,
      title: `预警评分: ${w.overallScore} (${w.level === 'red' ? '高风险' : w.level === 'yellow' ? '中风险' : '正常'})`,
      description: w.attribution[0] || '',
      isAbnormal,
      linkedId: w.versionId
    });
  });
  
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return {
    ...student,
    attendance,
    practice,
    feedback,
    followUps,
    warningHistory,
    timeline
  };
}

export function getPendingMakeup(): AttendanceRecord[] {
  const records = db.prepare(`
    SELECT ar.*, s.name as studentName
    FROM attendance_records ar
    JOIN students s ON ar.student_id = s.id
    WHERE ar.status = 'absent' 
      AND ar.absent_reason IS NULL
    ORDER BY ar.lesson_date DESC
  `).all() as AttendanceRecord[];
  
  return records;
}

export async function processMakeup(request: MakeupRequest): Promise<MakeupResponse> {
  const record = db.prepare(`
    SELECT * FROM attendance_records WHERE id = ?
  `).get(request.attendanceId) as AttendanceRecord | undefined;
  
  if (!record) {
    throw new Error('未找到该上课记录');
  }
  
  db.prepare(`
    UPDATE attendance_records
    SET absent_reason = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    request.absentReason,
    request.notes || '',
    request.attendanceId
  );
  
  if (request.makeupDate) {
    const makeupId = generateId('attendance');
    db.prepare(`
      INSERT INTO attendance_records (
        id, student_id, lesson_date, status, 
        absent_reason, makeup_record_id, notes, has_missing_fields
      ) VALUES (?, ?, ?, 'makeup', NULL, ?, ?, ?)
    `).run(
      makeupId,
      record.studentId,
      request.makeupDate,
      request.attendanceId,
      `补录: ${request.parentCommunication}`,
      false
    );
  }
  
  const newVersion = await calculateWarningScores(
    'makeup',
    `缺课补录: ${request.attendanceId}`,
    record.studentId
  );
  
  const newScore = db.prepare(`
    SELECT ws.*, s.name as studentName, wv.version
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    JOIN warning_versions wv ON ws.version_id = wv.id
    WHERE ws.student_id = ? AND ws.version_id = ?
  `).get(record.studentId, newVersion.id) as any;
  
  const parsedScore = {
    ...newScore,
    dimensions: JSON.parse(newScore.dimensions),
    attribution: JSON.parse(newScore.attribution),
    changeFromPrev: newScore.change_from_prev ? JSON.parse(newScore.change_from_prev) : undefined
  };
  
  const conclusion = getMakeupConclusion(request.absentReason, parsedScore);
  
  const updatedRecord = db.prepare(`
    SELECT ar.*, s.name as studentName
    FROM attendance_records ar
    JOIN students s ON ar.student_id = s.id
    WHERE ar.id = ?
  `).get(request.attendanceId) as AttendanceRecord;
  
  return {
    record: updatedRecord,
    newScore: parsedScore,
    conclusion: conclusion.conclusion,
    actionItems: conclusion.actionItems
  };
}

export function createFollowUp(
  data: Omit<FollowUpRecord, 'id' | 'createdAt'>
): FollowUpRecord {
  const id = generateId('followup');
  
  db.prepare(`
    INSERT INTO follow_up_records (
      id, student_id, follow_up_date, follow_up_by,
      method, content, next_action, parent_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.studentId,
    data.followUpDate,
    data.followUpBy,
    data.method,
    data.content,
    data.nextAction || null,
    data.parentResponse || null
  );
  
  return db.prepare(`
    SELECT fur.*, s.name as studentName, u.name as followUpByName
    FROM follow_up_records fur
    JOIN students s ON fur.student_id = s.id
    JOIN users u ON fur.follow_up_by = u.id
    WHERE fur.id = ?
  `).get(id) as FollowUpRecord;
}
