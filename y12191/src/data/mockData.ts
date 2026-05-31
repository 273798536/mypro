import type { 
  Volunteer, 
  Position, 
  TrainingRecord, 
  TimeSlot,
  Skill,
  Training 
} from '../types';

const VOLUNTEER_NAMES = [
  '张伟', '李娜', '王芳', '刘洋', '陈明',
  '杨丽', '赵强', '黄敏', '周杰', '吴静',
  '郑浩', '孙丽', '钱磊', '冯婷', '朱军',
  '马琳', '胡波', '郭雪', '林峰', '何欣'
];

const SKILLS: Skill[] = ['检票', '引导', '安检', '票务', '后台', '应急'];
const TRAININGS: Training[] = ['消防培训', '应急处理', '服务礼仪', '票务系统', '安检规范'];
const TIME_SLOTS: TimeSlot[] = ['18:00-20:00', '19:00-21:00', '20:00-22:00', '全天'];

function generatePhone(): string {
  const prefixes = ['138', '139', '158', '159', '186', '189'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${suffix}`;
}

function pickRandom<T>(arr: T[], count: number, seed?: number): T[] {
  const result: T[] = [];
  const shuffled = [...arr];
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    result.push(shuffled[i]);
  }
  
  return result;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateVolunteers(count: number = 20, seed: number = 42): Volunteer[] {
  const random = seededRandom(seed);
  const volunteers: Volunteer[] = [];
  
  for (let i = 0; i < count; i++) {
    const skillCount = 1 + Math.floor(random() * 3);
    const slotCount = 1 + Math.floor(random() * 3);
    const isOnLeave = random() < 0.15;
    
    volunteers.push({
      id: `vol-${String(i + 1).padStart(3, '0')}`,
      name: VOLUNTEER_NAMES[i % VOLUNTEER_NAMES.length],
      phone: generatePhone(),
      skills: pickRandom(SKILLS, skillCount, seed + i),
      availableSlots: pickRandom(TIME_SLOTS, slotCount, seed + i + 100),
      isOnLeave,
      leaveReason: isOnLeave ? (random() < 0.5 ? '身体不适' : '家中有事') : undefined,
      leaveSlots: isOnLeave ? pickRandom(TIME_SLOTS, 1, seed + i + 200) : undefined
    });
  }
  
  return volunteers;
}

export function generatePositions(seed: number = 42): Position[] {
  return [
    {
      id: 'pos-001',
      name: '主入口检票',
      requiredSkills: ['检票', '引导'],
      requiredTraining: ['服务礼仪', '票务系统'],
      timeSlot: '18:00-20:00',
      capacity: 4,
      notes: '音乐厅正门'
    },
    {
      id: 'pos-002',
      name: '侧入口安检',
      requiredSkills: ['安检', '应急'],
      requiredTraining: ['安检规范', '应急处理'],
      timeSlot: '18:00-20:00',
      capacity: 3,
      notes: '东侧入口'
    },
    {
      id: 'pos-003',
      name: '观众厅引导',
      requiredSkills: ['引导'],
      requiredTraining: ['服务礼仪'],
      timeSlot: '19:00-21:00',
      capacity: 6,
      notes: '一层、二层各3人'
    },
    {
      id: 'pos-004',
      name: '票务服务台',
      requiredSkills: ['票务', '后台'],
      requiredTraining: ['票务系统', '服务礼仪'],
      timeSlot: '18:00-20:00',
      capacity: 2,
      notes: '票务咨询和取票'
    },
    {
      id: 'pos-005',
      name: '后台协助',
      requiredSkills: ['后台', '应急'],
      requiredTraining: ['消防培训', '应急处理'],
      timeSlot: '19:00-21:00',
      capacity: 3,
      notes: '演员通道和后台区域'
    },
    {
      id: 'pos-006',
      name: '散场引导',
      requiredSkills: ['引导', '应急'],
      requiredTraining: ['应急处理', '服务礼仪'],
      timeSlot: '20:00-22:00',
      capacity: 5,
      notes: '各出口疏散引导'
    }
  ];
}

export function generateTrainingRecordsPhase1(volunteers: Volunteer[], seed: number = 42): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  const random = seededRandom(seed);
  
  volunteers.forEach((volunteer, idx) => {
    const trainingCount = 1 + Math.floor(random() * 3);
    const selectedTrainings = pickRandom(TRAININGS, trainingCount, seed + idx);
    
    selectedTrainings.forEach((training, tIdx) => {
      const status = random() < 0.8 ? 'passed' : (random() < 0.5 ? 'pending' : 'failed');
      const date = new Date('2026-05-15');
      date.setDate(date.getDate() + Math.floor(random() * 10));
      
      records.push({
        id: `train-${volunteer.id}-${tIdx + 1}`,
        volunteerId: volunteer.id,
        trainingName: training,
        completedAt: date.toISOString().split('T')[0],
        status,
        expiresAt: status === 'passed' ? '2026-12-31' : undefined
      });
    });
  });
  
  return records;
}

export function generateTrainingRecordsPhase2(volunteers: Volunteer[], phase1Records: TrainingRecord[], seed: number = 42): TrainingRecord[] {
  const records = [...phase1Records];
  const random = seededRandom(seed + 1000);
  
  volunteers.forEach((volunteer, idx) => {
    const existingTrainings = records.filter(r => r.volunteerId === volunteer.id).map(r => r.trainingName);
    const missingTrainings = TRAININGS.filter(t => !existingTrainings.includes(t));
    
    if (missingTrainings.length > 0 && random() < 0.6) {
      const newTraining = missingTrainings[Math.floor(random() * missingTrainings.length)];
      const date = new Date('2026-05-30');
      date.setDate(date.getDate() + Math.floor(random() * 2));
      
      records.push({
        id: `train-${volunteer.id}-${existingTrainings.length + 1}`,
        volunteerId: volunteer.id,
        trainingName: newTraining,
        completedAt: date.toISOString().split('T')[0],
        status: 'passed',
        expiresAt: '2026-12-31'
      });
      
      const pendingRecord = records.find(
        r => r.volunteerId === volunteer.id && r.status === 'pending'
      );
      if (pendingRecord && random() < 0.7) {
        pendingRecord.status = 'passed';
        pendingRecord.completedAt = date.toISOString().split('T')[0];
      }
    }
  });
  
  return records;
}

export function generateInitialAssignments(
  volunteers: Volunteer[],
  positions: Position[],
  seed: number = 42
): { assignments: Omit<import('../types').Assignment, 'id'>[] } {
  const random = seededRandom(seed);
  const assignments: Omit<import('../types').Assignment, 'id'>[] = [];
  const positionAssignCount: Record<string, number> = {};
  
  positions.forEach(p => {
    positionAssignCount[p.id] = 0;
  });
  
  volunteers.forEach(volunteer => {
    const eligiblePositions = positions.filter(pos => {
      const hasRequiredSkills = pos.requiredSkills.every(s => volunteer.skills.includes(s));
      const hasTimeSlot = volunteer.availableSlots.includes(pos.timeSlot) || volunteer.availableSlots.includes('全天');
      const notFull = positionAssignCount[pos.id] < pos.capacity;
      const notOnLeave = !volunteer.isOnLeave || 
        !volunteer.leaveSlots?.includes(pos.timeSlot);
      
      return hasRequiredSkills && hasTimeSlot && notFull && notOnLeave;
    });
    
    if (eligiblePositions.length > 0 && random() < 0.7) {
      const selectedPos = eligiblePositions[Math.floor(random() * eligiblePositions.length)];
      positionAssignCount[selectedPos.id]++;
      
      assignments.push({
        volunteerId: volunteer.id,
        positionId: selectedPos.id,
        timeSlot: selectedPos.timeSlot,
        status: 'assigned'
      });
    } else if (eligiblePositions.length > 0 && random() < 0.3) {
      const selectedPos = eligiblePositions[Math.floor(random() * eligiblePositions.length)];
      positionAssignCount[selectedPos.id]++;
      
      assignments.push({
        volunteerId: volunteer.id,
        positionId: selectedPos.id,
        timeSlot: selectedPos.timeSlot,
        status: 'assigned'
      });
    }
  });
  
  return { assignments };
}
