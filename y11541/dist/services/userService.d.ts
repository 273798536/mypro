import { User, UserRole } from '../types';
export declare function getUserByUsername(username: string): Promise<User | null>;
export declare function createUser(username: string, role: UserRole): Promise<User>;
export declare function listUsers(): Promise<User[]>;
export declare function getCurrentUser(): Promise<User>;
