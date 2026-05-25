import { Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class FailedRecordController {
    private dataSource;
    private failedRecordService;
    constructor(dataSource: DataSource);
    create: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    list: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    markResolved: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    retry: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getStatistics: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}
