import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ParsedFileData } from '@/types/experiment';

export const parseExcelFile = (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          reject(new Error('Excel 文件至少需要包含表头和一行数据'));
          return;
        }
        
        const headers = jsonData[0].map(h => String(h || ''));
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== '')).map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        resolve({
          headers,
          rows,
          fileName: file.name,
        });
      } catch (error) {
        reject(new Error(`Excel 解析失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsBinaryString(file);
  });
};

export const parseCsvFile = (file: File): Promise<ParsedFileData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV 解析警告:', results.errors);
        }
        
        if (results.data.length === 0) {
          reject(new Error('CSV 文件没有数据行'));
          return;
        }
        
        const firstRow = results.data[0] as Record<string, any>;
        const headers = Object.keys(firstRow);
        
        resolve({
          headers,
          rows: results.data as Record<string, any>[],
          fileName: file.name,
        });
      },
      error: (error) => {
        reject(new Error(`CSV 解析失败: ${error.message}`));
      },
    });
  });
};

export const parseFile = (file: File): Promise<ParsedFileData> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else if (extension === 'csv') {
    return parseCsvFile(file);
  } else {
    return Promise.reject(new Error(`不支持的文件格式: .${extension}，请上传 .xlsx、.xls 或 .csv 文件`));
  }
};

export const validateFile = (file: File): { valid: boolean; message?: string } => {
  const maxSize = 10 * 1024 * 1024;
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      message: `不支持的文件格式。请上传 ${allowedExtensions.join('、')} 格式的文件`,
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），最大支持 10MB`,
    };
  }
  
  return { valid: true };
};
