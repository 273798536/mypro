import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { 
  DataSource, 
  Database, 
  ImportResult 
} from '../types';
import { importCsvFile } from './importer';

interface ZipImportResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalRecords: number;
  importedRecords: number;
  dirtyRecords: number;
  results: {
    fileName: string;
    source: DataSource;
    result: ImportResult;
  }[];
}

function detectDataSourceFromFileName(fileName: string): DataSource | null {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('implant') || lowerName.includes('种植体') || lowerName.includes('批号')) {
    return DataSource.IMPLANT_BATCH;
  }
  if (lowerName.includes('appointment') || lowerName.includes('预约') || lowerName.includes('患者')) {
    return DataSource.APPOINTMENT;
  }
  if (lowerName.includes('invoice') || lowerName.includes('发票') || lowerName.includes('供应商')) {
    return DataSource.SUPPLIER_INVOICE;
  }
  if (lowerName.includes('manual') || lowerName.includes('补录') || lowerName.includes('临时')) {
    return DataSource.MANUAL_ENTRY;
  }
  
  return null;
}

function extractZipToTemp(zipFilePath: string): string {
  const zip = new AdmZip(zipFilePath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dmi-zip-'));
  zip.extractAllTo(tempDir, true);
  return tempDir;
}

function findCsvFiles(dir: string): string[] {
  const csvFiles: string[] = [];
  
  function scanDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (path.extname(file).toLowerCase() === '.csv') {
        csvFiles.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return csvFiles;
}

export async function importZipFile(
  zipFilePath: string,
  importedBy: string,
  db: Database,
  forceSource?: DataSource
): Promise<ZipImportResult> {
  if (!fs.existsSync(zipFilePath)) {
    throw new Error(`压缩包不存在: ${zipFilePath}`);
  }

  const tempDir = extractZipToTemp(zipFilePath);
  const csvFiles = findCsvFiles(tempDir);
  
  const results: ZipImportResult['results'] = [];
  let totalRecords = 0;
  let importedRecords = 0;
  let dirtyRecords = 0;
  let failedFiles = 0;

  for (const csvFile of csvFiles) {
    const fileName = path.basename(csvFile);
    const source = forceSource || detectDataSourceFromFileName(fileName);
    
    if (!source) {
      results.push({
        fileName,
        source: DataSource.MANUAL_ENTRY,
        result: {
          total: 0,
          success: 0,
          failed: 0,
          dirty: 0,
          records: [],
          errors: [`无法自动识别数据来源，跳过文件: ${fileName}`]
        }
      });
      failedFiles++;
      continue;
    }

    try {
      const result = await importCsvFile(csvFile, source, importedBy, db);
      results.push({ fileName, source, result });
      totalRecords += result.total;
      importedRecords += result.success;
      dirtyRecords += result.dirty;
    } catch (e: any) {
      results.push({
        fileName,
        source,
        result: {
          total: 0,
          success: 0,
          failed: 0,
          dirty: 0,
          records: [],
          errors: [`导入失败: ${e.message}`]
        }
      });
      failedFiles++;
    }
  }

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
  }

  return {
    totalFiles: csvFiles.length,
    processedFiles: results.length,
    failedFiles,
    totalRecords,
    importedRecords,
    dirtyRecords,
    results
  };
}

export function getDataSourceFromSourceArg(sourceArg: string): DataSource | null {
  const sourceMap: Record<string, DataSource> = {
    implant: DataSource.IMPLANT_BATCH,
    appointment: DataSource.APPOINTMENT,
    invoice: DataSource.SUPPLIER_INVOICE,
    manual: DataSource.MANUAL_ENTRY
  };
  return sourceMap[sourceArg] || null;
}
