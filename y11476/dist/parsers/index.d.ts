import { SourceType } from '../models/types';
import { BaseParser } from './baseParser';
export declare function getParser(sourceType: SourceType): BaseParser<any>;
export { BaseParser } from './baseParser';
export { BookingParser } from './bookingParser';
export { AccessParser } from './accessParser';
export { CancellationParser } from './cancellationParser';
export { ConfirmationParser } from './confirmationParser';
