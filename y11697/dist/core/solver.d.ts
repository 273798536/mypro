import { Doctor, Department, LeaveRequest, ShiftRequirement, FatigueRules, ScheduleEntry, Schedule, ScheduleScore, SolverOptions, LockedShift } from '../types';
export declare class ScheduleSolver {
    private doctors;
    private departments;
    private leaveRequests;
    private shiftRequirements;
    private fatigueRules;
    private lockedShifts;
    private validator;
    private options;
    constructor(doctors: Doctor[], departments: Department[], leaveRequests: LeaveRequest[], shiftRequirements: ShiftRequirement[], fatigueRules: FatigueRules, lockedShifts?: LockedShift[], options?: Partial<SolverOptions>);
    solve(startDate: string, endDate: string, name?: string): Schedule;
    private initializeEntries;
    private applyLockedShifts;
    private generateNeighbor;
    private getRandomRequirement;
    private getAvailableDoctors;
    private countConsecutiveNights;
    private countConsecutiveShifts;
    private ensureDepartmentCoverage;
    calculateScore(entries: ScheduleEntry[], startDate: string, endDate: string): ScheduleScore;
    private calculateCoverageScore;
    private calculateFatigueScore;
    private calculatePreferenceScore;
    private calculateWeeklyHours;
    private getWeekKey;
    private formatDate;
}
