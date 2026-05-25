import { DataSource } from 'typeorm';
import request from 'supertest';
import express from 'express';
import { UserRole } from '../types/enums';
export declare const createTestApp: (dataSource: DataSource) => import("express-serve-static-core").Express;
export declare const authHeaders: (role: UserRole, userId?: string, userName?: string) => {
    'x-user-id': string;
    'x-user-name': string;
    'x-user-role': UserRole;
};
export declare const engineerHeaders: {
    'x-user-id': string;
    'x-user-name': string;
    'x-user-role': UserRole;
};
export declare const managerHeaders: {
    'x-user-id': string;
    'x-user-name': string;
    'x-user-role': UserRole;
};
export declare const auditorHeaders: {
    'x-user-id': string;
    'x-user-name': string;
    'x-user-role': UserRole;
};
export declare const adminHeaders: {
    'x-user-id': string;
    'x-user-name': string;
    'x-user-role': UserRole;
};
export declare const createTestLedger: (app: express.Express, data?: any) => Promise<request.Response>;
export declare const submitTestLedger: (app: express.Express, ledgerId: string, headers?: any) => Promise<request.Response>;
export declare const confirmTestLedger: (app: express.Express, ledgerId: string, headers?: any) => Promise<request.Response>;
export declare const rejectTestLedger: (app: express.Express, ledgerId: string, reason?: string, headers?: any) => Promise<request.Response>;
export declare const auditTestLedger: (app: express.Express, ledgerId: string, headers?: any) => Promise<request.Response>;
