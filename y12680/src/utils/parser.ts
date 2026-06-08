import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { PocketRecord, CameraAngle } from '@/types';
import { generateId } from './storage';
import { detectAnomalies, determineReviewStatus } from './anomalyDetector';

export interface ParseResult {
  records: PocketRecord[];
  errors: string[];
}

const FIELD_MAPPINGS: Record<string, string[]> = {
  originalRowNumber: ['row', '行号', '原始行号', 'line', 'line_number'],
  proteinName: ['protein', '蛋白', '蛋白名称', 'protein_name', 'target'],
  x: ['x', 'coord_x', 'pocket_x', '坐标x', 'X'],
  y: ['y', 'coord_y', 'pocket_y', '坐标y', 'Y'],
  z: ['z', 'coord_z', 'pocket_z', '坐标z', 'Z'],
  affinity: ['affinity', '亲和力', 'kd', 'Ki', '结合能'],
  azimuth: ['azimuth', '方位角', '相机方位', 'camera_azimuth'],
  elevation: ['elevation', '仰角', '相机仰角', 'camera_elevation'],
  distance: ['distance', '距离', '相机距离', 'camera_distance'],
  imageName: ['image', '图片', '图片名', 'image_name', 'screenshot'],
  sourceNote: ['note', '备注', '来源备注', 'remark'],
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, '');
}

function findFieldValue(row: Record<string, string | number>, field: string): string | number | undefined {
  const aliases = FIELD_MAPPINGS[field] || [field];
  for (const alias of aliases) {
    for (const key of Object.keys(row)) {
      if (normalizeKey(key) === normalizeKey(alias)) {
        return row[key];
      }
    }
  }
  return undefined;
}

function parseNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : num;
}

function rowToRecord(
  row: Record<string, string | number>,
  originalRowNumber: number,
  sourceFile: string,
): PocketRecord | null {
  const proteinName = String(findFieldValue(row, 'proteinName') || '').trim();

  const x = parseNumber(findFieldValue(row, 'x'));
  const y = parseNumber(findFieldValue(row, 'y'));
  const z = parseNumber(findFieldValue(row, 'z'));
  const affinity = parseNumber(findFieldValue(row, 'affinity')) ?? 0;

  const rowNum = parseNumber(findFieldValue(row, 'originalRowNumber')) ?? originalRowNumber;

  let cameraAngle: CameraAngle | undefined;
  const azimuth = parseNumber(findFieldValue(row, 'azimuth'));
  const elevation = parseNumber(findFieldValue(row, 'elevation'));
  const distance = parseNumber(findFieldValue(row, 'distance'));

  if (azimuth !== undefined && elevation !== undefined && distance !== undefined) {
    cameraAngle = { azimuth, elevation, distance };
  }

  const imageName = findFieldValue(row, 'imageName');
  const sourceNote = findFieldValue(row, 'sourceNote');

  const now = new Date().toISOString();

  const record: PocketRecord = {
    id: generateId(),
    originalRowNumber: rowNum,
    sourceFile,
    proteinName: proteinName || `未知蛋白_${rowNum}`,
    pocketCoordinates: { x: x ?? 0, y: y ?? 0, z: z ?? 0 },
    affinity,
    cameraAngle,
    imageName: imageName ? String(imageName) : undefined,
    sourceNote: sourceNote ? String(sourceNote) : undefined,
    reviewStatus: 'usable',
    createdAt: now,
    updatedAt: now,
  };

  const anomalies = detectAnomalies(record);
  if (anomalies.length > 0) {
    record.anomalyType = anomalies[0].type;
    record.anomalyNote = anomalies.map((a) => a.note).join('；');
    record.reviewStatus = determineReviewStatus(record);
  }

  return record;
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const records: PocketRecord[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row, index) => {
          try {
            const record = rowToRecord(
              row as Record<string, string | number>,
              index + 2,
              file.name,
            );
            if (record) records.push(record);
          } catch (e) {
            errors.push(`第 ${index + 2} 行解析失败: ${e}`);
          }
        });
        resolve({ records, errors });
      },
      error: (error) => {
        errors.push(`CSV解析错误: ${error.message}`);
        resolve({ records: [], errors });
      },
    });
  });
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const records: PocketRecord[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    jsonData.forEach((row, index) => {
      try {
        const record = rowToRecord(
          row as Record<string, string | number>,
          index + 2,
          file.name,
        );
        if (record) records.push(record);
      } catch (e) {
        errors.push(`第 ${index + 2} 行解析失败: ${e}`);
      }
    });
  } catch (e) {
    errors.push(`Excel解析错误: ${e}`);
  }

  return { records, errors };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSVFile(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelFile(file);
  } else {
    return {
      records: [],
      errors: [`不支持的文件格式: ${ext}`],
    };
  }
}

export function findDuplicateRecords(
  newRecords: PocketRecord[],
  existingRecords: PocketRecord[],
): PocketRecord[] {
  return newRecords.filter((nr) =>
    existingRecords.some(
      (er) =>
        er.sourceFile === nr.sourceFile &&
        er.originalRowNumber === nr.originalRowNumber,
    ),
  );
}

export function filterNewRecords(
  newRecords: PocketRecord[],
  existingRecords: PocketRecord[],
): PocketRecord[] {
  return newRecords.filter(
    (nr) =>
      !existingRecords.some(
        (er) =>
          er.sourceFile === nr.sourceFile &&
          er.originalRowNumber === nr.originalRowNumber,
      ),
  );
}
