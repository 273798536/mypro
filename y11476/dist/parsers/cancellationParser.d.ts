import { BaseParser } from './baseParser';
import { CancellationRecord, ParseResult } from '../models/types';
export declare class CancellationParser extends BaseParser<CancellationRecord> {
    constructor();
    parseRow(row: Record<string, string>, lineNumber: number): ParseResult<CancellationRecord>;
}
