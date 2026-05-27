import { Doctor, Department, LeaveRequest, ShiftRequirement, FatigueRules, ScheduleEntry, Violation, LockedShift } from '../types';
export declare class ScheduleValidator {
    private doctors;
    private departments;
    private leaveRequests;
    private shiftRequirements;
    private fatigueRules;
    private lockedShifts;
    constructor(doctors: Doctor[], departments: Department[], leaveRequests: LeaveRequest[], shiftRequirements: ShiftRequirement[], fatigueRules: FatigueRules, lockedShifts?: LockedShift[]);
    validate(entries: ScheduleEntry[], startDate: string, endDate: string): Violation[];
    private checkLeaveConflicts;
    private checkDepartmentCoverage;
    private checkConsecutiveNights;
    private checkConsecutiveShifts;
    private checkWeeklyHours;
    private checkNightRecovery;
    private checkLockedShifts;
    private checkDoctorSkills;
    private getWeekKey;
    private formatDate;
    private getShiftTypeName;
}
