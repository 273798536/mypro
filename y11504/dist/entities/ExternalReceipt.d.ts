import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { ReceiptSource } from '../types/enums';
export declare class ExternalReceipt extends BaseEntity {
    receiptNo?: string;
    source: ReceiptSource;
    sourceSystem?: string;
    receivedAt?: Date;
    sender?: string;
    receiver?: string;
    content?: string;
    attachmentUrl?: string;
    attachmentHash?: string;
    metadata?: Record<string, any>;
    ledgerId?: string;
    ledger?: Ledger;
}
