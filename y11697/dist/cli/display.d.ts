import { Schedule, Violation, ScheduleScore, ScheduleComparison, Doctor } from '../types';
export declare function displayScheduleTable(schedule: Schedule, doctors: Doctor[]): void;
export declare function displayViolations(violations: Violation[]): void;
export declare function displayScore(score: ScheduleScore): void;
export declare function displayComparison(comparison: ScheduleComparison): void;
export declare function displayViolationDetails(violation: Violation): void;
