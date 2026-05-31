import { db, generateId } from '../db.js';
import { initDatabase } from '../db.js';

const courseTypes = ['钢琴', '小提琴', '吉他', '声乐', '架子鼓', '古筝', '舞蹈'];
const absentReasons = ['sick', 'leave', 'tired', 'other', null, null, null];
const statuses = ['attended', 'attended', 'attended', 'attended', 'late', 'absent'];
const feedbackContents = [
  '孩子最近进步很大，感谢老师的耐心教导！',
  '练习不太积极，希望老师多督促。',
  '这周练琴状态不好，总是说不想练。',
  '上课表现很好，回家也能主动练习。',
  '最近缺课有点多，担心跟不上进度。',
  '老师说孩子很有天赋，继续保持。',
  '反馈孩子上课注意力不集中。',
  '孩子很喜欢这个老师，上课很开心。',
  '练习完成度不高，需要加强。',
  '感谢老师的鼓励，孩子越来越有信心了。'
];

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSampleData() {
  initDatabase();
  
  const teachers = db.prepare('SELECT id FROM users WHERE role = ?').all('teacher') as { id: string }[];
  
  db.transaction(() => {
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get() as { count: number };
    if (studentCount.count > 0) {
      console.log('已有学员数据，跳过生成');
      return;
    }
    
    const studentNames = [
      '小明', '小红', '小华', '小丽', '小强', '小芳', '小伟', '小娟',
      '小龙', '小凤', '小虎', '小燕', '小磊', '小娜', '小鹏', '小敏',
      '小杰', '小琳', '小洋', '小琪', '小航', '小雯', '小博', '小欣'
    ];
    
    const students: { id: string; name: string; teacherId: string }[] = [];
    
    for (let i = 0; i < 24; i++) {
      const id = generateId('stu');
      const name = studentNames[i];
      const age = randomInt(4, 15);
      const courseType = randomChoice(courseTypes);
      const teacher = randomChoice(teachers);
      const totalLessons = randomInt(24, 48);
      const remainingLessons = randomInt(1, totalLessons);
      const renewalDate = formatDate(-randomInt(-30, 60));
      const notes = i % 5 === 0 ? '家长备注：孩子有点内向，需要多鼓励' : '';
      
      db.prepare(`
        INSERT INTO students (
          id, name, age, course_type, teacher_id,
          remaining_lessons, total_lessons, renewal_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, age, courseType, teacher.id, remainingLessons, totalLessons, renewalDate, notes);
      
      students.push({ id, name, teacherId: teacher.id });
      
      for (let j = 0; j < randomInt(8, 15); j++) {
        const attId = generateId('att');
        const daysAgo = j;
        const status = randomChoice(statuses);
        const absentReason = status === 'absent' ? randomChoice(absentReasons) : null;
        const hasMissing = j % 7 === 0 && status === 'absent';
        
        db.prepare(`
          INSERT INTO attendance_records (
            id, student_id, lesson_date, status, absent_reason,
            has_missing_fields, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          attId, id, formatDate(daysAgo), status, absentReason,
          hasMissing ? 1 : 0, hasMissing ? '系统导入时缺少字段' : ''
        );
      }
      
      for (let j = 0; j < randomInt(5, 12); j++) {
        const pracId = generateId('practice');
        const daysAgo = j + randomInt(0, 2);
        const isLate = j % 4 === 0;
        
        db.prepare(`
          INSERT INTO practice_records (
            id, student_id, practice_date, submitted_date,
            duration_minutes, completion_rate, is_late, teacher_comment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          pracId, id, formatDate(daysAgo), formatDate(daysAgo - (isLate ? randomInt(1, 3) : 0)),
          randomInt(10, 60),
          Math.round(Math.random() * 100) / 100,
          isLate ? 1 : 0,
          j % 3 === 0 ? '继续努力，注意节奏' : ''
        );
      }
      
      for (let j = 0; j < randomInt(1, 5); j++) {
        const fbId = generateId('fb');
        const daysAgo = j * randomInt(3, 10);
        const content = randomChoice(feedbackContents);
        
        let score = 0;
        if (content.includes('进步') || content.includes('喜欢') || content.includes('感谢') || content.includes('信心')) score = 0.6;
        else if (content.includes('不积极') || content.includes('不好') || content.includes('担心') || content.includes('不高')) score = -0.4;
        
        db.prepare(`
          INSERT INTO feedback_records (
            id, student_id, feedback_date, content, sentiment_score
          ) VALUES (?, ?, ?, ?, ?)
        `).run(fbId, id, formatDate(daysAgo), content, score);
      }
      
      for (let j = 0; j < randomInt(0, 3); j++) {
        const followId = generateId('followup');
        const daysAgo = j * randomInt(7, 14);
        const methods = ['phone', 'wechat', 'in_person'];
        const method = randomChoice(methods);
        
        db.prepare(`
          INSERT INTO follow_up_records (
            id, student_id, follow_up_date, follow_up_by,
            method, content, next_action
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          followId, id, formatDate(daysAgo), randomChoice(teachers).id,
          method,
          `与家长沟通了${students[i].name}的学习情况，家长表示会配合督促练习。`,
          '下次课后再沟通一次'
        );
      }
    }
    
    console.log(`生成了 ${students.length} 名学员的样例数据`);
  })();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSampleData();
  console.log('样例数据生成完成');
}
