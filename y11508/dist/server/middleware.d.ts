import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { rolePermissions } from '../permissions';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: Role;
        department: string;
    };
}
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requirePermission(entityType: keyof typeof rolePermissions[Role.DATA_ENTRY], action: string): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function filterResponse<T extends Record<string, any>>(data: T, role: Role, entityType: keyof typeof rolePermissions[Role.DATA_ENTRY]): Partial<T>;
export declare function checkStatusTransition(fromStatus: string, toStatus: string, role: Role): boolean;
