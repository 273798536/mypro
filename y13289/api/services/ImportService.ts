import * as XLSX from 'xlsx';
import { RecordService } from './RecordService';
import type { DeliveryRecord } from '@shared/types';

export class ImportService {
  private recordService = new RecordService();

  async importFromExcel(buffer: Buffer, fileName: string): Promise<{ count: number; records: string[] }> {
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const importedIds: string[] = [];

    for (const row of data) {
      const record = this.mapRowToRecord(row, fileName);
      const id = await this.recordService.createRecord(record);
      importedIds.push(id);
    }

    return { count: importedIds.length, records: importedIds };
  }

  private mapRowToRecord(row: any, fileName: string): Omit<DeliveryRecord, 'id' | 'createdAt' | 'updatedAt' | 'issues'> {
    const marketNameRaw = this.getCellValue(row, ['菜场名称', '市场名称', 'marketName', 'market']);
    const locationRaw = this.getCellValue(row, ['卸货地点', '地址', 'location', 'address']);
    const latRaw = parseFloat(this.getCellValue(row, ['纬度', 'lat', 'latitude']) || '0');
    const lngRaw = parseFloat(this.getCellValue(row, ['经度', 'lng', 'longitude']) || '0');
    const deliveryTimeRaw = this.getCellValue(row, ['卸货时间', '时间', 'deliveryTime', 'time']);
    const truckNumberRaw = this.getCellValue(row, ['车牌号', '车牌', 'truckNumber', 'plate']);
    const goodsTypeRaw = this.getCellValue(row, ['货物类型', '货物', 'goodsType', 'goods']);
    const recordId = this.getCellValue(row, ['记录编号', '编号', 'recordId', 'id']) || `IMP${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    return {
      recordId,
      marketName: this.cleanMarketName(marketNameRaw),
      marketNameRaw,
      location: this.cleanLocation(locationRaw),
      locationRaw,
      coordinates: {
        lat: this.cleanCoordinate(latRaw),
        lng: this.cleanCoordinate(lngRaw),
      },
      coordinatesRaw: {
        lat: latRaw || 0,
        lng: lngRaw || 0,
      },
      deliveryTime: this.cleanTime(deliveryTimeRaw),
      deliveryTimeRaw,
      truckNumber: this.cleanTruckNumber(truckNumberRaw),
      truckNumberRaw,
      goodsType: this.cleanGoodsType(goodsTypeRaw),
      goodsTypeRaw,
      status: 'pending',
      source: 'excel',
      sourceFile: fileName,
    };
  }

  private getCellValue(row: any, possibleKeys: string[]): string {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]);
      }
    }
    return '';
  }

  private cleanMarketName(name: string): string {
    return name
      .replace(/東/g, '东')
      .replace(/風/g, '风')
      .replace(/農/g, '农')
      .replace(/貿/g, '贸')
      .replace(/號/g, '号')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/菜场$/, '菜市场')
      .trim();
  }

  private cleanLocation(location: string): string {
    return location
      .replace(/東/g, '东')
      .replace(/風/g, '风')
      .replace(/號/g, '号')
      .replace(/\s+/g, '')
      .trim();
  }

  private cleanCoordinate(coord: number): number {
    return Math.round(coord * 10000) / 10000;
  }

  private cleanTime(time: string): string {
    if (!time) return '';

    const today = new Date().toISOString().split('T')[0];

    const patterns = [
      /(\d+)月(\d+)日[早上下午晚]*(\d+)[点时](\d+)?/,
      /(\d+)\/(\d+)[早上下午晚]*(\d+)[点时](\d+)?/,
      /(\d+)[点时](\d+)?/,
    ];

    for (const pattern of patterns) {
      const match = time.match(pattern);
      if (match) {
        let month = new Date().getMonth() + 1;
        let day = new Date().getDate();
        let hour = parseInt(match[3] || match[1]);
        let minute = parseInt(match[4] || match[2] || '0');

        if (match.length >= 5 && match[1] && match[2]) {
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          hour = parseInt(match[3]);
          minute = parseInt(match[4] || '0');
        }

        if (time.includes('下午') || time.includes('晚')) {
          hour += 12;
        }

        const year = new Date().getFullYear();
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
    }

    return time;
  }

  private cleanTruckNumber(number: string): string {
    return number
      .replace(/[·\-\s]/g, '')
      .toUpperCase()
      .trim();
  }

  private cleanGoodsType(type: string): string {
    const typeMap: Record<string, string> = {
      '蔬菜类': '蔬菜',
      '水果类': '水果',
      '海鲜水产': '水产',
      '猪肉牛肉': '肉类',
      '禽蛋': '禽蛋',
      '粮油': '粮油',
      '干货': '干货',
    };
    return typeMap[type] || type.trim();
  }
}
