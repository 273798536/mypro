import { BaseParser } from './baseParser';
import { BookingRecord, ParseResult } from '../models/types';
export declare class BookingParser extends BaseParser<BookingRecord> {
    constructor();
    parseRow(row: Record<string, string>, lineNumber: number): ParseResult<BookingRecord>;
    private parseBoolean;
}
