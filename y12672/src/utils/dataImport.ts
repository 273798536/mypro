import * as XLSX from 'xlsx';
import type { ContainerPosition } from '../types';

interface RawContainerData {
  name?: string;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  depth?: number;
  [key: string]: unknown;
}

export function parseExcelFile(file: File): Promise<ContainerPosition[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<RawContainerData>(worksheet);

        const containers = parseContainerData(jsonData);
        resolve(containers);
      } catch (error) {
        reject(new Error(`解析Excel文件失败: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsBinaryString(file);
  });
}

export function parseCSVFile(file: File): Promise<ContainerPosition[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
          reject(new Error('CSV文件格式错误：需要至少包含标题行和数据行'));
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const dataRows = lines.slice(1);

        const jsonData: RawContainerData[] = dataRows.map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const row: RawContainerData = {};
          headers.forEach((header, index) => {
            const value = values[index];
            if (header === 'x' || header === 'y' || header === 'z') {
              row[header] = parseFloat(value) || 0;
            } else if (header === 'width' || header === 'height' || header === 'depth') {
              row[header] = parseFloat(value) || 1;
            } else {
              row[header] = value;
            }
          });
          return row;
        });

        const containers = parseContainerData(jsonData);
        resolve(containers);
      } catch (error) {
        reject(new Error(`解析CSV文件失败: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
}

export function parseJSONFile(file: File): Promise<ContainerPosition[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        let jsonData: RawContainerData[];
        if (Array.isArray(data)) {
          jsonData = data;
        } else if (data.containers && Array.isArray(data.containers)) {
          jsonData = data.containers;
        } else {
          throw new Error('JSON格式错误：需要数组或包含containers字段的对象');
        }

        const containers = parseContainerData(jsonData);
        resolve(containers);
      } catch (error) {
        reject(new Error(`解析JSON文件失败: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
}

function parseContainerData(data: RawContainerData[]): ContainerPosition[] {
  const batchId = `BATCH_${Date.now()}`;
  const containers: ContainerPosition[] = [];

  data.forEach((row, index) => {
    const name = row.name || `箱位-${index + 1}`;
    const x = Number(row.x) || 0;
    const y = Number(row.y) || 0;
    const z = Number(row.z) || 0;
    const width = Number(row.width) || 10;
    const height = Number(row.height) || 8;
    const depth = Number(row.depth) || 14;

    if (x !== undefined && z !== undefined) {
      containers.push({
        id: `container_${batchId}_${index}`,
        name,
        x,
        y,
        z,
        width,
        height,
        depth,
        importBatch: batchId,
        createdAt: new Date(),
      });
    }
  });

  return containers;
}

export async function importFile(file: File): Promise<ContainerPosition[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    case 'csv':
      return parseCSVFile(file);
    case 'json':
      return parseJSONFile(file);
    default:
      throw new Error(`不支持的文件格式: .${extension}。请使用 .xlsx, .xls, .csv 或 .json 文件。`);
  }
}
