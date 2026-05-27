import {
  Doctor,
  Department,
  LeaveRequest,
  ShiftRequirement,
  FatigueRules,
  ScheduleEntry,
  Violation,
  LockedShift,
  ShiftType,
} from '../types';
import { isDateInRange, getShiftHours, isNightShift, getConsecutiveDays, parseDate, getDateRange } from '../utils/date';
import { differenceInDays, addDays } from 'date-fns';

export class ScheduleValidator {
  private doctors: Doctor[];
  private departments: Department[];
  private leaveRequests: LeaveRequest[];
  private shiftRequirements: ShiftRequirement[];
  private fatigueRules: FatigueRules;
  private lockedShifts: LockedShift[];

  constructor(
    doctors: Doctor[],
    departments: Department[],
    leaveRequests: LeaveRequest[],
    shiftRequirements: ShiftRequirement[],
    fatigueRules: FatigueRules,
    lockedShifts: LockedShift[] = []
  ) {
    this.doctors = doctors;
    this.departments = departments;
    this.leaveRequests = leaveRequests;
    this.shiftRequirements = shiftRequirements;
    this.fatigueRules = fatigueRules;
    this.lockedShifts = lockedShifts;
  }

  validate(entries: ScheduleEntry[], startDate: string, endDate: string): Violation[] {
    const violations: Violation[] = [];

    violations.push(...this.checkLeaveConflicts(entries));
    violations.push(...this.checkDepartmentCoverage(entries, startDate, endDate));
    violations.push(...this.checkConsecutiveNights(entries));
    violations.push(...this.checkConsecutiveShifts(entries));
    violations.push(...this.checkWeeklyHours(entries));
    violations.push(...this.checkNightRecovery(entries));
    violations.push(...this.checkLockedShifts(entries));
    violations.push(...this.checkDoctorSkills(entries));

    return violations;
  }

  private checkLeaveConflicts(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];

    for (const entry of entries) {
      if (entry.shiftType === 'off') continue;

      const conflictingLeave = this.leaveRequests.find(
        leave => leave.doctorId === entry.doctorId && isDateInRange(entry.date, leave.startDate, leave.endDate)
      );

      if (conflictingLeave) {
        const doctor = this.doctors.find(d => d.id === entry.doctorId);
        violations.push({
          type: 'leave_conflict',
          severity: 'error',
          doctorId: entry.doctorId,
          date: entry.date,
          shiftType: entry.shiftType,
          message: `${doctor?.name || entry.doctorId} 在 ${entry.date} 有请假（${conflictingLeave.type}），但被排了班`,
          details: {
            leaveId: conflictingLeave.id,
            leaveType: conflictingLeave.type,
            leaveStart: conflictingLeave.startDate,
            leaveEnd: conflictingLeave.endDate,
            reason: conflictingLeave.reason,
          },
          source: entry.source,
        });
      }
    }

    return violations;
  }

  private checkDepartmentCoverage(entries: ScheduleEntry[], startDate: string, endDate: string): Violation[] {
    const violations: Violation[] = [];
    const dates = getDateRange(startDate, endDate);

    for (const requirement of this.shiftRequirements) {
      const matchingEntries = entries.filter(
        e =>
          e.date === requirement.date &&
          e.shiftType === requirement.shiftType &&
          e.departmentId === requirement.departmentId &&
          e.shiftType !== 'off'
      );

      const assignedCount = matchingEntries.length;

      if (assignedCount < requirement.requiredDoctors) {
        const dept = this.departments.find(d => d.id === requirement.departmentId);
        const shortage = requirement.requiredDoctors - assignedCount;
        violations.push({
          type: 'department_coverage',
          severity: 'error',
          departmentId: requirement.departmentId,
          date: requirement.date,
          shiftType: requirement.shiftType,
          message: `${dept?.name || requirement.departmentId} ${requirement.date} ${this.getShiftTypeName(requirement.shiftType)} 缺 ${shortage} 人`,
          details: {
            required: requirement.requiredDoctors,
            assigned: assignedCount,
            shortage,
            assignedDoctors: matchingEntries.map(e => e.doctorId),
          },
          source: requirement.source,
        });
      }
    }

    return violations;
  }

  private checkConsecutiveNights(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];
    const maxNights = this.fatigueRules.maxConsecutiveNights;

    const doctorNightShifts = new Map<string, string[]>();
    for (const entry of entries) {
      if (isNightShift(entry.shiftType)) {
        if (!doctorNightShifts.has(entry.doctorId)) {
          doctorNightShifts.set(entry.doctorId, []);
        }
        doctorNightShifts.get(entry.doctorId)!.push(entry.date);
      }
    }

    for (const [doctorId, nightDates] of doctorNightShifts) {
      const sortedDates = [...nightDates].sort();
      const doctor = this.doctors.find(d => d.id === doctorId);

      let consecutiveCount = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = parseDate(sortedDates[i - 1]);
        const currDate = parseDate(sortedDates[i]);

        if (differenceInDays(currDate, prevDate) === 1) {
          consecutiveCount++;
          if (consecutiveCount > maxNights) {
            const startOfStreak = sortedDates[i - maxNights];
            violations.push({
              type: 'consecutive_nights',
              severity: 'error',
              doctorId,
              date: sortedDates[i],
              shiftType: 'night',
              message: `${doctor?.name || doctorId} 连续夜班超过 ${maxNights} 天（从 ${startOfStreak} 开始）`,
              details: {
                consecutiveCount,
                maxAllowed: maxNights,
                streakStart: startOfStreak,
                streakEnd: sortedDates[i],
              },
              source: 'fatigue_rules',
            });
            break;
          }
        } else {
          consecutiveCount = 1;
        }
      }
    }

    return violations;
  }

  private checkConsecutiveShifts(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];
    const maxShifts = this.fatigueRules.maxConsecutiveShifts;

    const doctorWorkDates = new Map<string, string[]>();
    for (const entry of entries) {
      if (entry.shiftType !== 'off') {
        if (!doctorWorkDates.has(entry.doctorId)) {
          doctorWorkDates.set(entry.doctorId, []);
        }
        doctorWorkDates.get(entry.doctorId)!.push(entry.date);
      }
    }

    for (const [doctorId, workDates] of doctorWorkDates) {
      const sortedDates = [...new Set(workDates)].sort();
      const doctor = this.doctors.find(d => d.id === doctorId);

      let consecutiveCount = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = parseDate(sortedDates[i - 1]);
        const currDate = parseDate(sortedDates[i]);

        if (differenceInDays(currDate, prevDate) === 1) {
          consecutiveCount++;
          if (consecutiveCount > maxShifts) {
            const startOfStreak = sortedDates[i - maxShifts];
            violations.push({
              type: 'consecutive_shifts',
              severity: 'warning',
              doctorId,
              date: sortedDates[i],
              message: `${doctor?.name || doctorId} 连续上班超过 ${maxShifts} 天（从 ${startOfStreak} 开始）`,
              details: {
                consecutiveCount,
                maxAllowed: maxShifts,
                streakStart: startOfStreak,
                streakEnd: sortedDates[i],
              },
              source: 'fatigue_rules',
            });
            break;
          }
        } else {
          consecutiveCount = 1;
        }
      }
    }

    return violations;
  }

  private checkWeeklyHours(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];

    const allDates = [...new Set(entries.map(e => e.date))].sort();
    if (allDates.length === 0) return violations;

    const doctor = this.doctors.find(d => d.id === entries[0]?.doctorId);

    const weekHours = new Map<string, number>();
    for (const entry of entries) {
      const weekKey = this.getWeekKey(entry.date);
      const hours = getShiftHours(entry.shiftType);
      weekHours.set(entry.doctorId, (weekHours.get(entry.doctorId) || 0) + hours);
    }

    for (const [doctorId, hours] of weekHours) {
      const doc = this.doctors.find(d => d.id === doctorId);
      const limit = doc?.maxWeeklyHours || this.fatigueRules.weeklyHourLimit;

      if (hours > limit) {
        violations.push({
          type: 'fatigue_hours',
          severity: 'warning',
          doctorId,
          message: `${doc?.name || doctorId} 本周工作 ${hours} 小时，超过限制 ${limit} 小时`,
          details: {
            hours,
            limit,
            overtime: hours - limit,
          },
          source: 'fatigue_rules',
        });
      }
    }

    return violations;
  }

  private checkNightRecovery(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];
    const recoveryDays = this.fatigueRules.nightShiftRecoveryDays;

    const nightShifts = entries.filter(e => isNightShift(e.shiftType));

    for (const nightShift of nightShifts) {
      const doctor = this.doctors.find(d => d.id === nightShift.doctorId);

      for (let i = 1; i <= recoveryDays; i++) {
        const recoveryDate = this.formatDate(addDays(parseDate(nightShift.date), i));
        const hasShift = entries.find(
          e => e.doctorId === nightShift.doctorId && e.date === recoveryDate && e.shiftType !== 'off'
        );

        if (hasShift) {
          violations.push({
            type: 'night_recovery',
            severity: 'warning',
            doctorId: nightShift.doctorId,
            date: recoveryDate,
            shiftType: hasShift.shiftType,
            message: `${doctor?.name || nightShift.doctorId} 夜班后第 ${i} 天（${recoveryDate}）没有足够休息`,
            details: {
              nightShiftDate: nightShift.date,
              recoveryDay: i,
              requiredRecoveryDays: recoveryDays,
            },
            source: 'fatigue_rules',
          });
        }
      }
    }

    return violations;
  }

  private checkLockedShifts(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];

    for (const locked of this.lockedShifts) {
      const matchingEntry = entries.find(
        e => e.doctorId === locked.doctorId && e.date === locked.date && e.shiftType === locked.shiftType
      );

      if (!matchingEntry) {
        const doctor = this.doctors.find(d => d.id === locked.doctorId);
        violations.push({
          type: 'leave_conflict',
          severity: 'error',
          doctorId: locked.doctorId,
          date: locked.date,
          shiftType: locked.shiftType,
          message: `锁定班次未满足：${doctor?.name || locked.doctorId} ${locked.date} ${this.getShiftTypeName(locked.shiftType)}`,
          details: {
            lockedBy: locked.lockedBy,
            lockedAt: locked.lockedAt,
            reason: locked.reason,
          },
          source: locked.source,
        });
      }
    }

    return violations;
  }

  private checkDoctorSkills(entries: ScheduleEntry[]): Violation[] {
    const violations: Violation[] = [];

    for (const entry of entries) {
      if (entry.shiftType === 'off') continue;

      const doctor = this.doctors.find(d => d.id === entry.doctorId);
      const dept = this.departments.find(d => d.id === entry.departmentId);

      if (doctor && dept) {
        const hasRequiredSkills = dept.requiredSkills.every(skill => doctor.skills.includes(skill));
        const isInDepartment = doctor.departments.includes(entry.departmentId);

        if (!isInDepartment) {
          violations.push({
            type: 'department_coverage',
            severity: 'warning',
            doctorId: entry.doctorId,
            departmentId: entry.departmentId,
            date: entry.date,
            shiftType: entry.shiftType,
            message: `${doctor.name} 不在 ${dept.name}，但被安排了该科室班次`,
            details: {
              doctorDepartments: doctor.departments,
              assignedDepartment: entry.departmentId,
            },
            source: entry.source,
          });
        }
      }
    }

    return violations;
  }

  private getWeekKey(dateStr: string): string {
    const date = parseDate(dateStr);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return this.formatDate(monday);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getShiftTypeName(shiftType: ShiftType): string {
    const names: Record<ShiftType, string> = {
      morning: '早班',
      afternoon: '午班',
      night: '夜班',
      off: '休息',
    };
    return names[shiftType] || shiftType;
  }
}
