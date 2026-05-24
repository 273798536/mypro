import { SLARule, CompensationApproval, AssignmentConflict } from '../types';
export interface CheckResult {
    totalIssues: number;
    slaViolations: SLARule[];
    assignmentConflicts: AssignmentConflict[];
    pendingCompensations: CompensationApproval[];
    orphanedRecords: {
        type: string;
        id: string;
        ticketId: string;
    }[];
    dataInconsistencies: {
        type: string;
        ticketId: string;
        issue: string;
    }[];
}
export declare class CheckService {
    runAllChecks(): CheckResult;
    checkSLAViolations(): SLARule[];
    checkAssignmentConflicts(): AssignmentConflict[];
    private determineTimeoutResponsible;
    checkPendingCompensations(): CompensationApproval[];
    checkOrphanedRecords(): {
        type: string;
        id: string;
        ticketId: string;
    }[];
    checkDataInconsistencies(): {
        type: string;
        ticketId: string;
        issue: string;
    }[];
}
export declare const checkService: CheckService;
