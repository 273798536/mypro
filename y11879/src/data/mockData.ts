import { Athlete, Event, Score, TieBreakRule, Appeal } from '../types';

export const mockAthletes: Athlete[] = [
  { id: 'a1', name: '张三', grade: '初三', className: '1班' },
  { id: 'a2', name: '李四', grade: '初三', className: '2班' },
  { id: 'a3', name: '王五', grade: '初三', className: '1班' },
  { id: 'a4', name: '赵六', grade: '初二', className: '3班' },
  { id: 'a5', name: '钱七', grade: '初三', className: '2班' },
  { id: 'a6', name: '孙八', grade: '初二', className: '1班' },
  { id: 'a7', name: '周九', grade: '初三', className: '3班' },
  { id: 'a8', name: '吴十', grade: '初二', className: '2班' },
];

export const mockEvents: Event[] = [
  { id: 'e1', name: '100米短跑', type: 'track', weight: 1.2, unit: '秒' },
  { id: 'e2', name: '跳远', type: 'field', weight: 1.0, unit: '米' },
  { id: 'e3', name: '铅球', type: 'field', weight: 1.0, unit: '米' },
  { id: 'e4', name: '800米长跑', type: 'track', weight: 1.3, unit: '分秒' },
  { id: 'e5', name: '跳高', type: 'field', weight: 1.1, unit: '米' },
];

export const mockScores: Score[] = [
  { id: 's1', athleteId: 'a1', eventId: 'e1', value: 95, status: 'normal' },
  { id: 's2', athleteId: 'a1', eventId: 'e2', value: 88, status: 'normal' },
  { id: 's3', athleteId: 'a1', eventId: 'e3', value: 90, status: 'normal' },
  { id: 's4', athleteId: 'a1', eventId: 'e4', value: 92, status: 'normal' },
  { id: 's5', athleteId: 'a1', eventId: 'e5', value: 85, status: 'normal' },

  { id: 's6', athleteId: 'a2', eventId: 'e1', value: 95, status: 'normal' },
  { id: 's7', athleteId: 'a2', eventId: 'e2', value: 90, status: 'normal' },
  { id: 's8', athleteId: 'a2', eventId: 'e3', value: 88, status: 'normal' },
  { id: 's9', athleteId: 'a2', eventId: 'e4', value: 90, status: 'normal' },
  { id: 's10', athleteId: 'a2', eventId: 'e5', value: 87, status: 'normal' },

  { id: 's11', athleteId: 'a3', eventId: 'e1', value: 95, status: 'normal' },
  { id: 's12', athleteId: 'a3', eventId: 'e2', value: 88, status: 'normal' },
  { id: 's13', athleteId: 'a3', eventId: 'e3', value: 90, status: 'normal' },
  { id: 's14', athleteId: 'a3', eventId: 'e4', value: 92, status: 'normal' },
  { id: 's15', athleteId: 'a3', eventId: 'e5', value: 85, status: 'appeal', remark: '成绩有争议' },

  { id: 's16', athleteId: 'a4', eventId: 'e1', value: 88, status: 'normal' },
  { id: 's17', athleteId: 'a4', eventId: 'e2', value: 92, status: 'normal' },
  { id: 's18', athleteId: 'a4', eventId: 'e3', value: 85, status: 'normal' },
  { id: 's19', athleteId: 'a4', eventId: 'e4', value: 95, status: 'normal' },
  { id: 's20', athleteId: 'a4', eventId: 'e5', value: 90, status: 'normal' },

  { id: 's21', athleteId: 'a5', eventId: 'e1', value: 0, status: 'forfeit', remark: '因伤弃权' },
  { id: 's22', athleteId: 'a5', eventId: 'e2', value: 85, status: 'normal' },
  { id: 's23', athleteId: 'a5', eventId: 'e3', value: 88, status: 'normal' },
  { id: 's24', athleteId: 'a5', eventId: 'e4', value: 90, status: 'normal' },
  { id: 's25', athleteId: 'a5', eventId: 'e5', value: 92, status: 'normal' },

  { id: 's26', athleteId: 'a6', eventId: 'e1', value: 85, status: 'normal' },
  { id: 's27', athleteId: 'a6', eventId: 'e2', value: 90, status: 'normal' },
  { id: 's28', athleteId: 'a6', eventId: 'e3', value: 92, status: 'normal' },
  { id: 's29', athleteId: 'a6', eventId: 'e4', value: 88, status: 'normal' },
  { id: 's30', athleteId: 'a6', eventId: 'e5', value: 95, status: 'normal' },

  { id: 's31', athleteId: 'a7', eventId: 'e1', value: 90, status: 'normal' },
  { id: 's32', athleteId: 'a7', eventId: 'e2', value: 85, status: 'normal' },
  { id: 's33', athleteId: 'a7', eventId: 'e3', value: 95, status: 'normal' },
  { id: 's34', athleteId: 'a7', eventId: 'e4', value: 87, status: 'normal' },
  { id: 's35', athleteId: 'a7', eventId: 'e5', value: 88, status: 'normal' },

  { id: 's36', athleteId: 'a8', eventId: 'e1', value: 87, status: 'normal' },
  { id: 's37', athleteId: 'a8', eventId: 'e2', value: 93, status: 'normal' },
  { id: 's38', athleteId: 'a8', eventId: 'e3', value: 86, status: 'normal' },
  { id: 's39', athleteId: 'a8', eventId: 'e4', value: 91, status: 'normal' },
  { id: 's40', athleteId: 'a8', eventId: 'e5', value: 89, status: 'normal' },
];

export const mockRules: TieBreakRule[] = [
  {
    id: 'r1',
    name: '最高单项成绩',
    description: '比较所有项目中的最高单项得分，得分高者排名靠前',
    type: 'highest_single',
    priority: 1,
    enabled: true,
  },
  {
    id: 'r2',
    name: '获第一名次数',
    description: '统计各选手在单项中获得第一名的次数，次数多者排名靠前',
    type: 'most_first',
    priority: 2,
    enabled: true,
  },
  {
    id: 'r3',
    name: '次高单项成绩',
    description: '比较所有项目中的次高单项得分，得分高者排名靠前',
    type: 'best_second',
    priority: 3,
    enabled: true,
  },
  {
    id: 'r4',
    name: '第三高单项成绩',
    description: '比较所有项目中的第三高单项得分，得分高者排名靠前',
    type: 'best_third',
    priority: 4,
    enabled: true,
  },
];

export const mockAppeals: Appeal[] = [
  {
    id: 'ap1',
    athleteId: 'a3',
    eventId: 'e5',
    reason: '跳高成绩测量有误，实际高度应为1.75米',
    status: 'pending',
  },
];
