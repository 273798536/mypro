import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
export declare class ReceiptPhoto extends BaseEntity {
    photoUrl: string;
    photoHash?: string;
    photoSize?: number;
    photoType?: string;
    captureTime?: Date;
    captureLocation?: string;
    uploaderId?: string;
    uploaderName?: string;
    description?: string;
    exifData?: Record<string, any>;
    ledgerId?: string;
    ledger?: Ledger;
}
