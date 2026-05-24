import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { ImportSource, ImportResult, MaterialRecord } from '../types';
import { 
  createRecord, 
  findExistingRecord, 
  findByRequestId,
  updateRecord,
  updateRecordStatus,
  RawRecordData,
  getAllRecords
} from './recordService';
import { checkAllDirty, saveDirtyRecords, DirtyCheckResult } from './dirtyRecordService';

export async function importFromCSV(
  filePath: string,
  source: ImportSource,
  requestId?: string
): Promise<ImportResult> {
  const reqId = requestId || uuidv4();
  
  const existingRecords = await findByRequestId(reqId);
  if (existingRecords.length > 0) {
    console.log(`请求ID已存在，正在更新现有记录... (request_id: ${reqId})`);
    return updateExistingRecords(reqId, filePath, source);
  }
  
  const results: ImportResult = {
    total: 0,
    success: 0,
    dirty: 0,
    duplicate: 0,
    recordIds: []
  };
  
  const allExistingRecords = await getAllRecordsForCheck();
  const rows: any[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: any) => {
        rows.push(row);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
  
  let lineNumber = 0;
  const processPromises: Promise<void>[] = [];
  
  for (const row of rows) {
    lineNumber++;
    results.total++;
    
    const promise = processRow(row, source, lineNumber, reqId, allExistingRecords)
      .then(processed => {
        results.recordIds.push(processed.recordId);
        if (processed.isDuplicate) {
          results.duplicate++;
        } else if (processed.isDirty) {
          results.dirty++;
        } else {
          results.success++;
        }
      })
      .catch(error => {
        console.error(`第 ${lineNumber} 行处理失败:`, (error as Error).message);
      });
    
    processPromises.push(promise);
  }
  
  await Promise.all(processPromises);
  
  console.log(`导入完成: 总计 ${results.total} 条, 成功 ${results.success} 条, 脏数据 ${results.dirty} 条, 重复 ${results.duplicate} 条`);
  return results;
}

export async function importFromZip(
  zipPath: string,
  source: ImportSource,
  requestId?: string
): Promise<ImportResult> {
  const reqId = requestId || uuidv4();
  const zip = new JSZip();
  const content = fs.readFileSync(zipPath);
  const zipContent = await zip.loadAsync(content);
  
  const totalResult: ImportResult = {
    total: 0,
    success: 0,
    dirty: 0,
    duplicate: 0,
    recordIds: []
  };
  
  const allExistingRecords = await getAllRecordsForCheck();
  
  for (const [fileName, file] of Object.entries(zipContent.files)) {
    if (!file.dir && fileName.endsWith('.csv')) {
      console.log(`处理压缩包内文件: ${fileName}`);
      const csvContent = await file.async('string');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        totalResult.total++;
        const values = lines[i].split(',');
        const row: Record<string, string> = {};
        
        headers.forEach((header, idx) => {
          row[header.trim()] = (values[idx] || '').trim();
        });
        
        try {
          const processed = await processRow(row, source, i, reqId, allExistingRecords, fileName);
          totalResult.recordIds.push(processed.recordId);
          
          if (processed.isDuplicate) {
            totalResult.duplicate++;
          } else if (processed.isDirty) {
            totalResult.dirty++;
          } else {
            totalResult.success++;
          }
        } catch (error) {
          console.error(`文件 ${fileName} 第 ${i} 行处理失败:`, (error as Error).message);
        }
      }
    }
  }
  
  console.log(`压缩包导入完成: 总计 ${totalResult.total} 条, 成功 ${totalResult.success} 条, 脏数据 ${totalResult.dirty} 条, 重复 ${totalResult.duplicate} 条`);
  return totalResult;
}

async function getAllRecordsForCheck(): Promise<MaterialRecord[]> {
  return getAllRecords(10000);
}

interface ProcessResult {
  recordId: string;
  isDuplicate: boolean;
  isDirty: boolean;
}

async function processRow(
  row: Record<string, any>,
  source: ImportSource,
  lineNumber: number,
  requestId: string,
  existingRecords: MaterialRecord[],
  sourceFile?: string
): Promise<ProcessResult> {
  const data: RawRecordData = {
    material_id: String(row.material_id || row['素材ID'] || ''),
    material_name: String(row.material_name || row['素材名称'] || ''),
    platform: String(row.platform || row['平台'] || ''),
    record_date: String(row.record_date || row['日期'] || ''),
    impressions: row.impressions !== undefined ? Number(row.impressions) : 
                 row['曝光量'] !== undefined ? Number(row['曝光量']) : undefined,
    clicks: row.clicks !== undefined ? Number(row.clicks) : 
            row['点击量'] !== undefined ? Number(row['点击量']) : undefined,
    cost: row.cost !== undefined ? Number(row.cost) : 
          row['花费'] !== undefined ? Number(row['花费']) : undefined,
    audit_status: String(row.audit_status || row['审核状态'] || ''),
    audit_reason: String(row.audit_reason || row['审核原因'] || '')
  };
  
  const existing = await findExistingRecord(
    data.material_id,
    data.platform,
    data.record_date,
    source
  );
  
  if (existing) {
    await updateRecord(existing.id, data, `重复导入更新 (来源行: ${lineNumber}, 请求ID: ${requestId})`);
    const dirtyResults = checkAllDirty(data, source, existingRecords);
    
    if (dirtyResults.length > 0) {
      const { run } = await import('../db/database');
      await run('DELETE FROM dirty_records WHERE record_id = ?', [existing.id]);
      await saveDirtyRecords(existing.id, dirtyResults);
      await updateRecordStatus(existing.id, 'dirty', '更新后发现脏数据');
      return { recordId: existing.id, isDuplicate: true, isDirty: true };
    }
    
    return { recordId: existing.id, isDuplicate: true, isDirty: false };
  }
  
  const record = await createRecord(data, source, lineNumber, requestId);
  const dirtyResults = checkAllDirty(data, source, existingRecords);
  
  if (dirtyResults.length > 0) {
    await saveDirtyRecords(record.id, dirtyResults);
    await updateRecordStatus(record.id, 'dirty', '导入时发现脏数据');
    return { recordId: record.id, isDuplicate: false, isDirty: true };
  }
  
  return { recordId: record.id, isDuplicate: false, isDirty: false };
}

async function updateExistingRecords(
  requestId: string,
  filePath: string,
  source: ImportSource
): Promise<ImportResult> {
  const results: ImportResult = {
    total: 0,
    success: 0,
    dirty: 0,
    duplicate: 0,
    recordIds: []
  };
  
  const allExistingRecords = await getAllRecordsForCheck();
  const rows: any[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: any) => {
        rows.push(row);
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
  
  let lineNumber = 0;
  const processPromises: Promise<void>[] = [];
  
  for (const row of rows) {
    lineNumber++;
    results.total++;
    
    const promise = (async () => {
      try {
        const data: RawRecordData = {
          material_id: String(row.material_id || row['素材ID'] || ''),
          material_name: String(row.material_name || row['素材名称'] || ''),
          platform: String(row.platform || row['平台'] || ''),
          record_date: String(row.record_date || row['日期'] || ''),
          impressions: row.impressions !== undefined ? Number(row.impressions) : 
                       row['曝光量'] !== undefined ? Number(row['曝光量']) : undefined,
          clicks: row.clicks !== undefined ? Number(row.clicks) : 
                  row['点击量'] !== undefined ? Number(row['点击量']) : undefined,
          cost: row.cost !== undefined ? Number(row.cost) : 
                row['花费'] !== undefined ? Number(row['花费']) : undefined,
          audit_status: String(row.audit_status || row['审核状态'] || ''),
          audit_reason: String(row.audit_reason || row['审核原因'] || '')
        };
        
        const existing = await findExistingRecord(
          data.material_id,
          data.platform,
          data.record_date,
          source
        );
        
        if (existing) {
          await updateRecord(existing.id, data, `幂等更新 (请求ID: ${requestId})`);
          results.recordIds.push(existing.id);
          results.duplicate++;
          
          const dirtyResults = checkAllDirty(data, source, allExistingRecords);
          if (dirtyResults.length > 0) {
            const { run } = await import('../db/database');
            await run('DELETE FROM dirty_records WHERE record_id = ?', [existing.id]);
            await saveDirtyRecords(existing.id, dirtyResults);
            await updateRecordStatus(existing.id, 'dirty', '更新后发现脏数据');
            results.dirty++;
          } else {
            results.success++;
          }
        } else {
          const processed = await processRow(row, source, lineNumber, requestId, allExistingRecords);
          results.recordIds.push(processed.recordId);
          if (processed.isDirty) results.dirty++;
          else results.success++;
        }
      } catch (error) {
        console.error(`第 ${lineNumber} 行处理失败:`, (error as Error).message);
      }
    })();
    
    processPromises.push(promise);
  }
  
  await Promise.all(processPromises);
  return results;
}

export async function importSupplement(
  data: RawRecordData,
  requestId?: string
): Promise<ProcessResult> {
  const reqId = requestId || uuidv4();
  const allExistingRecords = await getAllRecordsForCheck();
  
  return processRow(data as any, 'supplement', 0, reqId, allExistingRecords, '手动补录');
}
