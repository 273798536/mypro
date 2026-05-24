import { BaseParser } from './baseParser';
import { BookingRecord, ParseResult } from '../models/types';

export class BookingParser extends BaseParser<BookingRecord> {
  constructor() {
    super('booking');
  }

  parseRow(row: Record<string, string>, lineNumber: number): ParseResult<BookingRecord> {
    const errors: string[] = [];

    const bookingId = row['预约ID'] || row['bookingId'] || row['id'];
    if (!bookingId) {
      errors.push('缺少预约ID');
    }

    const roomName = row['会议室'] || row['roomName'] || row['room'];
    if (!roomName) {
      errors.push('缺少会议室名称');
    }

    const organizer = row['组织者'] || row['organizer'];
    if (!organizer) {
      errors.push('缺少组织者');
    }

    const attendeesStr = row['参会人员'] || row['attendees'] || '';
    const attendees = attendeesStr.split(/[,，;；]/).map(s => s.trim()).filter(Boolean);

    const startTime = row['开始时间'] || row['startTime'] || row['start'];
    if (!startTime) {
      errors.push('缺少开始时间');
    }

    const endTime = row['结束时间'] || row['endTime'] || row['end'];
    if (!endTime) {
      errors.push('缺少结束时间');
    }

    const statusStr = (row['状态'] || row['status'] || 'scheduled').toLowerCase();
    const statusMap: Record<string, BookingRecord['status']> = {
      '已预约': 'scheduled',
      'scheduled': 'scheduled',
      '已取消': 'cancelled',
      'cancelled': 'cancelled',
      '已完成': 'completed',
      'completed': 'completed'
    };
    const status = statusMap[statusStr] || 'scheduled';

    const hasTeaBreak = this.parseBoolean(row['茶歇'] || row['teaBreak'] || row['hasTeaBreak']);
    const hasEquipment = this.parseBoolean(row['设备'] || row['equipment'] || row['hasEquipment']);
    const teaBreakType = row['茶歇类型'] || row['teaBreakType'];
    const equipmentListStr = row['设备清单'] || row['equipmentList'] || '';
    const equipmentList = equipmentListStr ? equipmentListStr.split(/[,，;；]/).map(s => s.trim()).filter(Boolean) : undefined;

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
        bookingId: bookingId!,
        roomName: roomName!,
        organizer: organizer!,
        attendees,
        startTime: startTime!,
        endTime: endTime!,
        status,
        hasTeaBreak,
        hasEquipment,
        teaBreakType,
        equipmentList
      },
      lineNumber,
      rawData: ''
    };
  }

  private parseBoolean(value: string): boolean {
    if (!value) return false;
    const v = value.toLowerCase().trim();
    return ['是', 'yes', 'true', '1', '有', 'y'].includes(v);
  }
}
