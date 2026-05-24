import { BaseParser } from './baseParser';
import { AccessRecord, ParseResult } from '../models/types';

export class AccessParser extends BaseParser<AccessRecord> {
  constructor() {
    super('access');
  }

  parseRow(row: Record<string, string>, lineNumber: number): ParseResult<AccessRecord> {
    const errors: string[] = [];

    const accessId = row['刷卡ID'] || row['accessId'] || row['id'] || row['记录ID'];
    if (!accessId) {
      errors.push('缺少刷卡记录ID');
    }

    const roomName = row['会议室'] || row['roomName'] || row['room'];
    if (!roomName) {
      errors.push('缺少会议室名称');
    }

    const personName = row['人员'] || row['personName'] || row['name'] || row['姓名'];
    if (!personName) {
      errors.push('缺少人员姓名');
    }

    const cardNumber = row['卡号'] || row['cardNumber'] || row['card'];
    if (!cardNumber) {
      errors.push('缺少卡号');
    }

    const swipeTime = row['刷卡时间'] || row['swipeTime'] || row['time'] || row['时间'];
    if (!swipeTime) {
      errors.push('缺少刷卡时间');
    }

    const directionStr = (row['方向'] || row['direction'] || 'in').toLowerCase();
    const directionMap: Record<string, 'in' | 'out'> = {
      '进入': 'in',
      'in': 'in',
      '进门': 'in',
      '离开': 'out',
      'out': 'out',
      '出门': 'out'
    };
    const direction = directionMap[directionStr] || 'in';

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
        accessId: accessId!,
        roomName: roomName!,
        personName: personName!,
        cardNumber: cardNumber!,
        swipeTime: swipeTime!,
        direction
      },
      lineNumber,
      rawData: ''
    };
  }
}
