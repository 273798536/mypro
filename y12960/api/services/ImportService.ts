import XLSX from 'xlsx';
import Papa from 'papaparse';
import type {
  ChangeRecord,
  ImportResult,
  SchemaField,
  SourceInfo,
  ChangeType,
  RecordStatus,
} from '../../shared/types';
import { anomalyDetectionService } from './AnomalyDetectionService';
import { changeRepository } from '../repositories/ChangeRepository';

interface RawImportRecord {
  recordNo?: string;
  tableName?: string;
  fieldName?: string;
  changeType?: string;
  status?: string;
  ticketNo?: string;
  businessDesc?: string;
  materialLink?: string;
  requester?: string;
  before_name?: string;
  before_type?: string;
  before_nullable?: string;
  before_default?: string;
  before_comment?: string;
  before_length?: string;
  before_precision?: string;
  after_name?: string;
  after_type?: string;
  after_nullable?: string;
  after_default?: string;
  after_comment?: string;
  after_length?: string;
  after_precision?: string;
  handlingOpinion?: string;
}

export class ImportService {
  async parseFile(file: Express.Multer.File): Promise<RawImportRecord[]> {
    const buffer = file.buffer;
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return this.parseCsv(buffer);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(buffer);
    }

    throw new Error(`不支持的文件格式: ${extension}`);
  }

  private parseCsv(buffer: Buffer): RawImportRecord[] {
    const result = Papa.parse(buffer.toString('utf-8'), {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
    });

    return result.data as RawImportRecord[];
  }

  private parseExcel(buffer: Buffer): RawImportRecord[] {
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet) as RawImportRecord[];
  }

  validateRecords(records: RawImportRecord[]): { valid: RawImportRecord[]; errors: string[] } {
    const errors: string[] = [];
    const valid: RawImportRecord[] = [];

    records.forEach((record, index) => {
      const rowErrors: string[] = [];

      if (!record.recordNo) {
        rowErrors.push('缺少记录编号');
      }
      if (!record.tableName) {
        rowErrors.push('缺少表名');
      }
      if (!record.fieldName) {
        rowErrors.push('缺少字段名');
      }
      if (!record.changeType) {
        rowErrors.push('缺少变更类型');
      } else if (!['ADD', 'MODIFY', 'DELETE', 'RENAME'].includes(record.changeType)) {
        rowErrors.push(`变更类型无效: ${record.changeType}，应为 ADD/MODIFY/DELETE/RENAME`);
      }

      if (rowErrors.length > 0) {
        errors.push(`第 ${index + 1} 行: ${rowErrors.join('; ')}`);
      } else {
        valid.push(record);
      }
    });

    return { valid, errors };
  }

  transformRecord(raw: RawImportRecord): Omit<ChangeRecord, 'id' | 'createdAt' | 'updatedAt' | 'anomalies'> {
    const parseBool = (val: string | undefined): boolean => {
      if (val === undefined || val === null) return false;
      const strVal = String(val).toLowerCase().trim();
      return ['true', '1', 'yes', '是', 'Y'].includes(strVal);
    };

    const parseNum = (val: string | undefined): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseInt(String(val), 10);
      return isNaN(num) ? undefined : num;
    };

    const schemaBefore: SchemaField = {
      name: raw.before_name || raw.fieldName || '',
      type: raw.before_type || '',
      nullable: parseBool(raw.before_nullable),
      defaultValue: raw.before_default || '',
      comment: raw.before_comment || '',
      length: parseNum(raw.before_length),
      precision: parseNum(raw.before_precision),
    };

    const schemaAfter: SchemaField = {
      name: raw.after_name || raw.fieldName || '',
      type: raw.after_type || '',
      nullable: parseBool(raw.after_nullable),
      defaultValue: raw.after_default || '',
      comment: raw.after_comment || '',
      length: parseNum(raw.after_length),
      precision: parseNum(raw.after_precision),
    };

    const sourceInfo: SourceInfo = {
      ticketNo: raw.ticketNo || '',
      businessDesc: raw.businessDesc || '',
      materialLink: raw.materialLink || '',
      requester: raw.requester || '',
    };

    return {
      recordNo: raw.recordNo || '',
      tableName: raw.tableName || '',
      fieldName: raw.fieldName || '',
      changeType: (raw.changeType as ChangeType) || 'MODIFY',
      status: (raw.status as RecordStatus) || 'PENDING_REVIEW',
      sourceInfo,
      schemaBefore,
      schemaAfter,
      handlingOpinion: raw.handlingOpinion || '',
      createdBy: 'user_2',
    };
  }

  async importFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<ImportResult> {
    const rawRecords = await this.parseFile(file);
    const { valid, errors } = this.validateRecords(rawRecords);

    const transformedRecords = valid.map((r) => ({
      ...this.transformRecord(r),
      createdBy: userId,
    }));

    const existingRecords = await changeRepository.findAll({}, 1, 10000);
    const existingRecordNos = existingRecords.data.map((r) => r.recordNo);

    const duplicateAnomalies = anomalyDetectionService.detectDuplicates(
      transformedRecords,
      existingRecordNos
    );

    const result: ImportResult = {
      total: rawRecords.length,
      success: 0,
      failed: errors.length,
      duplicates: 0,
      anomalies: 0,
      records: [],
      errors,
    };

    for (let i = 0; i < transformedRecords.length; i++) {
      const record = transformedRecords[i];
      const anomalies = anomalyDetectionService.detectAll(record);

      const rowDuplicates = duplicateAnomalies.get(i) || [];
      anomalies.push(...rowDuplicates);

      if (rowDuplicates.length > 0 && rowDuplicates.some((a) => a.type === 'DUPLICATE')) {
        result.duplicates++;
      }

      if (anomalies.length > 0) {
        result.anomalies++;
      }

      try {
        const hasHighSeverityDuplicate = rowDuplicates.some(
          (a) => a.type === 'DUPLICATE' && a.severity === 'HIGH'
        );

        if (hasHighSeverityDuplicate) {
          errors.push(`记录 ${record.recordNo} 已存在，跳过导入`);
          result.failed++;
          continue;
        }

        const created = await changeRepository.create({
          ...record,
          anomalies,
        });
        result.records.push(created);
        result.success++;
      } catch (e) {
        const error = e as Error;
        errors.push(`记录 ${record.recordNo} 导入失败: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  generateTemplate(): Buffer {
    const headers = [
      'recordNo',
      'tableName',
      'fieldName',
      'changeType',
      'status',
      'ticketNo',
      'businessDesc',
      'materialLink',
      'requester',
      'before_name',
      'before_type',
      'before_nullable',
      'before_default',
      'before_comment',
      'before_length',
      'before_precision',
      'after_name',
      'after_type',
      'after_nullable',
      'after_default',
      'after_comment',
      'after_length',
      'after_precision',
      'handlingOpinion',
    ];

    const sampleData = [
      {
        recordNo: 'REC-2026-001',
        tableName: 'user_order',
        fieldName: 'pay_amount',
        changeType: 'MODIFY',
        status: 'PENDING_REVIEW',
        ticketNo: 'TICKET-12345',
        businessDesc: '支付金额字段精度调整',
        materialLink: 'https://wiki.example.com/ticket/12345',
        requester: '业务部-小王',
        before_name: 'pay_amount',
        before_type: 'decimal(10,2)',
        before_nullable: 'false',
        before_default: '0.00',
        before_comment: '支付金额',
        before_length: '10',
        before_precision: '2',
        after_name: 'pay_amount',
        after_type: 'decimal(12,2)',
        after_nullable: 'false',
        after_default: '0.00',
        after_comment: '支付金额',
        after_length: '12',
        after_precision: '2',
        handlingOpinion: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '数据字典变更');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const importService = new ImportService();
