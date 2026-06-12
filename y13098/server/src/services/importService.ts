import * as XLSX from 'xlsx';
import type { InspectionRecord } from '@shared/types';
import { createRecord } from './recordService';
import { createMaterial } from './materialService';
import { generateId } from '@shared/utils';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  importedIds: string[];
}

export async function importFromExcel(
  buffer: Buffer,
  userId: string
): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    importedIds: []
  };
  
  for (let i = 0; i < jsonData.length; i++) {
    try {
      const row = jsonData[i] as any;
      
      if (!row['航线走廊'] || !row['记录日期'] || !row['标题']) {
        throw new Error(`第${i + 1}行缺少必要字段`);
      }
      
      const recordType = row['记录类型'] === '正常记录' ? 'normal' :
                        row['记录类型'] === '异常记录' ? 'abnormal' :
                        row['记录类型'] === '临时说明' ? 'temporary' : 'normal';
      
      const status = row['状态'] === '待确认' ? 'pending' :
                    row['状态'] === '已确认' ? 'confirmed' :
                    row['状态'] === '已驳回' ? 'rejected' :
                    row['状态'] === '已修改' ? 'modified' : 'pending';
      
      const record = await createRecord({
        corridorId: row['航线走廊'],
        recordDate: String(row['记录日期']),
        recordType,
        title: String(row['标题']),
        description: String(row['描述'] || ''),
        status,
        createdBy: userId
      }, userId);
      
      if (row['照片路径'] || row['附件路径']) {
        const fileUrl = row['照片路径'] || row['附件路径'];
        const fileName = row['文件名'] || `import_${generateId()}`;
        
        await createMaterial({
          recordId: record.id,
          materialType: row['照片路径'] ? 'photo' : 'document',
          fileName,
          fileUrl,
          fileSize: row['文件大小'],
          remark: row['备注'],
          isCaliberModified: false,
          createdBy: userId
        }, userId);
      }
      
      result.success++;
      result.importedIds.push(record.id);
    } catch (error: any) {
      result.failed++;
      result.errors.push(error.message || `第${i + 1}行导入失败`);
    }
  }
  
  return result;
}

export async function importFromCSV(
  content: string,
  userId: string
): Promise<ImportResult> {
  const lines = content.split('\n');
  if (lines.length < 2) {
    return { success: 0, failed: 0, errors: ['CSV文件为空或格式不正确'], importedIds: [] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    importedIds: []
  };
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) {
        throw new Error(`第${i + 1}行字段数量不匹配`);
      }
      
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      
      if (!row['corridorId'] || !row['recordDate'] || !row['title']) {
        throw new Error(`第${i + 1}行缺少必要字段`);
      }
      
      const record = await createRecord({
        corridorId: row['corridorId'],
        recordDate: row['recordDate'],
        recordType: (row['recordType'] as any) || 'normal',
        title: row['title'],
        description: row['description'] || '',
        status: (row['status'] as any) || 'pending',
        createdBy: userId
      }, userId);
      
      result.success++;
      result.importedIds.push(record.id);
    } catch (error: any) {
      result.failed++;
      result.errors.push(error.message || `第${i + 1}行导入失败`);
    }
  }
  
  return result;
}
