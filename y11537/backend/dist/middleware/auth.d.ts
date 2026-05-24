import { Request, Response, NextFunction } from 'express';
import { UserRole, AuditAction } from '../models/types';
export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        realName: string;
        role: UserRole;
        department: string;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requirePermission(action: AuditAction): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
