import { Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class LedgerController {
    private dataSource;
    private ledgerService;
    private changeHistoryService;
    private exportService;
    constructor(dataSource: DataSource);
    createDraft: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateDraft: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    submit: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    reject: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    confirm: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    audit: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getByLedgerNo: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    list: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStatistics: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getChangeHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    compareVersions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    exportLedger: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    exportLedgers: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    validate: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    private getSensitiveLevelForUser;
}
