import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getQueueList(req: AuthRequest, res: Response): Promise<void>;
export declare function getQueueDetail(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function handleManualTakeover(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function handleCompensateAndClose(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function handleCloseQueue(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function handleRetry(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getQueueStatistics(req: AuthRequest, res: Response): Promise<void>;
