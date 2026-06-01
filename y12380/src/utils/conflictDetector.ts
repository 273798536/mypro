import type { Volunteer, Position, ScheduleEntry, TimeSlot, Conflict, ConflictType } from '../types';
import { generateId } from './mockData';

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isTimeOverlap = (
  start1: string, end1: string,
  start2: string, end2: string
): boolean => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

export const detectMealBreakConflicts = (
  volunteer: Volunteer,
  timeSlot: TimeSlot
): Conflict | null => {
  if (!volunteer.mealBreak.enabled) return null;

  if (isTimeOverlap(
    timeSlot.startTime, timeSlot.endTime,
    volunteer.mealBreak.startTime, volunteer.mealBreak.endTime
  )) {
    return {
      id: generateId(),
      type: 'mealBreak',
      severity: 'warning',
      message: `排班时段与餐休时间 (${volunteer.mealBreak.startTime}-${volunteer.mealBreak.endTime}) 冲突`,
      affectedEntries: [],
      details: {
        volunteerId: volunteer.id,
        volunteerName: volunteer.name,
        scheduledTime: `${timeSlot.startTime}-${timeSlot.endTime}`,
        mealTime: `${volunteer.mealBreak.startTime}-${volunteer.mealBreak.endTime}`
      }
    };
  }
  return null;
};

export const detectCredentialConflicts = (volunteer: Volunteer): Conflict | null => {
  if (!volunteer.hasCredential) {
    return {
      id: generateId(),
      type: 'credential',
      severity: 'error',
      message: '志愿者尚未领取工作证件',
      affectedEntries: [],
      details: {
        volunteerId: volunteer.id,
        volunteerName: volunteer.name,
        reason: '未领取工作证件'
      }
    };
  }
  return null;
};

export const detectSkillConflicts = (
  volunteer: Volunteer,
  position: Position
): Conflict | null => {
  const missingSkills = position.requiredSkills.filter(
    skill => !volunteer.skills.includes(skill)
  );

  if (missingSkills.length > 0) {
    return {
      id: generateId(),
      type: 'skill',
      severity: 'warning',
      message: `缺少所需技能: ${missingSkills.join(', ')}`,
      affectedEntries: [],
      details: {
        volunteerId: volunteer.id,
        volunteerName: volunteer.name,
        positionId: position.id,
        positionName: position.name,
        requiredSkills: position.requiredSkills,
        volunteerSkills: volunteer.skills,
        missingSkills
      }
    };
  }
  return null;
};

export const detectOverlapConflicts = (
  volunteer: Volunteer,
  newTimeSlot: TimeSlot,
  existingEntries: ScheduleEntry[],
  allTimeSlots: TimeSlot[]
): Conflict[] => {
  const conflicts: Conflict[] = [];
  const volunteerEntries = existingEntries.filter(e => e.volunteerId === volunteer.id);

  volunteerEntries.forEach(entry => {
    const entryTimeSlot = allTimeSlots.find(t => t.id === entry.timeSlotId);
    if (entryTimeSlot && entryTimeSlot.date === newTimeSlot.date) {
      if (isTimeOverlap(
        newTimeSlot.startTime, newTimeSlot.endTime,
        entryTimeSlot.startTime, entryTimeSlot.endTime
      )) {
        conflicts.push({
          id: generateId(),
          type: 'overlap',
          severity: 'error',
          message: `与已有排班 (${entryTimeSlot.label}) 时段重叠`,
          affectedEntries: [entry.id],
          details: {
            volunteerId: volunteer.id,
            volunteerName: volunteer.name,
            newTimeSlot: `${newTimeSlot.date} ${newTimeSlot.label}`,
            existingTimeSlot: `${entryTimeSlot.date} ${entryTimeSlot.label}`,
            existingEntryId: entry.id
          }
        });
      }
    }
  });

  return conflicts;
};

export const detectHeadcountConflicts = (
  position: Position,
  currentEntries: ScheduleEntry[]
): Conflict | null => {
  const assignedCount = currentEntries.filter(
    e => e.positionId === position.id && e.status !== 'cancelled'
  ).length;

  if (assignedCount > position.headcount) {
    return {
      id: generateId(),
      type: 'headcount',
      severity: 'error',
      message: `岗位人数超额: 已分配 ${assignedCount} 人，需求 ${position.headcount} 人`,
      affectedEntries: currentEntries.filter(e => e.positionId === position.id).map(e => e.id),
      details: {
        positionId: position.id,
        positionName: position.name,
        headcount: position.headcount,
        assignedCount
      }
    };
  }
  return null;
};

export const detectAllConflictsForAssignment = (
  volunteer: Volunteer,
  position: Position,
  timeSlot: TimeSlot,
  allEntries: ScheduleEntry[],
  allTimeSlots: TimeSlot[]
): Conflict[] => {
  const conflicts: Conflict[] = [];

  const mealBreakConflict = detectMealBreakConflicts(volunteer, timeSlot);
  if (mealBreakConflict) conflicts.push(mealBreakConflict);

  const credentialConflict = detectCredentialConflicts(volunteer);
  if (credentialConflict) conflicts.push(credentialConflict);

  const skillConflict = detectSkillConflicts(volunteer, position);
  if (skillConflict) conflicts.push(skillConflict);

  const overlapConflicts = detectOverlapConflicts(volunteer, timeSlot, allEntries, allTimeSlots);
  conflicts.push(...overlapConflicts);

  return conflicts;
};

export const generateConflictExplanation = (conflict: Conflict): string => {
  const typeLabels: Record<ConflictType, string> = {
    mealBreak: '餐休冲突',
    credential: '证件缺失',
    headcount: '岗位缺人',
    skill: '技能不匹配',
    overlap: '时段重叠'
  };

  let explanation = `【${typeLabels[conflict.type]}】${conflict.message}\n`;

  switch (conflict.type) {
    case 'mealBreak':
      explanation += `
影响说明：
- 志愿者在该时段需要用餐休息
- 可能导致志愿者无法全身心投入工作
- 建议调整排班时段或协调换班

处理建议：
1. 将该志愿者调整到非餐休时段
2. 安排其他志愿者替班
3. 与志愿者确认是否可调整餐休时间`;
      break;

    case 'credential':
      explanation += `
影响说明：
- 无证件志愿者无法进入工作区域
- 可能导致岗位空缺无人值守
- 存在安全管理风险

处理建议：
1. 立即通知志愿者领取证件
2. 安排有证件的志愿者替换
3. 如证件无法及时领取，从排班中移除`;
      break;

    case 'headcount':
      explanation += `
影响说明：
- 该岗位实际排班人数超出需求
- 造成人力资源浪费
- 可能影响其他岗位的人员配置

处理建议：
1. 减少该岗位的志愿者数量
2. 将多余人员调配到其他缺人岗位
3. 重新评估岗位需求数量`;
      break;

    case 'skill':
      explanation += `
影响说明：
- 志愿者可能无法胜任该岗位工作
- 可能影响工作质量和效率
- 需要额外培训或指导

处理建议：
1. 优先安排具备所需技能的志愿者
2. 如人员紧张，可安排有经验志愿者带教
3. 考虑降低该岗位技能要求`;
      break;

    case 'overlap':
      explanation += `
影响说明：
- 志愿者无法同时在两个岗位工作
- 造成排班冲突和实际缺勤
- 影响两个岗位的正常运作

处理建议：
1. 立即移除其中一个排班
2. 安排其他志愿者填补空缺
3. 检查志愿者排班表避免重复分配`;
      break;
  }

  return explanation;
};
