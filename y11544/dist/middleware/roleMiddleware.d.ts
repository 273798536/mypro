import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
    };
}
export declare function roleAuth(allowedRoles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function getRoleFromRequest(req: AuthenticatedRequest): UserRole;
export declare function getUserIdFromRequest(req: AuthenticatedRequest): string;
