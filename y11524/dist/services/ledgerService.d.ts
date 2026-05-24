import { Ledger, LedgerStatus, AppointmentOrder, TechnicianLocation, UserReview, SecondConfirmation, StatusChangeLog, FailedRecord, DataSource, LedgerDetail, IdempotencyResult, RoleType } from '../types';
import { AppointmentOrderInput, TechnicianLocationInput, UserReviewInput, SecondConfirmationInput, StatusChangeInput } from '../validation/schemas';
export declare function importAppointmentOrder(input: AppointmentOrderInput): IdempotencyResult<{
    ledger: Ledger;
    appointment: AppointmentOrder;
}>;
export declare function importTechnicianLocation(input: TechnicianLocationInput): IdempotencyResult<TechnicianLocation>;
export declare function importUserReview(input: UserReviewInput): IdempotencyResult<UserReview>;
export declare function importSecondConfirmation(input: SecondConfirmationInput): IdempotencyResult<SecondConfirmation>;
export declare function changeLedgerStatus(input: StatusChangeInput): {
    ledger: Ledger;
    log: StatusChangeLog;
};
export declare function getLedgerList(params: {
    status?: LedgerStatus;
    area?: string;
    page?: number;
    pageSize?: number;
    role?: RoleType;
}): {
    list: Ledger[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function getLedgerDetail(ledgerId: string, role?: RoleType): LedgerDetail;
export declare function getFailedRecords(params: {
    dataSource?: DataSource;
    page?: number;
    pageSize?: number;
}): {
    list: FailedRecord[];
    total: number;
};
