import { db, generateId } from '../db.js';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import path from 'path';
import fs from 'fs';
import type { ImportPreview, ImportConfirm, ImportResult } from '../../shared/types.js';
import { cleanAttendanceRecord, cleanPracticeRecord, cleanFeedbackRecord, detectMissingFields, analyzeFeedbackSentiment } from './data-clean.service.js';

const FIELD_MAPPING: Record<string, Record<string, string>> = {
  students: {
    '学员ID': 'id',
    'studentId': 'id',
    '姓名': 'name',
    'name': 'name',
    '年龄': 'age',
    'age': 'age',
    '课程类型': 'courseType',
    'courseType': 'courseType',
    '课程': 'courseType',
    '老师ID': 'teacherId',
    'teacherId': 'teacherId',
    '剩余课时': 'remainingLessons',
    'remainingLessons': 'remainingLessons',
    '总课时': 'totalLessons',
    'totalLessons': 'totalLessons',
    '续费日期': 'renewalDate',
    'renewalDate': 'renewalDate',
    '备注': 'notes',
    'notes': 'notes'
  },
  attendance: {
    '学员ID': 'studentId',
    'studentId': 'studentId',
    '上课日期': 'lessonDate',
    'lessonDate': 'lessonDate',
    '状态': 'status',
    'status': 'status',
    '缺课原因': 'absentReason',
    'absentReason': 'absentReason',
    '备注': 'notes',
    'notes': 'notes'
  },
  practice: {
    '学员ID': 'studentId',
    'studentId': 'studentId',
    '练习日期': 'practiceDate',
    'practiceDate': 'practiceDate',
    '提交日期': 'submittedDate',
    'submittedDate': 'submittedDate',
    '练习时长': 'durationMinutes',
    'durationMinutes': 'durationMinutes',
    '完成度': 'completionRate',
    'completionRate': 'completionRate',
    '老师评语': 'teacherComment',
    'teacherComment': 'teacherComment'
  },
  feedback: {
    '学员ID': 'studentId',
    'studentId': 'studentId',
    '反馈日期': 'feedbackDate',
    'feedbackDate': 'feedbackDate',
    '反馈内容': 'content',
    'content': 'content'
  }
};

export function parseFile(filePath: string, dataType: string): ImportPreview {
  const ext = path.extname(filePath).toLowerCase();
  let rawData: Record<string, any>[] = [];
  
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawData = xlsx.utils.sheet_to_json(worksheet);
  } else if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    rawData = parse(content, { columns: true, skip_empty_lines: true });
  } else {
    throw new Error('不支持的文件格式');
  }
  
  if (rawData.length === 0) {
    throw new Error('文件为空');
  }
  
  const columns = Object.keys(rawData[0]);
  const issues: ImportPreview['issues'] = [];
  const mapping = FIELD_MAPPING[dataType] || {};
  const suggestedMapping: Record<string, string> = {};
  
  columns.forEach(col => {
    if (mapping[col]) {
      suggestedMapping[col] = mapping[col];
    }
  });
  
  const requiredFields = {
    students: ['name'],
    attendance: ['studentId', 'lessonDate', 'status'],
    practice: ['studentId', 'practiceDate'],
    feedback: ['studentId', 'feedbackDate', 'content']
  };
  
  const required = requiredFields[dataType as keyof typeof requiredFields] || [];
  
  let validRows = 0;
  
  rawData.forEach((row, index) => {
    required.forEach(field => {
      const sourceCol = Object.keys(suggestedMapping).find(k => suggestedMapping[k] === field) || field;
      const value = row[sourceCol];
      if (value === undefined || value === null || value === '') {
        issues.push({
          row: index + 2,
          column: sourceCol,
          issue: `缺少必填字段: ${field}`,
          severity: 'error',
          value: value
        });
      }
    });
    
    const { hasMissing } = detectMissingFields(row, required);
    if (!hasMissing) validRows++;
  });
  
  return {
    fileName: path.basename(filePath),
    totalRows: rawData.length,
    validRows,
    invalidRows: rawData.length - validRows,
    columns,
    sampleData: rawData.slice(0, 5),
    issues,
    suggestedMapping
  };
}

export function confirmImport(
  filePath: string,
  config: ImportConfirm
): ImportResult {
  const ext = path.extname(filePath).toLowerCase();
  let rawData: Record<string, any>[] = [];
  
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawData = xlsx.utils.sheet_to_json(worksheet);
  } else if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    rawData = parse(content, { columns: true, skip_empty_lines: true });
  }
  
  const errors: string[] = [];
  const newStudentIds: string[] = [];
  let imported = 0;
  let skipped = 0;
  
  const existingStudents = new Set(
    db.prepare('SELECT id FROM students').all().map((r: any) => r.id)
  );
  
  const existingFeedback = db.prepare(`
    SELECT * FROM feedback_records 
    WHERE feedback_date >= DATE('now', '-30 days')
  `).all() as any[];
  
  db.transaction(() => {
    for (const row of rawData) {
      try {
        const mappedRow: Record<string, any> = {};
        Object.entries(config.mapping).forEach(([source, target]) => {
          mappedRow[target] = row[source];
        });
        
        if (config.dataType === 'students') {
          const id = mappedRow.id || generateId('stu');
          const exists = existingStudents.has(id);
          
          if (exists) {
            db.prepare(`
              UPDATE students 
              SET name = ?, age = ?, course_type = ?, teacher_id = ?, 
                  remaining_lessons = ?, total_lessons = ?, renewal_date = ?, 
                  notes = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              mappedRow.name,
              mappedRow.age || null,
              mappedRow.courseType || null,
              mappedRow.teacherId || null,
              mappedRow.remainingLessons || 0,
              mappedRow.totalLessons || 0,
              mappedRow.renewalDate || null,
              mappedRow.notes || '',
              id
            );
          } else {
            db.prepare(`
              INSERT INTO students (
                id, name, age, course_type, teacher_id,
                remaining_lessons, total_lessons, renewal_date, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              mappedRow.name,
              mappedRow.age || null,
              mappedRow.courseType || null,
              mappedRow.teacherId || null,
              mappedRow.remainingLessons || 0,
              mappedRow.totalLessons || 0,
              mappedRow.renewalDate || null,
              mappedRow.notes || ''
            );
            newStudentIds.push(id);
            existingStudents.add(id);
          }
          imported++;
        } else if (config.dataType === 'attendance') {
          if (!existingStudents.has(mappedRow.studentId)) {
            if (config.skipInvalid) {
              skipped++;
              continue;
            }
            throw new Error(`学员不存在: ${mappedRow.studentId}`);
          }
          
          const cleaned = cleanAttendanceRecord(mappedRow);
          const id = generateId('att');
          
          db.prepare(`
            INSERT INTO attendance_records (
              id, student_id, lesson_date, status, absent_reason,
              notes, raw_data, has_missing_fields
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            cleaned.studentId,
            cleaned.lessonDate,
            cleaned.status,
            cleaned.absentReason,
            cleaned.notes,
            JSON.stringify(cleaned.rawData),
            cleaned.hasMissingFields
          );
          imported++;
        } else if (config.dataType === 'practice') {
          if (!existingStudents.has(mappedRow.studentId)) {
            if (config.skipInvalid) {
              skipped++;
              continue;
            }
            throw new Error(`学员不存在: ${mappedRow.studentId}`);
          }
          
          const cleaned = cleanPracticeRecord(mappedRow);
          db.prepare(`
            INSERT INTO practice_records (
              id, student_id, practice_date, submitted_date,
              duration_minutes, completion_rate, teacher_comment, is_late
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            cleaned.id,
            cleaned.studentId,
            cleaned.practiceDate,
            cleaned.submittedDate,
            cleaned.durationMinutes,
            cleaned.completionRate,
            cleaned.teacherComment,
            cleaned.isLate
          );
          imported++;
        } else if (config.dataType === 'feedback') {
          if (!existingStudents.has(mappedRow.studentId)) {
            if (config.skipInvalid) {
              skipped++;
              continue;
            }
            throw new Error(`学员不存在: ${mappedRow.studentId}`);
          }
          
          const cleaned = cleanFeedbackRecord(mappedRow, existingFeedback);
          const id = generateId('fb');
          const sentimentScore = analyzeFeedbackSentiment(cleaned.content || '');
          
          db.prepare(`
            INSERT INTO feedback_records (
              id, student_id, feedback_date, content,
              sentiment_score, is_duplicate, duplicate_of_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            cleaned.studentId,
            cleaned.feedbackDate,
            cleaned.content,
            sentimentScore,
            cleaned.isDuplicate,
            cleaned.duplicateOfId
          );
          imported++;
        }
      } catch (e) {
        if (config.skipInvalid) {
          skipped++;
          errors.push(`行 ${imported + skipped + 1}: ${e instanceof Error ? e.message : String(e)}`);
        } else {
          throw e;
        }
      }
    }
  })();
  
  return {
    totalImported: imported,
    totalSkipped: skipped,
    errors,
    newStudentIds
  };
}
