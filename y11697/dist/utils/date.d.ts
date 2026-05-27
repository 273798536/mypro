export declare const DATE_FORMAT = "yyyy-MM-dd";
export declare function formatDate(date: Date | string): string;
export declare function parseDate(dateStr: string): Date;
export declare function getDateRange(startDate: string, endDate: string): string[];
export declare function isDateInRange(date: string, startDate: string, endDate: string): boolean;
export declare function getShiftHours(shiftType: string): number;
export declare function isNightShift(shiftType: string): boolean;
export declare function getConsecutiveDays(dates: string[], targetDate: string, direction?: 'before' | 'after' | 'both'): string[];
