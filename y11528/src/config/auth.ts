import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../entities';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  name: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: AuthTokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return jwt.verify(token, secret) as AuthTokenPayload;
};

export const rolePermissions: Record<UserRole, string[]> = {
  [UserRole.DATA_ENTRY]: [
    'declaration:create',
    'declaration:read',
    'declaration:update',
    'trajectory:create',
    'trajectory:read',
    'trajectory:update',
    'tax:read',
    'bad_data:create'
  ],
  [UserRole.REVIEWER]: [
    'declaration:create',
    'declaration:read',
    'declaration:update',
    'declaration:review',
    'trajectory:create',
    'trajectory:read',
    'trajectory:update',
    'tax:create',
    'tax:read',
    'tax:update',
    'bad_data:read',
    'bad_data:update',
    'reconcile:run',
    'reconcile:read',
    'report:read'
  ],
  [UserRole.SUPERVISOR]: [
    'declaration:create',
    'declaration:read',
    'declaration:update',
    'declaration:review',
    'declaration:approve',
    'trajectory:create',
    'trajectory:read',
    'trajectory:update',
    'tax:create',
    'tax:read',
    'tax:update',
    'tax:waive',
    'comment:create',
    'comment:read',
    'comment:update',
    'bad_data:read',
    'bad_data:update',
    'bad_data:delete',
    'reconcile:run',
    'reconcile:read',
    'reconcile:resolve',
    'report:read',
    'report:generate',
    'user:read'
  ],
  [UserRole.READ_ONLY]: [
    'declaration:read',
    'trajectory:read',
    'tax:read',
    'comment:read',
    'reconcile:read',
    'bad_data:read'
  ]
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};
