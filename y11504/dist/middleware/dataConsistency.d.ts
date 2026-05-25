import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { DataSource } from 'typeorm';
export declare class DataConsistencyMiddleware {
    private dataSource;
    constructor(dataSource: DataSource);
    verifyLedgerHash: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
export declare const addVersionHeader: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
