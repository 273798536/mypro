import type { Patient, Room } from '@/types';
import { PRIORITY_CONFIG } from '@/types';

const MALE_NAMES = ['张伟', '王强', '李军', '刘洋', '陈明', '赵刚', '孙鹏', '周杰', '吴涛', '郑浩', '冯宇', '董亮', '黄磊', '曹阳', '袁峰'];
const FEMALE_NAMES = ['王芳', '李娜', '张丽', '刘敏', '陈静', '杨丽', '赵丽', '周艳', '吴娟', '郑琳', '冯雪', '董梅', '黄婷', '曹颖', '袁霞'];

const SYMPTOMS: Record<string, string[]> = {
  critical: ['意识丧失', '心跳骤停', '严重创伤', '大量出血', '呼吸困难', '休克', '急性心梗', '脑卒中等'],
  urgent: ['剧烈腹痛', '高烧不退', '严重呕吐', '骨折', '脱水', '急性哮喘', '严重头痛', '眼部受伤'],
  normal: ['发烧', '咳嗽', '腹泻', '皮疹', '扭伤', '普通外伤', '感冒', '咽喉痛'],
  low: ['轻微头痛', '鼻塞', '皮肤瘙痒', '轻微烫伤', '疲劳', '失眠', '食欲不佳', '便秘'],
};

const SOURCES = ['急诊科病例库2024', '外科教学病例', '内科模拟病例', '儿科典型病例', '急诊分诊指南案例', '临床技能培训材料'];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePatient(id: number, arrivalDelay: number = 0): Patient {
  const priorities: Array<'critical' | 'urgent' | 'normal' | 'low'> = ['critical', 'urgent', 'normal', 'low'];
  const weights = [0.1, 0.25, 0.45, 0.2];
  
  let r = Math.random();
  let priority: 'critical' | 'urgent' | 'normal' | 'low' = 'normal';
  let cumulative = 0;
  for (let i = 0; i < priorities.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) {
      priority = priorities[i];
      break;
    }
  }

  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const name = randomPick(gender === 'male' ? MALE_NAMES : FEMALE_NAMES);
  const symptoms = [randomPick(SYMPTOMS[priority])];
  if (Math.random() > 0.5) {
    symptoms.push(randomPick(SYMPTOMS[priority]));
  }

  const config = PRIORITY_CONFIG[priority];
  const baseTreatmentTime = priority === 'critical' ? 300 : priority === 'urgent' ? 180 : priority === 'normal' ? 120 : 60;

  return {
    id: `patient-${id}-${Date.now()}`,
    name,
    age: Math.floor(Math.random() * 70) + 10,
    gender,
    symptoms,
    initialPriority: priority,
    currentPriority: priority,
    waitTime: 0,
    maxWaitTime: config.maxWait,
    arrivalTime: Date.now() + arrivalDelay * 1000,
    status: 'waiting',
    source: randomPick(SOURCES),
    reEvaluateCount: 0,
    history: [],
    treatmentTime: baseTreatmentTime + Math.floor(Math.random() * 60),
  };
}

export function generateMockPatients(count: number = 15): Patient[] {
  const patients: Patient[] = [];
  for (let i = 0; i < count; i++) {
    patients.push(generatePatient(i, i * 20));
  }
  return patients;
}

export function generateMockRooms(): Room[] {
  return [
    {
      id: 'room-1',
      name: '急诊1室',
      status: 'idle',
      remainingTime: 0,
      totalTime: 0,
      idleTime: 0,
    },
    {
      id: 'room-2',
      name: '急诊2室',
      status: 'idle',
      remainingTime: 0,
      totalTime: 0,
      idleTime: 0,
    },
    {
      id: 'room-3',
      name: '急诊3室',
      status: 'idle',
      remainingTime: 0,
      totalTime: 0,
      idleTime: 0,
    },
    {
      id: 'room-4',
      name: '抢救室',
      status: 'idle',
      remainingTime: 0,
      totalTime: 0,
      idleTime: 0,
    },
  ];
}

export const DEFAULT_PATIENTS: Patient[] = generateMockPatients(12);
export const DEFAULT_ROOMS: Room[] = generateMockRooms();

export const SAMPLE_IMPORT_DATA = {
  patients: [
    {
      id: 'import-1',
      name: '张三',
      age: 45,
      gender: 'male',
      symptoms: ['胸痛', '呼吸困难'],
      initialPriority: 'critical' as const,
      currentPriority: 'critical' as const,
      waitTime: 0,
      maxWaitTime: 60,
      arrivalTime: Date.now(),
      status: 'waiting' as const,
      source: '导入病例A',
      reEvaluateCount: 0,
      history: [],
      treatmentTime: 300,
    },
    {
      id: 'import-2',
      name: '李四',
      age: 28,
      gender: 'female',
      symptoms: ['高烧', '呕吐'],
      initialPriority: 'urgent' as const,
      currentPriority: 'urgent' as const,
      waitTime: 0,
      maxWaitTime: 180,
      arrivalTime: Date.now() + 30000,
      status: 'waiting' as const,
      source: '导入病例B',
      reEvaluateCount: 0,
      history: [],
      treatmentTime: 180,
    },
  ],
};
