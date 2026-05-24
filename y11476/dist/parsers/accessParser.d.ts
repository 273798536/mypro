import { BaseParser } from './baseParser';
import { AccessRecord, ParseResult } from '../models/types';
export declare class AccessParser extends BaseParser<AccessRecord> {
    constructor();
    parseRow(row: Record<string, string>, lineNumber: number): ParseResult<AccessRecord>;
}
