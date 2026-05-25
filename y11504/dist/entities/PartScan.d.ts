import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { PartType } from '../types/enums';
export declare class PartScan extends BaseEntity {
    partCode: string;
    partName?: string;
    partType: PartType;
    scanTime?: Date;
    scanLocation?: string;
    scannerId?: string;
    scannerName?: string;
    quantity: number;
    batchNo?: string;
    metadata?: Record<string, any>;
    ledgerId?: string;
    ledger?: Ledger;
}
