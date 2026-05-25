import { DataSource } from 'typeorm';
import { ChangeHistory } from '../entities/ChangeHistory';
import { ChangeAction, LedgerStatus } from '../types/enums';
import { FieldDiff } from '../utils/diff';
export declare class ChangeHistoryService {
    private dataSource;
    private repository;
    constructor(dataSource: DataSource);
    recordChange(ledgerId: string, action: ChangeAction, beforeData: Record<string, any> | null, afterData: Record<string, any>, options?: {
        fromStatus?: LedgerStatus;
        toStatus?: LedgerStatus;
        reason?: string;
        operatorId?: string;
        operatorName?: string;
        operatorRole?: string;
        version?: number;
        metadata?: Record<string, any>;
    }): Promise<ChangeHistory>;
    getLedgerHistories(ledgerId: string, options?: {
        page?: number;
        pageSize?: number;
        action?: ChangeAction;
    }): Promise<{
        histories: ChangeHistory[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getHistoryById(id: string): Promise<ChangeHistory | null>;
    compareVersions(ledgerId: string, version1: number, version2: number): Promise<{
        version1: ChangeHistory | null;
        version2: ChangeHistory | null;
        differences: FieldDiff[];
    }>;
    getLatestVersion(ledgerId: string): Promise<number>;
    getChangeByVersion(ledgerId: string, version: number): Promise<ChangeHistory | null>;
}
