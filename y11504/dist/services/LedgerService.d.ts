import { DataSource } from 'typeorm';
import { Ledger } from '../entities/Ledger';
import { PartScan } from '../entities/PartScan';
import { ReceiptPhoto } from '../entities/ReceiptPhoto';
import { ExternalReceipt } from '../entities/ExternalReceipt';
import { LedgerStatus, DataQuality, UserRole } from '../types/enums';
import { ValidationResult } from '../utils/validation';
export interface CreateLedgerDto {
    repairOrderId?: string;
    engineerId: string;
    engineerName?: string;
    partScans?: Array<Partial<PartScan>>;
    receiptPhotos?: Array<Partial<ReceiptPhoto>>;
    externalReceipts?: Array<Partial<ExternalReceipt>>;
    changeReason?: string;
    metadata?: Record<string, any>;
}
export interface UpdateLedgerDto {
    repairOrderId?: string;
    engineerId?: string;
    engineerName?: string;
    partScans?: Array<Partial<PartScan>>;
    receiptPhotos?: Array<Partial<ReceiptPhoto>>;
    externalReceipts?: Array<Partial<ExternalReceipt>>;
    changeReason?: string;
    metadata?: Record<string, any>;
}
export interface SubmitLedgerDto {
    changeReason?: string;
}
export interface RejectLedgerDto {
    rejectReason: string;
    changeReason?: string;
}
export interface ConfirmLedgerDto {
    changeReason?: string;
}
export interface AuditLedgerDto {
    changeReason?: string;
}
export declare class LedgerService {
    private dataSource;
    private repository;
    private repairOrderRepository;
    private changeHistoryService;
    private failedRecordService;
    constructor(dataSource: DataSource);
    private autoRecordFailedData;
    private validatePartScans;
    private validateReceiptPhotos;
    private validateExternalReceipts;
    createDraft(dto: CreateLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    updateDraft(id: string, dto: UpdateLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    submit(id: string, dto: SubmitLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    reject(id: string, dto: RejectLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    confirm(id: string, dto: ConfirmLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    audit(id: string, dto: AuditLedgerDto, operator: {
        id: string;
        name: string;
        role: UserRole;
    }): Promise<Ledger>;
    getById(id: string, options?: {
        includeRelations?: boolean;
    }): Promise<Ledger | null>;
    getByLedgerNo(ledgerNo: string): Promise<Ledger | null>;
    list(options?: {
        page?: number;
        pageSize?: number;
        status?: LedgerStatus;
        engineerId?: string;
        repairOrderId?: string;
        dataQuality?: DataQuality;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        ledgers: Ledger[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getStatistics(): Promise<{
        total: number;
        validTotal: number;
        invalidTotal: number;
        byStatus: Record<LedgerStatus, number>;
        byQuality: Record<DataQuality, number>;
    }>;
    validateLedger(id: string): Promise<ValidationResult>;
    private serializeLedger;
}
