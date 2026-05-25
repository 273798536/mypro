import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
export declare const mockUsers: Record<string, User>;
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requirePermission(action: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function filterFieldsByRole<T extends object>(data: T, role: UserRole): Partial<T>;
export declare function filterListByRole<T extends object>(items: T[], role: UserRole): Array<Partial<T>>;
