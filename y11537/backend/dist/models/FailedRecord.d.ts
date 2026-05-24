import { Model, Optional } from 'sequelize';
import { DataSource, RetryCategory } from './types';
interface FailedRecordAttributes {
    id: number;
    failureNo: string;
    source: DataSource;
    recordType: string;
    recordId?: number;
    recordNo?: string;
    queueId?: number;
    queueNo?: string;
    retryCategory: RetryCategory;
    errorCode?: string;
    errorMessage: string;
    errorDetail?: string;
    originalData?: any;
    validationErrors?: any;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: number;
    resolutionMethod?: string;
    resolutionRemark?: string;
    affectedReportFields?: string[];
    excludedFromReport: boolean;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
interface FailedRecordCreationAttributes extends Optional<FailedRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isResolved' | 'excludedFromReport'> {
}
declare class FailedRecord extends Model<FailedRecordAttributes, FailedRecordCreationAttributes> implements FailedRecordAttributes {
    id: number;
    failureNo: string;
    source: DataSource;
    recordType: string;
    recordId?: number;
    recordNo?: string;
    queueId?: number;
    queueNo?: string;
    retryCategory: RetryCategory;
    errorCode?: string;
    errorMessage: string;
    errorDetail?: string;
    originalData?: any;
    validationErrors?: any;
    isResolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: number;
    resolutionMethod?: string;
    resolutionRemark?: string;
    affectedReportFields?: string[];
    excludedFromReport: boolean;
    createdBy?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default FailedRecord;
