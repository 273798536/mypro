import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name: string;
        role: UserRole;
    };
}
export declare const hasPermission: (userRole: UserRole, permission: string) => boolean;
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requirePermission: (permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireRole: (...roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
