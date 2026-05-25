import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getSigninReport(req: AuthRequest, res: Response): Promise<void>;
export declare function getFailedRecords(req: AuthRequest, res: Response): Promise<void>;
export declare function getHrbpDashboard(req: AuthRequest, res: Response): Promise<void>;
export declare function exportSigninReport(req: AuthRequest, res: Response): Promise<void>;
export declare function exportFailedRecords(req: AuthRequest, res: Response): Promise<void>;
export declare function getRecordDiff(req: AuthRequest, res: Response): Promise<void>;
export declare function resolveFailedRecord(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
