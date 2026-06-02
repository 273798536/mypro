import * as XLSX from 'xlsx';
import {
  TemperatureReading,
  CargoBatch,
  MaintenanceNote,
  SensorInfo,
  ImportFileType,
  DataQualityIssue,
} from '@/types';
import { generateId, parseCSV } from './helpers';

export interface ParsedData {
  temperatureData: TemperatureReading[];
  cargoBatches: CargoBatch[];
  maintenanceNotes: MaintenanceNote[];
  sensors: SensorInfo[];
  completeness: number;
}

export interface FileParseResult {
  fileType: ImportFileType;
  fileName: string;
  data: TemperatureReading[] | CargoBatch[] | MaintenanceNote[];
  sensors: SensorInfo[];
  recordCount: number;
  validCount: number;
  errors: string[];
}

const normalizeFieldName = (field: string): string => {
  return field.toLowerCase().replace(/[-_\s]/g, '');
};

const findFieldValue = (row: Record<string, unknown>, possibleNames: string[]): string => {
  for (const name of possibleNames) {
    const normalized = normalizeFieldName(name);
    for (const [key, value] of Object.entries(row)) {
      if (normalizeFieldName(key) === normalized) {
        return String(value ?? '');
      }
    }
  }
  return '';
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  
  const timestamp = Date.parse(value);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }
  
  const formats = [
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
  ];
  
  for (const regex of formats) {
    const match = value.match(regex);
    if (match) {
      const [, p1, p2, p3, h, m, s = '0'] = match;
      const year = p1.length === 4 ? parseInt(p1) : parseInt(p3);
      const month = p1.length === 4 ? parseInt(p2) - 1 : parseInt(p1) - 1;
      const day = p1.length === 4 ? parseInt(p3) : parseInt(p2);
      return new Date(year, month, day, parseInt(h), parseInt(m), parseInt(s));
    }
  }
  
  return null;
};

const parseFloatSafe = (value: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const result = parseFloat(cleaned);
  return isNaN(result) ? null : result;
};

export const parseFileContent = async (
  file: File,
  fileType: ImportFileType,
  batchId: string
): Promise<FileParseResult> => {
  const errors: string[] = [];
  const text = await file.text();
  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  if (file.name.endsWith('.csv')) {
    const parsed = parseCSV(text);
    headers = parsed[0] || [];
    rows = parsed.slice(1).map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || '';
      });
      return obj;
    });
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
    headers = jsonData[0] || [];
    rows = jsonData.slice(1).map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || '';
      });
      return obj;
    });
  }

  const sensorSet = new Set<string>();
  let validCount = 0;

  if (fileType === 'temperature') {
    const data: TemperatureReading[] = [];
    
    rows.forEach((row, index) => {
      const sensorId = findFieldValue(row, ['sensorId', 'sensor_id', 'sensor', '传感器ID', '传感器']);
      const timestampStr = findFieldValue(row, ['timestamp', 'time', 'date', '时间', '采样时间', 'timestamp_local']);
      const tempStr = findFieldValue(row, ['temperature', 'temp', 'value', '温度', '温度值']);
      
      if (!sensorId) {
        errors.push(`第${index + 2}行: 缺少传感器ID`);
        return;
      }
      
      const timestamp = parseDate(timestampStr);
      if (!timestamp) {
        errors.push(`第${index + 2}行: 时间格式无法解析 "${timestampStr}"`);
        return;
      }
      
      const temperature = parseFloatSafe(tempStr);
      if (temperature === null) {
        errors.push(`第${index + 2}行: 温度值格式错误 "${tempStr}"`);
        return;
      }

      sensorSet.add(sensorId);
      validCount++;
      
      const qualityFlag: DataQualityIssue | null = null;
      
      data.push({
        id: generateId(),
        batchId,
        sensorId,
        timestamp,
        temperature,
        isOriginal: true,
        qualityFlag,
      });
    });

    const sensors: SensorInfo[] = Array.from(sensorSet).map((sensorId) => ({
      sensorId,
      name: `传感器${sensorId}`,
      location: `${sensorId}区域`,
      status: 'online' as const,
      lastReading: data.find((d) => d.sensorId === sensorId)?.timestamp,
    }));

    return {
      fileType,
      fileName: file.name,
      data,
      sensors,
      recordCount: rows.length,
      validCount,
      errors: errors.slice(0, 50),
    };
  } else if (fileType === 'cargo') {
    const data: CargoBatch[] = [];
    
    rows.forEach((row, index) => {
      const cargoId = findFieldValue(row, ['cargoId', 'cargo_id', 'cargo', '货品ID', '货品编号', '批次号']);
      const productName = findFieldValue(row, ['productName', 'product_name', 'product', '货品名称', '产品名称', '名称']);
      const startTimeStr = findFieldValue(row, ['startTime', 'start_time', 'start', '开始时间', '入库时间', '起始时间']);
      const endTimeStr = findFieldValue(row, ['endTime', 'end_time', 'end', '结束时间', '出库时间', '截止时间']);
      const location = findFieldValue(row, ['location', 'loc', '位置', '存放位置', '区域', '库位']);
      const minTempStr = findFieldValue(row, ['minTemp', 'min_temp', 'min', '最低温度', '最小温度', '温度下限']);
      const maxTempStr = findFieldValue(row, ['maxTemp', 'max_temp', 'max', '最高温度', '最大温度', '温度上限']);
      
      if (!cargoId) {
        errors.push(`第${index + 2}行: 缺少货品ID`);
        return;
      }
      
      const startTime = parseDate(startTimeStr);
      if (!startTime) {
        errors.push(`第${index + 2}行: 开始时间格式无法解析 "${startTimeStr}"`);
        return;
      }
      
      const endTime = parseDate(endTimeStr);
      if (!endTime) {
        errors.push(`第${index + 2}行: 结束时间格式无法解析 "${endTimeStr}"`);
        return;
      }

      validCount++;
      
      data.push({
        id: generateId(),
        batchId,
        cargoId,
        productName: productName || `货品${cargoId}`,
        startTime,
        endTime,
        location: location || '默认区域',
        minTemp: parseFloatSafe(minTempStr) ?? -18,
        maxTemp: parseFloatSafe(maxTempStr) ?? -5,
      });
    });

    return {
      fileType,
      fileName: file.name,
      data,
      sensors: [],
      recordCount: rows.length,
      validCount,
      errors: errors.slice(0, 50),
    };
  } else {
    const data: MaintenanceNote[] = [];
    
    rows.forEach((row, index) => {
      const sensorId = findFieldValue(row, ['sensorId', 'sensor_id', 'sensor', '传感器ID', '传感器']);
      const eventTimeStr = findFieldValue(row, ['eventTime', 'event_time', 'time', '时间', '事件时间', '维修时间']);
      const eventType = findFieldValue(row, ['eventType', 'event_type', 'type', '类型', '事件类型', '维修类型']);
      const description = findFieldValue(row, ['description', 'desc', 'remark', '描述', '备注', '说明', '详情']);
      const operator = findFieldValue(row, ['operator', 'user', '操作人', '操作人员', '负责人']);
      
      if (!sensorId) {
        errors.push(`第${index + 2}行: 缺少传感器ID`);
        return;
      }
      
      const eventTime = parseDate(eventTimeStr);
      if (!eventTime) {
        errors.push(`第${index + 2}行: 事件时间格式无法解析 "${eventTimeStr}"`);
        return;
      }

      validCount++;
      
      data.push({
        id: generateId(),
        batchId,
        sensorId,
        eventTime,
        eventType: eventType || '常规检查',
        description: description || '',
        operator: operator || '系统管理员',
      });
    });

    return {
      fileType,
      fileName: file.name,
      data,
      sensors: [],
      recordCount: rows.length,
      validCount,
      errors: errors.slice(0, 50),
    };
  }
};

export const mergeParsedData = (
  parseResults: FileParseResult[],
  batchId: string
): ParsedData => {
  let temperatureData: TemperatureReading[] = [];
  let cargoBatches: CargoBatch[] = [];
  let maintenanceNotes: MaintenanceNote[] = [];
  const sensorMap = new Map<string, SensorInfo>();

  parseResults.forEach((result) => {
    if (result.fileType === 'temperature') {
      temperatureData = temperatureData.concat(result.data as TemperatureReading[]);
      result.sensors.forEach((s) => {
        if (!sensorMap.has(s.sensorId)) {
          sensorMap.set(s.sensorId, s);
        }
      });
    } else if (result.fileType === 'cargo') {
      cargoBatches = cargoBatches.concat(result.data as CargoBatch[]);
    } else {
      maintenanceNotes = maintenanceNotes.concat(result.data as MaintenanceNote[]);
    }
  });

  temperatureData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const sensorIds = Array.from(new Set(temperatureData.map((t) => t.sensorId)));
  const sensors: SensorInfo[] = sensorIds.map((sensorId) => {
    const existing = sensorMap.get(sensorId);
    const sensorReadings = temperatureData.filter((t) => t.sensorId === sensorId);
    const lastReading = sensorReadings[sensorReadings.length - 1]?.timestamp;
    
    return {
      sensorId,
      name: existing?.name || `传感器${sensorId}`,
      location: existing?.location || `${sensorId}区域`,
      status: 'online' as const,
      lastReading: lastReading ? new Date(lastReading) : undefined,
    };
  });

  const totalRecords = parseResults.reduce((sum, r) => sum + r.recordCount, 0);
  const validRecords = parseResults.reduce((sum, r) => sum + r.validCount, 0);
  const completeness = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 0;

  return {
    temperatureData,
    cargoBatches,
    maintenanceNotes,
    sensors,
    completeness,
  };
};

export const generateSampleFile = (fileType: ImportFileType): string => {
  if (fileType === 'temperature') {
    const now = new Date();
    let csv = 'sensorId,timestamp,temperature\n';
    for (let i = 0; i < 10; i++) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const temp = -15 + Math.random() * 3;
      csv += `S00${i % 3 + 1},${time.toISOString()},${temp.toFixed(2)}\n`;
    }
    return csv;
  } else if (fileType === 'cargo') {
    return `cargoId,productName,startTime,endTime,location,minTemp,maxTemp
B001,冷冻牛肉,2026-06-01 08:00:00,2026-06-03 18:00:00,冷库A区,-25,-15
B002,海鲜水产,2026-06-01 10:00:00,2026-06-02 14:00:00,冷库B区,-20,-10`;
  } else {
    return `sensorId,eventTime,eventType,description,operator
S001,2026-06-01 09:00:00,定期校准,温度传感器月度校准,张工
S002,2026-06-01 14:30:00,故障维修,传感器信号异常修复,李工`;
  }
};
