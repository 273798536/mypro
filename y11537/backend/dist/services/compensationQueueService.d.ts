import { CompensationQueue } from '../models';
import { RetryCategory, DataSource, SigninType } from '../models/types';
interface AddToQueueParams {
    source: DataSource;
    sourceRecordId?: number;
    sourceRecordNo?: string;
    signinType: SigninType;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    signinTime?: Date;
    retryCategory: RetryCategory;
    errorMessage?: string;
    errorStack?: string;
    originalData?: any;
    isProxy?: boolean;
    proxyEmployeeId?: string;
    proxyEmployeeName?: string;
    maxRetryCount?: number;
    createdBy?: number;
    operatorName?: string;
    operatorRole?: string;
    ipAddress?: string;
}
export declare function addToCompensationQueue(params: AddToQueueParams): Promise<CompensationQueue>;
export declare function processQueueItem(queueId: number): Promise<void>;
export declare function manualTakeover(queueId: number, params: {
    correctedData?: any;
    handleRemark: string;
    handledBy: number;
    handledByName: string;
    handledByRole: string;
    ipAddress?: string;
}): Promise<CompensationQueue | null>;
export declare function compensateAndClose(queueId: number, params: {
    closeReason: string;
    closedBy: number;
    closedByName: string;
    closedByRole: string;
    ipAddress?: string;
}): Promise<CompensationQueue | null>;
export declare function closeQueueItem(queueId: number, params: {
    closeReason: string;
    closedBy: number;
    closedByName: string;
    closedByRole: string;
    ipAddress?: string;
}): Promise<CompensationQueue | null>;
export declare function getQueueStats(): Promise<{
    byStatus: {
        pending: number;
        processing: number;
        retrying: number;
        success: number;
        failed: number;
        deadLetter: number;
        manualReview: number;
        compensated: number;
        closed: number;
    };
    byCategory: {
        category: any;
        count: number;
    }[];
    totalAwaiting: number;
}>;
export {};
