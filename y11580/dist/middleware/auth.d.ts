import { Request, Response, NextFunction } from 'express';
import { RoleType } from '../config';
export interface AuthUser {
    id: string;
    username: string;
    role: RoleType;
    storeId?: string;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
export declare function hasPermission(role: RoleType, permission: string): boolean;
export declare function filterFieldsByRole<T extends Record<string, any>>(data: T, role: RoleType, entityType: 'batch' | 'record'): Partial<T>;
export declare function requirePermission(permission: string): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
