import { BaseParser } from './baseParser';
import { ConfirmationRecord, ParseResult } from '../models/types';
export declare class ConfirmationParser extends BaseParser<ConfirmationRecord> {
    constructor();
    parseRow(row: Record<string, string>, lineNumber: number): ParseResult<ConfirmationRecord>;
}
