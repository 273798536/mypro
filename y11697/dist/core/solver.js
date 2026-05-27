"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleSolver = void 0;
const uuid_1 = require("uuid");
const validator_1 = require("./validator");
const date_1 = require("../utils/date");
const date_fns_1 = require("date-fns");
class ScheduleSolver {
    constructor(doctors, departments, leaveRequests, shiftRequirements, fatigueRules, lockedShifts = [], options) {
        this.doctors = doctors;
        this.departments = departments;
        this.leaveRequests = leaveRequests;
        this.shiftRequirements = shiftRequirements;
        this.fatigueRules = fatigueRules;
        this.lockedShifts = lockedShifts;
        this.validator = new validator_1.ScheduleValidator(doctors, departments, leaveRequests, shiftRequirements, fatigueRules, lockedShifts);
        this.options = {
            maxIterations: options?.maxIterations || 1000,
            tolerance: options?.tolerance || 0.01,
            prioritizeCoverage: options?.prioritizeCoverage ?? true,
            allowSoftViolations: options?.allowSoftViolations ?? true,
        };
    }
    solve(startDate, endDate, name = '排班方案') {
        const dates = (0, date_1.getDateRange)(startDate, endDate);
        let entries = this.initializeEntries(dates);
        entries = this.applyLockedShifts(entries);
        let bestEntries = [...entries];
        let bestScore = this.calculateScore(entries, startDate, endDate);
        let bestViolations = this.validator.validate(entries, startDate, endDate);
        let iteration = 0;
        let noImprovementCount = 0;
        const maxNoImprovement = 50;
        while (iteration < this.options.maxIterations && noImprovementCount < maxNoImprovement) {
            const newEntries = this.generateNeighbor(entries, dates);
            const newScore = this.calculateScore(newEntries, startDate, endDate);
            const newViolations = this.validator.validate(newEntries, startDate, endDate);
            const hardViolations = newViolations.filter(v => v.severity === 'error').length;
            const bestHardViolations = bestViolations.filter(v => v.severity === 'error').length;
            if (this.options.prioritizeCoverage) {
                if (hardViolations < bestHardViolations ||
                    (hardViolations === bestHardViolations && newScore.totalScore > bestScore.totalScore + this.options.tolerance)) {
                    bestEntries = [...newEntries];
                    bestScore = newScore;
                    bestViolations = newViolations;
                    entries = [...newEntries];
                    noImprovementCount = 0;
                }
                else {
                    noImprovementCount++;
                }
            }
            else {
                if (newScore.totalScore > bestScore.totalScore + this.options.tolerance) {
                    bestEntries = [...newEntries];
                    bestScore = newScore;
                    bestViolations = newViolations;
                    entries = [...newEntries];
                    noImprovementCount = 0;
                }
                else {
                    noImprovementCount++;
                }
            }
            iteration++;
        }
        const now = new Date().toISOString();
        return {
            id: (0, uuid_1.v4)(),
            version: 1,
            name,
            startDate,
            endDate,
            entries: bestEntries,
            violations: bestViolations,
            score: bestScore,
            createdAt: now,
            updatedAt: now,
            source: 'solver',
            auditTrail: [
                {
                    timestamp: now,
                    action: 'schedule_created',
                    changes: [{ field: 'entries', newValue: bestEntries.length }],
                    source: 'solver',
                },
            ],
        };
    }
    initializeEntries(dates) {
        const entries = [];
        for (const doctor of this.doctors) {
            for (const date of dates) {
                entries.push({
                    doctorId: doctor.id,
                    date,
                    shiftType: 'off',
                    departmentId: '',
                    isLocked: false,
                    source: 'initialization',
                });
            }
        }
        return entries;
    }
    applyLockedShifts(entries) {
        const newEntries = [...entries];
        for (const locked of this.lockedShifts) {
            const index = newEntries.findIndex(e => e.doctorId === locked.doctorId && e.date === locked.date);
            if (index !== -1) {
                const dept = this.departments.find(d => d.requiredSkills.length > 0);
                newEntries[index] = {
                    ...newEntries[index],
                    shiftType: locked.shiftType,
                    departmentId: locked.shiftType !== 'off' ? (newEntries[index].departmentId || dept?.id || '') : '',
                    isLocked: true,
                    source: locked.source,
                };
            }
        }
        return newEntries;
    }
    generateNeighbor(entries, dates) {
        const newEntries = [...entries];
        const requirements = this.getRandomRequirement();
        if (!requirements)
            return newEntries;
        const { date, shiftType, departmentId } = requirements;
        const availableDoctors = this.getAvailableDoctors(entries, date, shiftType, departmentId);
        if (availableDoctors.length === 0)
            return newEntries;
        const randomDoctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];
        const currentEntryIndex = newEntries.findIndex(e => e.doctorId === randomDoctor.id && e.date === date);
        if (currentEntryIndex !== -1 && !newEntries[currentEntryIndex].isLocked) {
            newEntries[currentEntryIndex] = {
                ...newEntries[currentEntryIndex],
                shiftType,
                departmentId,
                isLocked: false,
                assignedAt: new Date().toISOString(),
                source: 'solver_assignment',
            };
        }
        this.ensureDepartmentCoverage(newEntries, date, shiftType, departmentId, requirements.requiredDoctors);
        return newEntries;
    }
    getRandomRequirement() {
        if (this.shiftRequirements.length === 0)
            return null;
        return this.shiftRequirements[Math.floor(Math.random() * this.shiftRequirements.length)];
    }
    getAvailableDoctors(entries, date, shiftType, departmentId) {
        return this.doctors.filter(doctor => {
            const isOnLeave = this.leaveRequests.some(leave => leave.doctorId === doctor.id && (0, date_1.isDateInRange)(date, leave.startDate, leave.endDate));
            if (isOnLeave)
                return false;
            const isInDepartment = doctor.departments.includes(departmentId);
            if (!isInDepartment && this.options.prioritizeCoverage)
                return false;
            const currentShift = entries.find(e => e.doctorId === doctor.id && e.date === date && e.shiftType !== 'off');
            if (currentShift?.isLocked)
                return false;
            if ((0, date_1.isNightShift)(shiftType)) {
                const consecutiveNights = this.countConsecutiveNights(entries, doctor.id, date);
                if (consecutiveNights >= this.fatigueRules.maxConsecutiveNights)
                    return false;
            }
            const consecutiveShifts = this.countConsecutiveShifts(entries, doctor.id, date);
            if (consecutiveShifts >= this.fatigueRules.maxConsecutiveShifts)
                return false;
            return true;
        });
    }
    countConsecutiveNights(entries, doctorId, date) {
        const nightDates = entries
            .filter(e => e.doctorId === doctorId && (0, date_1.isNightShift)(e.shiftType))
            .map(e => e.date)
            .sort();
        let count = 0;
        let checkDate = (0, date_1.parseDate)(date);
        for (let i = 1; i <= this.fatigueRules.maxConsecutiveNights; i++) {
            const prevDate = this.formatDate((0, date_fns_1.addDays)(checkDate, -i));
            if (nightDates.includes(prevDate)) {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }
    countConsecutiveShifts(entries, doctorId, date) {
        const workDates = [
            ...new Set(entries
                .filter(e => e.doctorId === doctorId && e.shiftType !== 'off')
                .map(e => e.date)),
        ].sort();
        let count = 0;
        let checkDate = (0, date_1.parseDate)(date);
        for (let i = 1; i <= this.fatigueRules.maxConsecutiveShifts; i++) {
            const prevDate = this.formatDate((0, date_fns_1.addDays)(checkDate, -i));
            if (workDates.includes(prevDate)) {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }
    ensureDepartmentCoverage(entries, date, shiftType, departmentId, required) {
        const currentAssignments = entries.filter(e => e.date === date &&
            e.shiftType === shiftType &&
            e.departmentId === departmentId &&
            e.shiftType !== 'off');
        while (currentAssignments.length < required) {
            const availableDoctors = this.getAvailableDoctors(entries, date, shiftType, departmentId);
            if (availableDoctors.length === 0)
                break;
            const doctor = availableDoctors[Math.floor(Math.random() * availableDoctors.length)];
            const index = entries.findIndex(e => e.doctorId === doctor.id && e.date === date);
            if (index !== -1 && !entries[index].isLocked) {
                entries[index] = {
                    ...entries[index],
                    shiftType,
                    departmentId,
                    isLocked: false,
                    assignedAt: new Date().toISOString(),
                    source: 'solver_assignment',
                };
                currentAssignments.push(entries[index]);
            }
            else {
                break;
            }
        }
    }
    calculateScore(entries, startDate, endDate) {
        const violations = this.validator.validate(entries, startDate, endDate);
        const hardViolations = violations.filter(v => v.severity === 'error').length;
        const softViolations = violations.filter(v => v.severity === 'warning').length;
        const coverageBreakdown = this.calculateCoverageScore(entries);
        const fatigueBreakdown = this.calculateFatigueScore(entries, startDate, endDate);
        const preferenceBreakdown = this.calculatePreferenceScore(entries);
        const coverageScore = coverageBreakdown.score;
        const fatigueScore = fatigueBreakdown.score;
        const preferenceScore = preferenceBreakdown.score;
        const coverageWeight = 0.5;
        const fatigueWeight = 0.3;
        const preferenceWeight = 0.2;
        const totalScore = coverageScore * coverageWeight +
            fatigueScore * fatigueWeight +
            preferenceScore * preferenceWeight -
            hardViolations * 100 -
            softViolations * 10;
        return {
            totalScore: Math.max(0, totalScore),
            coverageScore,
            fatigueScore,
            preferenceScore,
            breakdown: [
                { ...coverageBreakdown, weight: coverageWeight },
                { ...fatigueBreakdown, weight: fatigueWeight },
                { ...preferenceBreakdown, weight: preferenceWeight },
            ],
        };
    }
    calculateCoverageScore(entries) {
        let covered = 0;
        let total = 0;
        const items = [];
        for (const req of this.shiftRequirements) {
            total += req.requiredDoctors;
            const matching = entries.filter(e => e.date === req.date &&
                e.shiftType === req.shiftType &&
                e.departmentId === req.departmentId &&
                e.shiftType !== 'off');
            const actualCovered = Math.min(matching.length, req.requiredDoctors);
            covered += actualCovered;
            if (matching.length >= req.requiredDoctors) {
                items.push({
                    description: `${req.date} ${req.shiftType} ${req.departmentId}: 满员`,
                    points: req.requiredDoctors,
                });
            }
        }
        const score = total > 0 ? (covered / total) * 100 : 100;
        return {
            category: '科室覆盖',
            score,
            maxScore: 100,
            items,
        };
    }
    calculateFatigueScore(entries, startDate, endDate) {
        const items = [];
        let goodFatigueCount = 0;
        let totalDoctors = this.doctors.length;
        for (const doctor of this.doctors) {
            const doctorEntries = entries.filter(e => e.doctorId === doctor.id);
            const weeklyHours = this.calculateWeeklyHours(doctorEntries);
            let doctorGood = true;
            for (const [week, hours] of weeklyHours) {
                const limit = doctor.maxWeeklyHours || this.fatigueRules.weeklyHourLimit;
                if (hours <= limit) {
                    items.push({
                        description: `${doctor.name} ${week}: ${hours}小时 (≤${limit}小时)`,
                        points: 1,
                    });
                }
                else {
                    doctorGood = false;
                }
            }
            if (doctorGood) {
                goodFatigueCount++;
            }
        }
        const score = totalDoctors > 0 ? (goodFatigueCount / totalDoctors) * 100 : 100;
        return {
            category: '疲劳管理',
            score,
            maxScore: 100,
            items,
        };
    }
    calculatePreferenceScore(entries) {
        const items = [];
        let preferredCount = 0;
        let totalWorkShifts = 0;
        for (const doctor of this.doctors) {
            if (!doctor.preferences)
                continue;
            const doctorEntries = entries.filter(e => e.doctorId === doctor.id && e.shiftType !== 'off');
            for (const entry of doctorEntries) {
                totalWorkShifts++;
                const isPreferred = doctor.preferences?.preferredShifts?.includes(entry.shiftType);
                const isAvoided = doctor.preferences?.avoidedShifts?.includes(entry.shiftType);
                if (isPreferred) {
                    preferredCount++;
                    items.push({
                        description: `${doctor.name} ${entry.date}: ${entry.shiftType} (偏好)`,
                        points: 2,
                    });
                }
                else if (!isAvoided) {
                    preferredCount += 0.5;
                }
            }
        }
        const maxPossible = totalWorkShifts * 2;
        const score = maxPossible > 0 ? (preferredCount / maxPossible) * 100 : 100;
        return {
            category: '偏好满足',
            score,
            maxScore: 100,
            items,
        };
    }
    calculateWeeklyHours(entries) {
        const weekHours = new Map();
        for (const entry of entries) {
            const weekKey = this.getWeekKey(entry.date);
            const hours = (0, date_1.getShiftHours)(entry.shiftType);
            weekHours.set(weekKey, (weekHours.get(weekKey) || 0) + hours);
        }
        return weekHours;
    }
    getWeekKey(dateStr) {
        const date = (0, date_1.parseDate)(dateStr);
        const dayOfWeek = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return this.formatDate(monday);
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}
exports.ScheduleSolver = ScheduleSolver;
//# sourceMappingURL=solver.js.map