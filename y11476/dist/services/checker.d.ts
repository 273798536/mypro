import { InspectionDatabase } from '../db/database';
export interface CheckIssue {
    checkType: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: string;
    relatedRecordIds?: number[];
}
export declare class DataChecker {
    private db;
    constructor(db: InspectionDatabase);
    runChecks(batchId?: string): {
        totalRecords: number;
        passed: number;
        failed: number;
        warnings: number;
        issues: CheckIssue[];
    };
    private parseRecords;
    private checkBookingCancellationConflict;
    private checkCancellationWithoutConfirmation;
    private checkAccessForCancelledMeetings;
    private checkTeaBreakEquipmentForCancelled;
    private checkTimeConsistency;
    private checkOrphanRecords;
    private checkDuplicateRecords;
    private checkIndividualRecords;
}
