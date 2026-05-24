import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function submitRegistration(req: AuthRequest, res: Response): Promise<void>;
export declare function submitSignin(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function submitHomework(req: AuthRequest, res: Response): Promise<void>;
export declare function submitPriceAdjustment(req: AuthRequest, res: Response): Promise<void>;
export declare function submitHistoryArchive(req: AuthRequest, res: Response): Promise<void>;
