import {
  Room,
  Band,
  Course,
  TeacherLeave,
  DataSource,
} from '../types';
import { generateId, dayjsInstance, getNextOccurrence } from '../utils/dateUtils';

const baseWeek = dayjsInstance().startOf('isoWeek').format('YYYY-MM-DD');

export const sampleRooms: Omit<Room, 'id' | 'sourceId' | 'version'>[] = [
  {
    name: '排练室A - 大型乐队室',
    capacity: 15,
    equipment: ['架子鼓', '电钢琴', '吉他音箱', '贝斯音箱', '麦克风架', '调音台', '监听音箱'],
  },
  {
    name: '排练室B - 中型乐队室',
    capacity: 10,
    equipment: ['架子鼓', '电钢琴', '吉他音箱', '贝斯音箱', '麦克风架'],
  },
  {
    name: '排练室C - 小型练习室',
    capacity: 5,
    equipment: ['电钢琴', '吉他音箱', '麦克风架'],
  },
  {
    name: '排练室D - 声乐室',
    capacity: 8,
    equipment: ['电钢琴', '麦克风架', '监听音箱', '调音台'],
  },
  {
    name: '排练室E - 管弦乐室',
    capacity: 20,
    equipment: ['钢琴', '指挥台', '谱架', '调音台', '监听音箱'],
  },
];

export const sampleBands: Omit<Band, 'id' | 'sourceId' | 'version'>[] = [
  {
    name: '极光乐队',
    members: [
      { name: '张明', role: '主唱/吉他' },
      { name: '李华', role: '贝斯' },
      { name: '王芳', role: '鼓手' },
      { name: '陈静', role: '键盘' },
    ],
    requiredEquipment: ['架子鼓', '电钢琴', '吉他音箱', '贝斯音箱', '麦克风架', '调音台'],
    equipmentNeeds: ['架子鼓', '电钢琴', '吉他音箱', '贝斯音箱', '麦克风架', '调音台'],
  },
  {
    name: '彩虹乐团',
    members: [
      { name: '刘伟', role: '主唱' },
      { name: '赵强', role: '吉他' },
      { name: '孙丽', role: '键盘' },
    ],
    requiredEquipment: ['电钢琴', '吉他音箱', '麦克风架'],
    equipmentNeeds: ['电钢琴', '吉他音箱', '麦克风架'],
  },
  {
    name: '星空合唱团',
    members: [
      { name: '周老师', role: '指挥' },
      { name: '团员1-12', role: '合唱团员' },
    ],
    requiredEquipment: ['钢琴', '指挥台', '谱架', '调音台', '监听音箱'],
    equipmentNeeds: ['钢琴', '指挥台', '谱架', '调音台', '监听音箱'],
  },
  {
    name: '节奏部落',
    members: [
      { name: '吴昊', role: '鼓手' },
      { name: '郑洁', role: '贝斯' },
      { name: '冯凯', role: '吉他' },
    ],
    requiredEquipment: ['架子鼓', '吉他音箱', '贝斯音箱', '麦克风架'],
    equipmentNeeds: ['架子鼓', '吉他音箱', '贝斯音箱', '麦克风架'],
  },
  {
    name: '声乐小组',
    members: [
      { name: '林老师', role: '声乐指导' },
      { name: '学生A', role: '学员' },
      { name: '学生B', role: '学员' },
      { name: '学生C', role: '学员' },
    ],
    requiredEquipment: ['电钢琴', '麦克风架', '监听音箱', '调音台'],
    equipmentNeeds: ['电钢琴', '麦克风架', '监听音箱', '调音台'],
  },
  {
    name: '古典四重奏',
    members: [
      { name: '黄薇', role: '第一小提琴' },
      { name: '朱明', role: '第二小提琴' },
      { name: '许燕', role: '中提琴' },
      { name: '何涛', role: '大提琴' },
    ],
    requiredEquipment: ['谱架', '钢琴', '调音台'],
    equipmentNeeds: ['谱架', '钢琴', '调音台'],
  },
];

export const sampleCourses: Omit<Course, 'id' | 'sourceId' | 'version'>[] = [
  {
    name: '电声乐队排练课',
    teacher: '周老师',
    startTime: getNextOccurrence(1, '09:00', baseWeek),
    endTime: getNextOccurrence(1, '11:00', baseWeek),
    dayOfWeek: 1,
  },
  {
    name: '流行演唱技巧',
    teacher: '林老师',
    startTime: getNextOccurrence(1, '14:00', baseWeek),
    endTime: getNextOccurrence(1, '16:00', baseWeek),
    dayOfWeek: 1,
  },
  {
    name: '打击乐基础',
    teacher: '王老师',
    startTime: getNextOccurrence(2, '10:00', baseWeek),
    endTime: getNextOccurrence(2, '12:00', baseWeek),
    dayOfWeek: 2,
  },
  {
    name: '合唱团排练',
    teacher: '周老师',
    startTime: getNextOccurrence(2, '14:00', baseWeek),
    endTime: getNextOccurrence(2, '17:00', baseWeek),
    dayOfWeek: 2,
  },
  {
    name: '吉他进阶班',
    teacher: '赵老师',
    startTime: getNextOccurrence(3, '09:00', baseWeek),
    endTime: getNextOccurrence(3, '11:00', baseWeek),
    dayOfWeek: 3,
  },
  {
    name: '爵士乐队合奏',
    teacher: '李老师',
    startTime: getNextOccurrence(3, '13:00', baseWeek),
    endTime: getNextOccurrence(3, '16:00', baseWeek),
    dayOfWeek: 3,
  },
  {
    name: '声乐小组课',
    teacher: '林老师',
    startTime: getNextOccurrence(4, '10:00', baseWeek),
    endTime: getNextOccurrence(4, '12:00', baseWeek),
    dayOfWeek: 4,
  },
  {
    name: '管弦乐排练',
    teacher: '刘指挥',
    startTime: getNextOccurrence(4, '14:00', baseWeek),
    endTime: getNextOccurrence(4, '18:00', baseWeek),
    dayOfWeek: 4,
  },
  {
    name: '乐队合练（跨天）',
    teacher: '周老师',
    startTime: getNextOccurrence(5, '20:00', baseWeek),
    endTime: getNextOccurrence(6, '01:00', baseWeek),
    dayOfWeek: 5,
  },
  {
    name: '钢琴伴奏课',
    teacher: '陈老师',
    startTime: getNextOccurrence(5, '09:00', baseWeek),
    endTime: getNextOccurrence(5, '11:00', baseWeek),
    dayOfWeek: 5,
  },
];

export const sampleTeacherLeaves: Omit<TeacherLeave, 'id'>[] = [
  {
    teacher: '林老师',
    startDate: dayjsInstance(baseWeek).add(3, 'day').format('YYYY-MM-DD'),
    endDate: dayjsInstance(baseWeek).add(5, 'day').format('YYYY-MM-DD'),
    reason: '外出参加声乐研讨会',
  },
  {
    teacher: '周老师',
    startDate: dayjsInstance(baseWeek).add(1, 'day').format('YYYY-MM-DD'),
    endDate: dayjsInstance(baseWeek).add(2, 'day').format('YYYY-MM-DD'),
    reason: '病假',
  },
];

export const sampleDataSources: Omit<DataSource, 'id' | 'importedAt'>[] = [
  {
    type: 'room',
    name: '排练室表_2024Q2.xlsx',
    source: '教务系统导出',
    version: 'v1.0',
    snapshot: sampleRooms,
    recordCount: sampleRooms.length,
  },
  {
    type: 'band',
    name: '乐队名单_本学期.csv',
    source: '各乐队队长提交',
    version: 'v1.2',
    snapshot: sampleBands,
    recordCount: sampleBands.length,
  },
  {
    type: 'course',
    name: '课程安排_第18周.xlsx',
    source: '教学管理系统',
    version: 'v2.1',
    snapshot: sampleCourses,
    recordCount: sampleCourses.length,
  },
];

export function createSampleRooms(sourceId: string, version: string): Room[] {
  return sampleRooms.map(room => ({
    ...room,
    id: generateId(),
    sourceId,
    version,
  }));
}

export function createSampleBands(sourceId: string, version: string): Band[] {
  return sampleBands.map(band => ({
    ...band,
    id: generateId(),
    sourceId,
    version,
  }));
}

export function createSampleCourses(sourceId: string, version: string): Course[] {
  return sampleCourses.map(course => ({
    ...course,
    id: generateId(),
    sourceId,
    version,
  }));
}

export function createSampleTeacherLeaves(): TeacherLeave[] {
  return sampleTeacherLeaves.map(leave => ({
    ...leave,
    id: generateId(),
  }));
}

export const equipmentNames: Record<string, string> = {
  '架子鼓': '架子鼓',
  '电钢琴': '电钢琴',
  '吉他音箱': '吉他音箱',
  '贝斯音箱': '贝斯音箱',
  '麦克风架': '麦克风架',
  '调音台': '调音台',
  '监听音箱': '监听音箱',
  '钢琴': '钢琴',
  '指挥台': '指挥台',
  '谱架': '谱架',
};

export const conflictTypeNames: Record<string, string> = {
  equipment: '设备不匹配',
  teacher_leave: '老师请假',
  overday: '跨天预约',
  overlap: '时间重叠',
};

export const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
