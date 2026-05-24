import { SourceType } from '../models/types';
import { BaseParser } from './baseParser';
import { BookingParser } from './bookingParser';
import { AccessParser } from './accessParser';
import { CancellationParser } from './cancellationParser';
import { ConfirmationParser } from './confirmationParser';

export function getParser(sourceType: SourceType): BaseParser<any> {
  switch (sourceType) {
    case 'booking':
      return new BookingParser();
    case 'access':
      return new AccessParser();
    case 'cancellation':
      return new CancellationParser();
    case 'confirmation':
      return new ConfirmationParser();
    default:
      throw new Error(`未知的数据源类型: ${sourceType}`);
  }
}

export { BaseParser } from './baseParser';
export { BookingParser } from './bookingParser';
export { AccessParser } from './accessParser';
export { CancellationParser } from './cancellationParser';
export { ConfirmationParser } from './confirmationParser';
