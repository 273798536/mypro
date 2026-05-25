import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
export declare class RepairOrder extends BaseEntity {
    orderNo: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    productModel?: string;
    productSn?: string;
    faultDescription?: string;
    engineerId?: string;
    engineerName?: string;
    repairDate?: Date;
    isAfterSupplement: boolean;
    supplementReason?: string;
    metadata?: Record<string, any>;
    ledgers: Ledger[];
}
