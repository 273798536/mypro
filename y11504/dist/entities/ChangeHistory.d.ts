import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { ChangeAction, LedgerStatus } from '../types/enums';
export declare class ChangeHistory extends BaseEntity {
    ledgerId?: string;
    ledger?: Ledger;
    action: ChangeAction;
    fromStatus?: LedgerStatus;
    toStatus?: LedgerStatus;
    beforeData?: Record<string, any>;
    afterData?: Record<string, any>;
    changes?: Array<{
        field: string;
        before: any;
        after: any;
    }>;
    reason?: string;
    operatorId?: string;
    operatorName?: string;
    operatorRole?: string;
    version: number;
    metadata?: Record<string, any>;
}
