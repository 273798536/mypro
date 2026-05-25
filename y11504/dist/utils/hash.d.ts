import { Ledger } from '../entities/Ledger';
export declare const generateDataHash: (data: Record<string, any>) => string;
export declare const serializeLedgerForHash: (ledger: Ledger) => Record<string, any>;
export declare const generateLedgerHash: (ledger: Ledger) => string;
export declare const generateLedgerNo: (prefix?: string) => string;
export declare const generateFileHash: (buffer: Buffer) => string;
