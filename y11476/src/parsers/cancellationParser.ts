import { BaseParser } from './baseParser';
import { CancellationRecord, ParseResult } from '../models/types';

export class CancellationParser extends BaseParser<CancellationRecord> {
  constructor() {
    super('cancellation');
  }

  parseRow(row: Record<string, string>, lineNumber: number): ParseResult<CancellationRecord> {
    const errors: string[] = [];

    const cancelId = row['取消ID'] || row['cancelId'] || row['id'] || row['消息ID'];
    if (!cancelId) {
      errors.push('缺少取消记录ID');
    }

    const bookingId = row['预约ID'] || row['bookingId'];
    if (!bookingId) {
      errors.push('缺少预约ID');
    }

    const roomName = row['会议室'] || row['roomName'] || row['room'];
    if (!roomName) {
      errors.push('缺少会议室名称');
    }

    const canceller = row['取消人'] || row['canceller'] || row['操作人'];
    if (!canceller) {
      errors.push('缺少取消人');
    }

    const cancelTime = row['取消时间'] || row['cancelTime'] || row['time'];
    if (!cancelTime) {
      errors.push('缺少取消时间');
    }

    const originalStartTime = row['原开始时间'] || row['originalStartTime'] || row['startTime'];
    if (!originalStartTime) {
      errors.push('缺少原开始时间');
    }

    const originalEndTime = row['原结束时间'] || row['originalEndTime'] || row['endTime'];
    if (!originalEndTime) {
      errors.push('缺少原结束时间');
    }

    const reason = row['取消原因'] || row['reason'];
    const notifiedPartiesStr = row['通知方'] || row['notifiedParties'] || '';
    const notifiedParties = notifiedPartiesStr ? notifiedPartiesStr.split(/[,，;；]/).map(s => s.trim()).filter(Boolean) : undefined;

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; '),
        lineNumber,
        rawData: ''
      };
    }

    return {
      success: true,
      data: {
        cancelId: cancelId!,
        bookingId: bookingId!,
        roomName: roomName!,
        canceller: canceller!,
        cancelTime: cancelTime!,
        originalStartTime: originalStartTime!,
        originalEndTime: originalEndTime!,
        reason,
        notifiedParties
      },
      lineNumber,
      rawData: ''
    };
  }
}
