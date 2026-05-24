export type SourceType = 'booking' | 'access' | 'cancellation' | 'confirmation';
export declare const SOURCE_TYPES: SourceType[];
export declare const SOURCE_TYPE_LABELS: Record<SourceType, string>;
export interface BookingRecord {
    bookingId: string;
    roomName: string;
    organizer: string;
    attendees: string[];
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'cancelled' | 'completed';
    hasTeaBreak: boolean;
    hasEquipment: boolean;
    teaBreakType?: string;
    equipmentList?: string[];
}
export interface AccessRecord {
    accessId: string;
    roomName: string;
    personName: string;
    cardNumber: string;
    swipeTime: string;
    direction: 'in' | 'out';
}
export interface CancellationRecord {
    cancelId: string;
    bookingId: string;
    roomName: string;
    canceller: string;
    cancelTime: string;
    originalStartTime: string;
    originalEndTime: string;
    reason?: string;
    notifiedParties?: string[];
}
export interface ConfirmationRecord {
    confirmId: string;
    bookingId: string;
    roomName: string;
    confirmer: string;
    confirmTime: string;
    confirmedStatus: 'confirmed' | 'cancelled' | 'changed';
    finalStartTime?: string;
    finalEndTime?: string;
    remarks?: string;
}
export type ParsedRecord = BookingRecord | AccessRecord | CancellationRecord | ConfirmationRecord;
export interface ParseResult<T = ParsedRecord> {
    success: boolean;
    data?: T;
    error?: string;
    lineNumber: number;
    rawData: string;
}
