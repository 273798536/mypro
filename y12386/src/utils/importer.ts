import * as XLSX from 'xlsx';
import type { DataType, ImportError, Instrument, Transport, CitySchedule } from '@/store/types';
import { generateId } from './dataMapper';

export type ImportResult = { valid: number; errors: ImportError[] };

export type InstrumentImport = any;
export type TransportImport = any;
export type ScheduleImport = any;

export const parseExcelFile = async (file: File, dataType?: DataType): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const validateInstrumentData = (data: any[]): { valid: any[]; errors: ImportError[] } => {
  const errors: ImportError[] = [];
  const valid: any[] = [];

  data.forEach((row, index) => {
    const rowErrors: string[] = [];

    if (!row['乐器名称'] || row['乐器名称'].toString().trim() === '') {
      rowErrors.push('乐器名称不能为空');
    }
    if (!row['乐器类型'] || row['乐器类型'].toString().trim() === '') {
      rowErrors.push('乐器类型不能为空');
    }
    if (!row['序列号'] || row['序列号'].toString().trim() === '') {
      rowErrors.push('序列号不能为空');
    }
    if (!row['所属演奏员'] || row['所属演奏员'].toString().trim() === '') {
      rowErrors.push('所属演奏员不能为空');
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((msg) => {
        errors.push({ row: index + 2, field: '数据校验', message: msg });
      });
    } else {
      valid.push({
        id: generateId('INST'),
        name: row['乐器名称'],
        type: row['乐器类型'],
        serialNumber: row['序列号'],
        owner: row['所属演奏员'],
        status: row['状态'] || '待核对',
        insuranceExpiry: row['保险到期日'] ? new Date(row['保险到期日']).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        transportId: null,
        scheduleId: null,
        exportBatchId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return { valid, errors };
};

export const validateTransportData = (data: any[], instruments: Instrument[]): { valid: any[]; errors: ImportError[] } => {
  const errors: ImportError[] = [];
  const valid: any[] = [];
  const instrumentMap = new Map(instruments.map((i) => [i.serialNumber, i.id]));

  data.forEach((row, index) => {
    const rowErrors: string[] = [];

    if (!row['乐器序列号'] || row['乐器序列号'].toString().trim() === '') {
      rowErrors.push('乐器序列号不能为空');
    } else if (!instrumentMap.has(row['乐器序列号'])) {
      rowErrors.push(`未找到序列号为 ${row['乐器序列号']} 的乐器`);
    }
    if (!row['承运方'] || row['承运方'].toString().trim() === '') {
      rowErrors.push('承运方不能为空');
    }
    if (!row['箱号'] || row['箱号'].toString().trim() === '') {
      rowErrors.push('箱号不能为空');
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((msg) => {
        errors.push({ row: index + 2, field: '数据校验', message: msg });
      });
    } else {
      valid.push({
        id: generateId('TRANS'),
        instrumentId: instrumentMap.get(row['乐器序列号']),
        carrier: row['承运方'],
        boxNumber: row['箱号'],
        departureTime: row['发运时间'] ? new Date(row['发运时间']).toISOString() : new Date().toISOString(),
        estimatedArrival: row['预计到达'] ? new Date(row['预计到达']).toISOString() : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        actualArrival: row['实际到达'] ? new Date(row['实际到达']).toISOString() : null,
        status: row['状态'] || '运输中',
        fromCity: row['出发城市'] || '北京',
        toCity: row['目的城市'] || '',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return { valid, errors };
};

export const validateScheduleData = (data: any[], instruments: Instrument[]): { valid: any[]; errors: ImportError[] } => {
  const errors: ImportError[] = [];
  const valid: any[] = [];
  const instrumentMap = new Map(instruments.map((i) => [i.serialNumber, i.id]));

  data.forEach((row, index) => {
    const rowErrors: string[] = [];

    if (!row['乐器序列号'] || row['乐器序列号'].toString().trim() === '') {
      rowErrors.push('乐器序列号不能为空');
    } else if (!instrumentMap.has(row['乐器序列号'])) {
      rowErrors.push(`未找到序列号为 ${row['乐器序列号']} 的乐器`);
    }
    if (!row['城市'] || row['城市'].toString().trim() === '') {
      rowErrors.push('城市不能为空');
    }
    if (!row['演出场地'] || row['演出场地'].toString().trim() === '') {
      rowErrors.push('演出场地不能为空');
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((msg) => {
        errors.push({ row: index + 2, field: '数据校验', message: msg });
      });
    } else {
      valid.push({
        id: generateId('SCHED'),
        instrumentId: instrumentMap.get(row['乐器序列号']),
        city: row['城市'],
        venue: row['演出场地'],
        scheduledArrival: row['计划到达'] ? new Date(row['计划到达']).toISOString() : new Date().toISOString(),
        actualArrival: row['实际到达'] ? new Date(row['实际到达']).toISOString() : null,
        status: row['状态'] || '按计划',
        concertDate: row['演出日期'] ? new Date(row['演出日期']).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  });

  return { valid, errors };
};

export const getTemplateColumns = (type: DataType): string[] => {
  switch (type) {
    case 'instrument':
      return ['乐器名称', '乐器类型', '序列号', '所属演奏员', '状态', '保险到期日'];
    case 'transport':
      return ['乐器序列号', '承运方', '箱号', '发运时间', '预计到达', '实际到达', '状态', '出发城市', '目的城市'];
    case 'schedule':
      return ['乐器序列号', '城市', '演出场地', '计划到达', '实际到达', '状态', '演出日期'];
    default:
      return [];
  }
};

export const downloadTemplate = (type: DataType) => {
  const columns = getTemplateColumns(type);
  const worksheet = XLSX.utils.aoa_to_sheet([columns]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const fileName = type === 'instrument' ? '乐器清单模板.xlsx' : type === 'transport' ? '运输单模板.xlsx' : '城市日程模板.xlsx';
  XLSX.writeFile(workbook, fileName);
};

export const validateData = (type: DataType, data: any[], instruments: Instrument[]) => {
  switch (type) {
    case 'instrument':
      return validateInstrumentData(data);
    case 'transport':
      return validateTransportData(data, instruments);
    case 'schedule':
      return validateScheduleData(data, instruments);
    default:
      return { valid: [], errors: [] };
  }
};

export const validateImportData = (type: DataType, data: any[], instruments: Instrument[]): ImportResult => {
  const result = validateData(type, data, instruments);
  return { valid: result.valid.length, errors: result.errors };
};
