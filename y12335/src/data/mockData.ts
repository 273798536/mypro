import type { Skill, Volunteer, Position, Shift, LeaveRecord } from '@/types';

import type { DataSource } from '@/types';

const SYSTEM_SOURCE: DataSource = {
  type: 'system',
  filename: 'volunteers_sample.csv',
  importTimestamp: '2026-06-01 09:00:00',
  rowIndex: 0,
};

export const SKILLS: Skill[] = [
  { id: 'sk_sign', name: '签到引导', category: '服务', source: { ...SYSTEM_SOURCE, rowIndex: 1 } },
  { id: 'sk_guide', name: '场馆引导', category: '服务', source: { ...SYSTEM_SOURCE, rowIndex: 2 } },
  { id: 'sk_security', name: '安保巡查', category: '安保', source: { ...SYSTEM_SOURCE, rowIndex: 3 } },
  { id: 'sk_medical', name: '医疗急救', category: '医疗', source: { ...SYSTEM_SOURCE, rowIndex: 4 } },
  { id: 'sk_translate', name: '翻译', category: '语言', source: { ...SYSTEM_SOURCE, rowIndex: 5 } },
  { id: 'sk_tech', name: '技术支持', category: '技术', source: { ...SYSTEM_SOURCE, rowIndex: 6 } },
  { id: 'sk_photo', name: '摄影记录', category: '宣传', source: { ...SYSTEM_SOURCE, rowIndex: 7 } },
];

export const VOLUNTEERS: Volunteer[] = [
  { id: 'v_zhangwei', name: '张伟', skillIds: ['sk_sign', 'sk_guide'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 1 } },
  { id: 'v_lina', name: '李娜', skillIds: ['sk_translate'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 2 } },
  { id: 'v_wangfang', name: '王芳', skillIds: ['sk_sign', 'sk_guide', 'sk_medical'], leaveSlots: ['sat_am', 'sat_pm'], source: { ...SYSTEM_SOURCE, rowIndex: 3 } },
  { id: 'v_liuyang', name: '刘洋', skillIds: ['sk_security', 'sk_guide'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 4 } },
  { id: 'v_chenming', name: '陈明', skillIds: ['sk_security'], leaveSlots: ['sun_am'], source: { ...SYSTEM_SOURCE, rowIndex: 5 } },
  { id: 'v_zhaoli', name: '赵丽', skillIds: ['sk_tech', 'sk_photo'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 6 } },
  { id: 'v_sunqiang', name: '孙强', skillIds: ['sk_security', 'sk_medical'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 7 } },
  { id: 'v_zhoujie', name: '周杰', skillIds: ['sk_sign', 'sk_photo'], leaveSlots: ['sat_pm'], source: { ...SYSTEM_SOURCE, rowIndex: 8 } },
  { id: 'v_wumin', name: '吴敏', skillIds: ['sk_translate', 'sk_guide'], leaveSlots: [], source: { ...SYSTEM_SOURCE, rowIndex: 9 } },
  { id: 'v_huangxin', name: '黄鑫', skillIds: ['sk_tech'], leaveSlots: ['sun_pm'], source: { ...SYSTEM_SOURCE, rowIndex: 10 } },
];

export const POSITIONS: Position[] = [
  { id: 'pos_signin', name: '签到岗', requiredSkillIds: ['sk_sign'], headcount: 3, source: { ...SYSTEM_SOURCE, rowIndex: 1 } },
  { id: 'pos_guide', name: '引导岗', requiredSkillIds: ['sk_guide'], headcount: 4, source: { ...SYSTEM_SOURCE, rowIndex: 2 } },
  { id: 'pos_security', name: '安保岗', requiredSkillIds: ['sk_security'], headcount: 5, source: { ...SYSTEM_SOURCE, rowIndex: 3 } },
  { id: 'pos_medical', name: '医疗岗', requiredSkillIds: ['sk_medical'], headcount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 4 } },
  { id: 'pos_translate', name: '翻译岗', requiredSkillIds: ['sk_translate'], headcount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 5 } },
  { id: 'pos_tech', name: '技术岗', requiredSkillIds: ['sk_tech'], headcount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 6 } },
];

export const SHIFTS: Shift[] = [
  { id: 'sh_sign_sat_am', positionId: 'pos_signin', timeSlot: 'sat_am', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 1 } },
  { id: 'sh_sign_sat_pm', positionId: 'pos_signin', timeSlot: 'sat_pm', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 2 } },
  { id: 'sh_sign_sun_am', positionId: 'pos_signin', timeSlot: 'sun_am', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 3 } },
  { id: 'sh_sign_sun_pm', positionId: 'pos_signin', timeSlot: 'sun_pm', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 4 } },
  { id: 'sh_guide_sat_am', positionId: 'pos_guide', timeSlot: 'sat_am', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 5 } },
  { id: 'sh_guide_sat_pm', positionId: 'pos_guide', timeSlot: 'sat_pm', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 6 } },
  { id: 'sh_guide_sun_am', positionId: 'pos_guide', timeSlot: 'sun_am', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 7 } },
  { id: 'sh_guide_sun_pm', positionId: 'pos_guide', timeSlot: 'sun_pm', requiredCount: 2, source: { ...SYSTEM_SOURCE, rowIndex: 8 } },
  { id: 'sh_sec_sat_am', positionId: 'pos_security', timeSlot: 'sat_am', requiredCount: 3, source: { ...SYSTEM_SOURCE, rowIndex: 9 } },
  { id: 'sh_sec_sat_pm', positionId: 'pos_security', timeSlot: 'sat_pm', requiredCount: 3, source: { ...SYSTEM_SOURCE, rowIndex: 10 } },
  { id: 'sh_sec_sun_am', positionId: 'pos_security', timeSlot: 'sun_am', requiredCount: 3, source: { ...SYSTEM_SOURCE, rowIndex: 11 } },
  { id: 'sh_sec_sun_pm', positionId: 'pos_security', timeSlot: 'sun_pm', requiredCount: 3, source: { ...SYSTEM_SOURCE, rowIndex: 12 } },
  { id: 'sh_med_sat_am', positionId: 'pos_medical', timeSlot: 'sat_am', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 13 } },
  { id: 'sh_med_sat_pm', positionId: 'pos_medical', timeSlot: 'sat_pm', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 14 } },
  { id: 'sh_med_sun_am', positionId: 'pos_medical', timeSlot: 'sun_am', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 15 } },
  { id: 'sh_med_sun_pm', positionId: 'pos_medical', timeSlot: 'sun_pm', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 16 } },
  { id: 'sh_tr_sat_am', positionId: 'pos_translate', timeSlot: 'sat_am', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 17 } },
  { id: 'sh_tr_sat_pm', positionId: 'pos_translate', timeSlot: 'sat_pm', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 18 } },
  { id: 'sh_tech_sat_am', positionId: 'pos_tech', timeSlot: 'sat_am', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 19 } },
  { id: 'sh_tech_sat_pm', positionId: 'pos_tech', timeSlot: 'sat_pm', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 20 } },
  { id: 'sh_tech_sun_am', positionId: 'pos_tech', timeSlot: 'sun_am', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 21 } },
  { id: 'sh_tech_sun_pm', positionId: 'pos_tech', timeSlot: 'sun_pm', requiredCount: 1, source: { ...SYSTEM_SOURCE, rowIndex: 22 } },
];

export const LEAVE_RECORDS: LeaveRecord[] = [
  { id: 'lr_1', volunteerId: 'v_wangfang', timeSlot: 'sat_am', reason: '家中有事', source: { ...SYSTEM_SOURCE, rowIndex: 1 } },
  { id: 'lr_2', volunteerId: 'v_wangfang', timeSlot: 'sat_pm', reason: '家中有事', source: { ...SYSTEM_SOURCE, rowIndex: 2 } },
  { id: 'lr_3', volunteerId: 'v_chenming', timeSlot: 'sun_am', reason: '课程冲突', source: { ...SYSTEM_SOURCE, rowIndex: 3 } },
  { id: 'lr_4', volunteerId: 'v_zhoujie', timeSlot: 'sat_pm', reason: '临时请假', source: { ...SYSTEM_SOURCE, rowIndex: 4 } },
  { id: 'lr_5', volunteerId: 'v_huangxin', timeSlot: 'sun_pm', reason: '出差', source: { ...SYSTEM_SOURCE, rowIndex: 5 } },
];

export const TIME_SLOTS: { id: string; label: string }[] = [
  { id: 'sat_am', label: '周六上午' },
  { id: 'sat_pm', label: '周六下午' },
  { id: 'sun_am', label: '周日上午' },
  { id: 'sun_pm', label: '周日下午' },
];
