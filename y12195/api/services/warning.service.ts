import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db, generateId } from '../db.js';
import type { Student, AttendanceRecord, PracticeRecord, FeedbackRecord, WarningScore, WarningVersion, WarningLevel, ScoreDimensions } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENGINE_PATH = path.join(__dirname, '..', 'engine', 'warning_engine.py');

interface EngineResult {
  success: boolean;
  results?: Array<{
    studentId: string;
    overallScore: number;
    level: WarningLevel;
    dimensions: ScoreDimensions;
    attribution: string[];
    changeFromPrev?: { scoreDiff: number; reasons: string[] };
    conclusion?: string;
    actionItems?: string[];
  }>;
  error?: string;
}

function generateVersionNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '.');
  const todayVersions = db.prepare(`
    SELECT COUNT(*) as count FROM warning_versions 
    WHERE version LIKE ?
  `).get(`v${dateStr}%`) as { count: number };
  
  return `v${dateStr}.${todayVersions.count + 1}`;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function getStudentData(studentId?: string): Array<{
  student: Student;
  attendance: AttendanceRecord[];
  practice: PracticeRecord[];
  feedback: FeedbackRecord[];
  prevScore?: WarningScore;
}> {
  let students: Student[];
  
  if (studentId) {
    students = db.prepare(`
      SELECT s.*, u.name as teacherName
      FROM students s
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ?
    `).all(studentId) as Student[];
  } else {
    students = db.prepare(`
      SELECT s.*, u.name as teacherName
      FROM students s
      LEFT JOIN users u ON s.teacher_id = u.id
    `).all() as Student[];
  }
  
  const lastVersion = db.prepare(`
    SELECT * FROM warning_versions 
    ORDER BY created_at DESC LIMIT 1
  `).get() as WarningVersion | undefined;
  
  return students.map(student => {
    const attendance = db.prepare(`
      SELECT * FROM attendance_records 
      WHERE student_id = ? 
      ORDER BY lesson_date DESC
    `).all(student.id) as AttendanceRecord[];
    
    const practice = db.prepare(`
      SELECT * FROM practice_records 
      WHERE student_id = ? 
      ORDER BY practice_date DESC
    `).all(student.id) as PracticeRecord[];
    
    const feedback = db.prepare(`
      SELECT * FROM feedback_records 
      WHERE student_id = ? 
      ORDER BY feedback_date DESC
    `).all(student.id) as FeedbackRecord[];
    
    let prevScore: WarningScore | undefined;
    if (lastVersion) {
      prevScore = db.prepare(`
        SELECT * FROM warning_scores 
        WHERE student_id = ? AND version_id = ?
      `).get(student.id, lastVersion.id) as WarningScore | undefined;
      
      if (prevScore) {
        prevScore.dimensions = JSON.parse(prevScore.dimensions as unknown as string);
        prevScore.attribution = JSON.parse(prevScore.attribution as unknown as string);
        if (prevScore.changeFromPrev) {
          prevScore.changeFromPrev = JSON.parse(prevScore.changeFromPrev as unknown as string);
        }
      }
    }
    
    return { student, attendance, practice, feedback, prevScore };
  });
}

async function runWarningEngine(studentData: ReturnType<typeof getStudentData>): Promise<EngineResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warning-engine-'));
  const inputPath = path.join(tmpDir, 'input.json');
  const outputPath = path.join(tmpDir, 'output.json');
  
  try {
    const inputData = {
      students: studentData.map(sd => ({
        student: toCamelCase(sd.student as unknown as Record<string, any>),
        attendance: sd.attendance.map(a => toCamelCase(a as unknown as Record<string, any>)),
        practice: sd.practice.map(p => toCamelCase(p as unknown as Record<string, any>)),
        feedback: sd.feedback.map(f => toCamelCase(f as unknown as Record<string, any>)),
        prevScore: sd.prevScore ? toCamelCase(sd.prevScore as unknown as Record<string, any>) : null
      }))
    };
    
    fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2), 'utf8');
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [ENGINE_PATH, inputPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        try {
          if (code === 0 && stdout.trim()) {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } else {
            resolve({
              success: false,
              error: stderr || `Python process exited with code ${code}`
            });
          }
        } catch (e) {
          resolve({
            success: false,
            error: `Failed to parse engine output: ${e instanceof Error ? e.message : String(e)}`
          });
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      });
      
      pythonProcess.on('error', (err) => {
        resolve({
          success: false,
          error: `Failed to run engine: ${err.message}`
        });
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });
    });
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return {
      success: false,
      error: `Failed to prepare engine input: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

export async function calculateWarningScores(
  trigger: WarningVersion['trigger'] = 'auto',
  description?: string,
  studentId?: string
): Promise<WarningVersion> {
  const studentData = getStudentData(studentId);
  
  if (studentData.length === 0) {
    throw new Error('没有学员数据可供计算');
  }
  
  const engineResult = await runWarningEngine(studentData);
  
  if (!engineResult.success || !engineResult.results) {
    throw new Error(engineResult.error || '预警引擎计算失败');
  }
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const versionId = generateId('version');
  const versionNumber = generateVersionNumber();
  
  db.transaction(() => {
    db.prepare(`
      INSERT INTO warning_versions (
        id, version, data_start_date, data_end_date, 
        student_count, trigger, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      versionId,
      versionNumber,
      thirtyDaysAgo.toISOString().slice(0, 10),
      now.toISOString().slice(0, 10),
      engineResult.results.length,
      trigger,
      description || `自动预警计算 - ${versionNumber}`
    );
    
    const insertScore = db.prepare(`
      INSERT INTO warning_scores (
        id, student_id, version_id, overall_score, level,
        dimensions, attribution, change_from_prev
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const result of engineResult.results) {
      insertScore.run(
        generateId('score'),
        result.studentId,
        versionId,
        result.overallScore,
        result.level,
        JSON.stringify(result.dimensions),
        JSON.stringify(result.attribution),
        result.changeFromPrev ? JSON.stringify(result.changeFromPrev) : null
      );
    }
  })();
  
  const version = db.prepare(`
    SELECT * FROM warning_versions WHERE id = ?
  `).get(versionId) as WarningVersion;
  
  return version;
}

export function getCurrentWarnings(filters?: {
  level?: WarningLevel;
  teacherId?: string;
  courseType?: string;
  limit?: number;
  offset?: number;
}): { list: WarningScore[]; total: number } {
  const lastVersion = db.prepare(`
    SELECT * FROM warning_versions 
    ORDER BY created_at DESC LIMIT 1
  `).get() as WarningVersion | undefined;
  
  if (!lastVersion) {
    return { list: [], total: 0 };
  }
  
  const whereClauses: string[] = ['ws.version_id = ?'];
  const params: any[] = [lastVersion.id];
  
  if (filters?.level) {
    whereClauses.push('ws.level = ?');
    params.push(filters.level);
  }
  
  if (filters?.teacherId) {
    whereClauses.push('s.teacher_id = ?');
    params.push(filters.teacherId);
  }
  
  if (filters?.courseType) {
    whereClauses.push('s.course_type = ?');
    params.push(filters.courseType);
  }
  
  const whereSql = whereClauses.join(' AND ');
  
  const total = db.prepare(`
    SELECT COUNT(*) as count 
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    WHERE ${whereSql}
  `).get(...params) as { count: number };
  
  let sql = `
    SELECT ws.*, s.name as studentName, wv.version
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    JOIN warning_versions wv ON ws.version_id = wv.id
    WHERE ${whereSql}
    ORDER BY ws.overall_score DESC
  `;
  
  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }
  
  const scores = db.prepare(sql).all(...params) as (WarningScore & { dimensions: string; attribution: string; changeFromPrev?: string })[];
  
  const parsedScores = scores.map(s => ({
    ...s,
    dimensions: JSON.parse(s.dimensions),
    attribution: JSON.parse(s.attribution),
    changeFromPrev: s.changeFromPrev ? JSON.parse(s.changeFromPrev) : undefined
  }));
  
  return { list: parsedScores, total: total.count };
}

export function getStudentWarningHistory(studentId: string): WarningScore[] {
  const scores = db.prepare(`
    SELECT ws.*, wv.version, wv.created_at as versionCreatedAt
    FROM warning_scores ws
    JOIN warning_versions wv ON ws.version_id = wv.id
    WHERE ws.student_id = ?
    ORDER BY wv.created_at DESC
  `).all(studentId) as (WarningScore & { dimensions: string; attribution: string; changeFromPrev?: string })[];
  
  return scores.map(s => ({
    ...s,
    dimensions: JSON.parse(s.dimensions),
    attribution: JSON.parse(s.attribution),
    changeFromPrev: s.changeFromPrev ? JSON.parse(s.changeFromPrev) : undefined
  }));
}

export function getDashboardStats() {
  const lastVersion = db.prepare(`
    SELECT * FROM warning_versions 
    ORDER BY created_at DESC LIMIT 1
  `).get() as WarningVersion | undefined;
  
  if (!lastVersion) {
    return null;
  }
  
  const counts = db.prepare(`
    SELECT 
      level,
      COUNT(*) as count
    FROM warning_scores
    WHERE version_id = ?
    GROUP BY level
  `).all(lastVersion.id) as Array<{ level: WarningLevel; count: number }>;
  
  const countMap = { red: 0, yellow: 0, green: 0 };
  counts.forEach(c => { countMap[c.level] = c.count; });
  
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
  
  const pendingFollowUps = db.prepare(`
    SELECT COUNT(DISTINCT s.id) as count
    FROM students s
    JOIN warning_scores ws ON s.id = ws.student_id
    LEFT JOIN follow_up_records fur ON s.id = fur.student_id
    WHERE ws.version_id = ? 
      AND ws.level IN ('red', 'yellow')
      AND (fur.follow_up_date IS NULL 
           OR DATE(fur.follow_up_date) < DATE('now', '-7 days'))
  `).get(lastVersion.id) as { count: number };
  
  const pendingMakeups = db.prepare(`
    SELECT COUNT(*) as count 
    FROM attendance_records 
    WHERE status = 'absent' 
      AND absent_reason IS NULL
  `).get() as { count: number };
  
  const topRisk = db.prepare(`
    SELECT 
      s.id, s.name, ws.overall_score as score, ws.level,
      ws.attribution,
      (SELECT MAX(follow_up_date) FROM follow_up_records WHERE student_id = s.id) as lastFollowUp
    FROM warning_scores ws
    JOIN students s ON ws.student_id = s.id
    WHERE ws.version_id = ?
    ORDER BY ws.overall_score DESC
    LIMIT 10
  `).all(lastVersion.id) as Array<{
    id: string; name: string; score: number; level: WarningLevel;
    attribution: string; lastFollowUp: string | null;
  }>;
  
  const versions = db.prepare(`
    SELECT * FROM warning_versions 
    ORDER BY created_at DESC 
    LIMIT 30
  `).all() as WarningVersion[];
  
  const trend = versions.map(v => {
    const levelCounts = db.prepare(`
      SELECT level, COUNT(*) as count
      FROM warning_scores
      WHERE version_id = ?
      GROUP BY level
    `).all(v.id) as Array<{ level: WarningLevel; count: number }>;
    
    const m = { red: 0, yellow: 0, green: 0 };
    levelCounts.forEach(c => { m[c.level] = c.count; });
    
    return {
      date: (v as any).created_at ? (v as any).created_at.slice(0, 10) : '',
      ...m
    };
  }).reverse();
  
  return {
    totalStudents: totalStudents.count,
    redCount: countMap.red,
    yellowCount: countMap.yellow,
    greenCount: countMap.green,
    pendingFollowUps: pendingFollowUps.count,
    pendingMakeups: pendingMakeups.count,
    trend,
    topRiskStudents: topRisk.map(t => ({
      ...t,
      attribution: JSON.parse(t.attribution),
      lastFollowUp: t.lastFollowUp || '从未跟进'
    }))
  };
}

export function getMakeupConclusion(
  absentReason: string,
  newScore: WarningScore
): { conclusion: string; actionItems: string[] } {
  const level = newScore.level;
  const score = newScore.overallScore;
  
  if (level === 'green') {
    if (absentReason === 'sick') {
      return {
        conclusion: '因病缺课，已补课，风险降低',
        actionItems: [
          '继续观察后续上课状态',
          '提醒家长注意孩子身体状况',
          '下次续费时提前30天沟通'
        ]
      };
    }
    return {
      conclusion: '补课后风险降低，状态良好',
      actionItems: [
        '保持当前学习节奏',
        '课后发送个性化练习建议'
      ]
    };
  } else if (level === 'yellow') {
    if (absentReason === 'tired') {
      return {
        conclusion: '存在厌学情绪，需持续关注',
        actionItems: [
          '1周内与家长电话沟通',
          '了解孩子学习兴趣变化',
          '考虑调整课程难度或内容'
        ]
      };
    } else if (absentReason === 'sick') {
      return {
        conclusion: '因病缺课影响进度，需加强练习',
        actionItems: [
          '课后布置针对性补练',
          '下次课重点检查补课内容掌握情况',
          '3天后跟进练习完成情况'
        ]
      };
    }
    return {
      conclusion: '补课后仍需关注，建议主动跟进',
      actionItems: [
        '1周内与家长电话沟通1次',
        '重点关注下次上课表现',
        '课后发送个性化练习建议'
      ]
    };
  } else {
    if (absentReason === 'tired') {
      return {
        conclusion: '厌学情绪明显，需立即深度沟通',
        actionItems: [
          '24小时内联系家长了解情况',
          '安排老师1对1沟通，了解厌学原因',
          '制定个性化改进方案',
          '课程顾问介入续费沟通'
        ]
      };
    } else if (absentReason === 'other' && score >= 80) {
      return {
        conclusion: '缺课原因不明，存在高退费风险',
        actionItems: [
          '立即联系家长了解真实原因',
          '安排教学主管介入',
          '准备替代方案或优惠政策',
          '每日跟进沟通进度'
        ]
      };
    }
    return {
      conclusion: '高风险，建议立即介入',
      actionItems: [
        '24小时内联系家长了解情况',
        '安排老师1对1沟通',
        '制定个性化改进方案',
        '课程顾问介入续费沟通'
      ]
    };
  }
}
