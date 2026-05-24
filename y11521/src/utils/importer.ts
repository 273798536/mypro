import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import { SourceType, AppointmentRecord, LocationRecord, ReviewRecord, PriceAdjustmentRecord } from '../types';

export interface ImportResult<T> {
  records: T[];
  rawRecords: Array<{ row: number; data: Record<string, any> }>;
  errors: Array<{ row: number; error: string }>;
  sourceFile: string;
}

export function detectSourceType(fileName: string): SourceType | null {
  const lower = fileName.toLowerCase();
  if (lower.includes('预约') || lower.includes('appointment') || lower.includes('order')) {
    return 'appointment';
  }
  if (lower.includes('定位') || lower.includes('签到') || lower.includes('location') || lower.includes('checkin')) {
    return 'location';
  }
  if (lower.includes('评价') || lower.includes('review') || lower.includes('comment')) {
    return 'review';
  }
  if (lower.includes('改价') || lower.includes('调价') || lower.includes('price') || lower.includes('adjust')) {
    return 'price_adjustment';
  }
  return null;
}

export function parseCsvFile<T>(filePath: string): Promise<ImportResult<T>> {
  return new Promise((resolve, reject) => {
    const records: T[] = [];
    const rawRecords: Array<{ row: number; data: Record<string, any> }> = [];
    const errors: Array<{ row: number; error: string }> = [];
    let rowNum = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', () => {
        rowNum = 1;
      })
      .on('data', (data) => {
        rowNum++;
        try {
          rawRecords.push({ row: rowNum, data: { ...data } });
          records.push(data as T);
        } catch (err: any) {
          errors.push({ row: rowNum, error: err.message });
        }
      })
      .on('end', () => {
        resolve({
          records,
          rawRecords,
          errors,
          sourceFile: path.basename(filePath),
        });
      })
      .on('error', reject);
  });
}

export async function extractArchive(
  archivePath: string,
  outputDir: string
): Promise<string[]> {
  const extractedFiles: string[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const directory = await unzipper.Open.file(archivePath);
  for (const file of directory.files) {
    if (file.type === 'File' && file.path.toLowerCase().endsWith('.csv')) {
      const outputPath = path.join(outputDir, path.basename(file.path));
      const content = await file.buffer();
      fs.writeFileSync(outputPath, content);
      extractedFiles.push(outputPath);
    }
  }

  return extractedFiles;
}

export function normalizeAppointment(
  data: Record<string, any>,
  rawRow: number,
  sourceFile: string
): Omit<AppointmentRecord, 'id' | 'source'> {
  return {
    orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
    customerName: String(data.客户姓名 || data.customerName || data.customer || ''),
    phone: String(data.联系电话 || data.phone || data.telephone || ''),
    address: String(data.安装地址 || data.address || ''),
    applianceType: String(data.家电类型 || data.applianceType || data.type || ''),
    appointmentDate: String(data.预约日期 || data.appointmentDate || data.date || ''),
    appointmentTime: String(data.预约时间 || data.appointmentTime || data.time || ''),
    technicianId: data.师傅ID || data.technicianId ? String(data.师傅ID || data.technicianId) : undefined,
    technicianName: data.师傅姓名 || data.technicianName ? String(data.师傅姓名 || data.technicianName) : undefined,
    status: String(data.状态 || data.status || '待处理'),
    rawRow,
    sourceFile,
  };
}

export function normalizeLocation(
  data: Record<string, any>,
  rawRow: number,
  sourceFile: string
): Omit<LocationRecord, 'id' | 'source'> {
  return {
    orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
    technicianId: String(data.师傅ID || data.technicianId || ''),
    technicianName: String(data.师傅姓名 || data.technicianName || ''),
    checkinTime: String(data.签到时间 || data.checkinTime || data.checkin || ''),
    checkoutTime: data.签退时间 || data.checkoutTime ? String(data.签退时间 || data.checkoutTime) : undefined,
    location: String(data.签到地点 || data.location || ''),
    latitude: data.纬度 || data.latitude ? Number(data.纬度 || data.latitude) : undefined,
    longitude: data.经度 || data.longitude ? Number(data.经度 || data.longitude) : undefined,
    rawRow,
    sourceFile,
  };
}

export function normalizeReview(
  data: Record<string, any>,
  rawRow: number,
  sourceFile: string
): Omit<ReviewRecord, 'id' | 'source'> {
  return {
    orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
    customerName: String(data.客户姓名 || data.customerName || ''),
    rating: Number(data.评分 || data.rating || 5),
    reviewContent: String(data.评价内容 || data.reviewContent || data.content || ''),
    reviewDate: String(data.评价日期 || data.reviewDate || data.date || ''),
    badReason: data.差评原因 || data.badReason ? String(data.差评原因 || data.badReason) : undefined,
    technicianId: data.师傅ID || data.technicianId ? String(data.师傅ID || data.technicianId) : undefined,
    technicianName: data.师傅姓名 || data.technicianName ? String(data.师傅姓名 || data.technicianName) : undefined,
    rawRow,
    sourceFile,
  };
}

export function normalizePriceAdjustment(
  data: Record<string, any>,
  rawRow: number,
  sourceFile: string
): Omit<PriceAdjustmentRecord, 'id' | 'source'> {
  return {
    orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
    originalAmount: Number(data.原始金额 || data.originalAmount || 0),
    adjustedAmount: Number(data.调整后金额 || data.adjustedAmount || 0),
    adjustmentReason: String(data.调整原因 || data.adjustmentReason || ''),
    operator: String(data.操作人 || data.operator || ''),
    adjustmentDate: String(data.调整日期 || data.adjustmentDate || data.date || ''),
    rawRow,
    sourceFile,
  };
}

export function createTempDir(): string {
  const tempDir = path.join(process.cwd(), '.hai-cli', 'temp', uuidv4());
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
