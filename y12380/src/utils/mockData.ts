import type { Volunteer, Stage, TimeSlot, Position, ScheduleEntry, DataSource, ScheduleVersion } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const volunteerNames = [
  '张明', '李华', '王芳', '刘伟', '陈静',
  '杨帆', '赵磊', '周婷', '吴强', '郑雪',
  '孙浩', '马丽', '朱杰', '胡敏', '郭涛',
  '何琳', '罗勇', '梁欣', '宋晨', '唐悦'
];

const avatarColors = [
  '#6366F1', '#F97316', '#10B981', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#64748B'
];

export const mockVolunteers: Volunteer[] = volunteerNames.map((name, index) => ({
  id: `vol-${index + 1}`,
  name,
  avatar: avatarColors[index % avatarColors.length],
  phone: `138${String(10000000 + index).slice(-8)}`,
  skills: [
    ['观众引导', '安检'][index % 2],
    ['音响调试', '灯光控制', '后台协调', '艺人接待'][index % 4],
    ...(index % 3 === 0 ? ['医疗急救'] : [])
  ],
  mealBreak: {
    enabled: true,
    startTime: index % 2 === 0 ? '12:00' : '18:00',
    endTime: index % 2 === 0 ? '13:00' : '19:00'
  },
  hasCredential: index % 5 !== 0,
  credentialType: index % 5 !== 0 ? '正式证件' : undefined,
  status: 'active',
  notes: index % 4 === 0 ? '有大型活动经验' : undefined,
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-15T14:30:00Z'
}));

export const mockStages: Stage[] = [
  { id: 'stage-1', name: '主舞台', color: '#6366F1', order: 1, description: '主打乐队演出' },
  { id: 'stage-2', name: '电音舞台', color: '#F97316', order: 2, description: 'DJ 电子音乐' },
  { id: 'stage-3', name: '民谣舞台', color: '#10B981', order: 3, description: '民谣弹唱' },
  { id: 'stage-4', name: '嘻哈舞台', color: '#EF4444', order: 4, description: '说唱表演' }
];

const timeSlotsData = [
  { date: '2026-06-10', slots: ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00'] },
  { date: '2026-06-11', slots: ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00'] }
];

export const mockTimeSlots: TimeSlot[] = timeSlotsData.flatMap(({ date, slots }) =>
  mockStages.flatMap(stage =>
    slots.map((slot, idx) => {
      const [start, end] = slot.split('-');
      return {
        id: `ts-${stage.id}-${date}-${idx}`,
        stageId: stage.id,
        date,
        startTime: start,
        endTime: end,
        label: slot
      };
    })
  )
);

const positionNames = ['前台接待', '音响助理', '灯光助理', '后台协调', '艺人接待', '安全巡查', '医疗支援', '媒体对接'];

export const mockPositions: Position[] = mockTimeSlots.slice(0, 24).map(slot => ({
  id: `pos-${slot.id}`,
  name: positionNames[Math.floor(Math.random() * positionNames.length)],
  stageId: slot.stageId,
  timeSlotId: slot.id,
  requiredSkills: [['观众引导', '安检', '音响调试', '灯光控制'][Math.floor(Math.random() * 4)]],
  headcount: Math.floor(Math.random() * 3) + 1,
  description: '协助舞台工作'
}));

export const mockScheduleEntries: ScheduleEntry[] = [
  {
    id: 'entry-1',
    volunteerId: 'vol-1',
    positionId: 'pos-1',
    timeSlotId: 'ts-stage-1-2026-06-10-0',
    stageId: 'stage-1',
    status: 'scheduled',
    conflicts: [],
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'entry-2',
    volunteerId: 'vol-5',
    positionId: 'pos-2',
    timeSlotId: 'ts-stage-1-2026-06-10-2',
    stageId: 'stage-1',
    status: 'scheduled',
    conflicts: [{
      id: 'conflict-1',
      type: 'credential',
      severity: 'error',
      message: '志愿者证件缺失',
      affectedEntries: ['entry-2'],
      details: { volunteerId: 'vol-5', reason: '未领取工作证件' }
    }],
    createdAt: '2026-05-20T11:00:00Z',
    updatedAt: '2026-05-20T11:00:00Z'
  },
  {
    id: 'entry-3',
    volunteerId: 'vol-2',
    positionId: 'pos-3',
    timeSlotId: 'ts-stage-2-2026-06-10-1',
    stageId: 'stage-2',
    status: 'scheduled',
    conflicts: [{
      id: 'conflict-2',
      type: 'mealBreak',
      severity: 'warning',
      message: '排班时段与餐休时间冲突',
      affectedEntries: ['entry-3'],
      details: { volunteerId: 'vol-2', scheduledTime: '12:00-14:00', mealTime: '12:00-13:00' }
    }],
    createdAt: '2026-05-20T12:00:00Z',
    updatedAt: '2026-05-20T12:00:00Z'
  }
];

export const mockDataSources: DataSource[] = [
  {
    id: 'ds-1',
    type: 'volunteers',
    name: '志愿者名单 V1',
    version: '1.0',
    timestamp: '2026-05-01T10:00:00Z',
    source: '邮箱导入 - 志愿者招募组',
    recordCount: 20
  },
  {
    id: 'ds-2',
    type: 'positions',
    name: '岗位需求 V2',
    version: '2.0',
    timestamp: '2026-05-10T14:30:00Z',
    source: 'Excel 导入 - 舞台总监',
    recordCount: 24
  },
  {
    id: 'ds-3',
    type: 'stages',
    name: '舞台配置 Final',
    version: 'final',
    timestamp: '2026-05-15T09:00:00Z',
    source: '系统配置',
    recordCount: 4
  }
];

export const mockVersions: ScheduleVersion[] = [
  {
    id: 'ver-1',
    name: '初始排班版本',
    timestamp: '2026-05-20T10:00:00Z',
    snapshot: {
      volunteers: mockVolunteers.slice(0, 10),
      entries: mockScheduleEntries.slice(0, 1)
    },
    changes: [{
      type: 'add',
      entityType: 'entry',
      entityId: 'entry-1',
      newValue: { volunteerId: 'vol-1', positionId: 'pos-1' },
      timestamp: '2026-05-20T10:00:00Z'
    }],
    createdBy: '系统管理员'
  },
  {
    id: 'ver-2',
    name: '调整后版本',
    timestamp: '2026-05-21T15:30:00Z',
    snapshot: {
      volunteers: mockVolunteers,
      entries: mockScheduleEntries
    },
    changes: [
      {
        type: 'add',
        entityType: 'entry',
        entityId: 'entry-2',
        newValue: { volunteerId: 'vol-5', positionId: 'pos-2' },
        timestamp: '2026-05-21T14:00:00Z'
      },
      {
        type: 'add',
        entityType: 'entry',
        entityId: 'entry-3',
        newValue: { volunteerId: 'vol-2', positionId: 'pos-3' },
        timestamp: '2026-05-21T15:00:00Z'
      }
    ],
    createdBy: '活动统筹'
  }
];

export { generateId };
