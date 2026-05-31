import { db, generateId } from '../db.js';
import type { AttendanceRecord, PracticeRecord, FeedbackRecord } from '../../shared/types.js';

export function detectMissingFields(record: Record<string, any>, requiredFields: string[]): { hasMissing: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = record[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    hasMissing: missingFields.length > 0,
    missingFields
  };
}

export function cleanAttendanceRecord(rawData: Record<string, any>): Partial<AttendanceRecord> {
  const { hasMissing, missingFields } = detectMissingFields(rawData, ['studentId', 'lessonDate', 'status']);
  
  const statusMap: Record<string, AttendanceRecord['status']> = {
    '出勤': 'attended',
    'attended': 'attended',
    '缺席': 'absent',
    'absent': 'absent',
    '缺课': 'absent',
    '迟到': 'late',
    'late': 'late',
    '补课': 'makeup',
    'makeup': 'makeup'
  };
  
  const reasonMap: Record<string, AttendanceRecord['absentReason']> = {
    '病假': 'sick',
    'sick': 'sick',
    '事假': 'leave',
    'leave': 'leave',
    '厌学': 'tired',
    'tired': 'tired',
    '其他': 'other',
    'other': 'other'
  };
  
  const cleaned: Partial<AttendanceRecord> = {
    studentId: rawData.studentId || rawData.student_id || rawData.学员ID,
    lessonDate: rawData.lessonDate || rawData.lesson_date || rawData.上课日期,
    status: statusMap[(rawData.status || rawData.状态 || '').toString().toLowerCase()] || 'attended',
    absentReason: rawData.absentReason ? reasonMap[rawData.absentReason.toString().toLowerCase()] || null : null,
    notes: rawData.notes || rawData.备注 || '',
    hasMissingFields: hasMissing,
    rawData: rawData
  };
  
  if (missingFields.length > 0) {
    cleaned.notes = `${cleaned.notes || ''} [缺失字段: ${missingFields.join(', ')}]`.trim();
  }
  
  return cleaned;
}

export function cleanPracticeRecord(rawData: Record<string, any>): Partial<PracticeRecord> {
  const { hasMissing, missingFields } = detectMissingFields(rawData, ['studentId', 'practiceDate']);
  
  const practiceDate = rawData.practiceDate || rawData.practice_date || rawData.练习日期;
  const submittedDate = rawData.submittedDate || rawData.submitted_date || rawData.提交日期 || practiceDate;
  
  const isLate = practiceDate && submittedDate 
    ? new Date(submittedDate) > new Date(practiceDate + 'T23:59:59')
    : false;
  
  return {
    id: generateId('practice'),
    studentId: rawData.studentId || rawData.student_id || rawData.学员ID,
    practiceDate: practiceDate,
    submittedDate: submittedDate,
    durationMinutes: parseInt(rawData.durationMinutes || rawData.duration || rawData.练习时长 || '0'),
    completionRate: parseFloat(rawData.completionRate || rawData.completion || rawData.完成度 || '0'),
    teacherComment: rawData.teacherComment || rawData.老师评语 || '',
    isLate: isLate || rawData.isLate === true || rawData.是否延迟 === '是'
  };
}

export function analyzeFeedbackSentiment(content: string): number {
  const negativeWords = ['不好', '差', '不满意', '失望', '无聊', '不想学', '累', '讨厌', '难', '跟不上', '太慢', '太快'];
  const positiveWords = ['好', '棒', '喜欢', '满意', '开心', '高兴', '进步', '努力', '认真', '优秀', '主动', '积极'];
  
  let score = 0;
  const lowerContent = content.toLowerCase();
  
  negativeWords.forEach(word => {
    if (lowerContent.includes(word)) score -= 0.2;
  });
  
  positiveWords.forEach(word => {
    if (lowerContent.includes(word)) score += 0.2;
  });
  
  return Math.max(-1, Math.min(1, score));
}

export function detectDuplicateFeedback(feedback: FeedbackRecord, existingFeedback: FeedbackRecord[]): { isDuplicate: boolean; duplicateOfId?: string } {
  for (const existing of existingFeedback) {
    if (existing.id === feedback.id) continue;
    
    const sameStudent = existing.studentId === feedback.studentId;
    const sameDate = existing.feedbackDate === feedback.feedbackDate;
    const contentSimilarity = calculateTextSimilarity(feedback.content, existing.content);
    
    if (sameStudent && sameDate && contentSimilarity > 0.8) {
      return { isDuplicate: true, duplicateOfId: existing.id };
    }
  }
  
  return { isDuplicate: false };
}

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1;
  
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  let intersection = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersection++;
  });
  
  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function cleanFeedbackRecord(rawData: Record<string, any>, existingFeedback: FeedbackRecord[]): Partial<FeedbackRecord> {
  const content = rawData.content || rawData.反馈内容 || rawData.内容 || '';
  const sentimentScore = analyzeFeedbackSentiment(content);
  
  const tempFeedback: FeedbackRecord = {
    id: '',
    studentId: rawData.studentId || rawData.student_id || rawData.学员ID || '',
    feedbackDate: rawData.feedbackDate || rawData.feedback_date || rawData.反馈日期 || '',
    content: content,
    sentimentScore: sentimentScore,
    isDuplicate: false,
    createdAt: new Date().toISOString()
  };
  
  const { isDuplicate, duplicateOfId } = detectDuplicateFeedback(tempFeedback, existingFeedback);
  
  return {
    ...tempFeedback,
    isDuplicate,
    duplicateOfId
  };
}
