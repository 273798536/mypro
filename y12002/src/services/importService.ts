import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  MemberAccount,
  MileageTransaction,
  ExchangeOrder,
  ExpireCalendar,
  BadRecord,
  ImportResult,
  SourceType,
} from '@/types';
import { DataValidator } from './businessRules';
import { generateBatchNo, formatDateTime } from '@/utils/date';
import { generateId } from '@/utils/date';

export class ImportService {
  private validator: DataValidator;

  constructor() {
    this.validator = new DataValidator();
  }

  async parseFile(file: File): Promise<any[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(file);
    } else if (extension === 'csv') {
      return this.parseCSV(file);
    } else {
      throw new Error('不支持的文件格式，请上传Excel(.xlsx, .xls)或CSV(.csv)文件');
    }
  }

  private async parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            defval: '',
            raw: false,
          });
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Excel文件解析失败: ' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsBinaryString(file);
    });
  }

  private async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('CSV解析错误: ' + results.errors[0].message));
          } else {
            resolve(results.data as any[]);
          }
        },
        error: (error) => reject(new Error('CSV解析失败: ' + error.message)),
      });
    });
  }

  private convertRowTypes(row: any, sourceType: SourceType): any {
    const converted = { ...row };
    
    const numberFields: Record<SourceType, string[]> = {
      '会员账户': ['totalMiles', 'usedMiles', 'remainingMiles'],
      '里程流水': ['miles'],
      '兑换订单': ['miles', 'amount'],
      '过期日历': ['milesToExpire', 'actualExpiredMiles'],
    };

    const booleanFields: Record<SourceType, string[]> = {
      '会员账户': [],
      '里程流水': [],
      '兑换订单': [],
      '过期日历': ['isExpired'],
    };

    numberFields[sourceType]?.forEach(field => {
      if (converted[field] !== undefined && converted[field] !== '') {
        const num = Number(converted[field]);
        converted[field] = isNaN(num) ? converted[field] : num;
      }
    });

    booleanFields[sourceType]?.forEach(field => {
      if (converted[field] !== undefined) {
        if (typeof converted[field] === 'boolean') {
          converted[field] = converted[field];
        } else if (typeof converted[field] === 'string') {
          const lower = converted[field].toLowerCase();
          converted[field] = lower === 'true' || lower === '是' || lower === '1';
        } else {
          converted[field] = Boolean(converted[field]);
        }
      }
    });

    return converted;
  }

  async importData(
    sourceType: SourceType,
    file: File
  ): Promise<ImportResult> {
    const batchNo = generateBatchNo('IMP');
    
    try {
      const rows = await this.parseFile(file);
      const convertedRows = rows.map(row => this.convertRowTypes(row, sourceType));
      
      let validationResult;
      
      switch (sourceType) {
        case '会员账户':
          validationResult = this.validator.validateMemberAccount(convertedRows, file.name, batchNo);
          break;
        case '里程流水':
          validationResult = this.validator.validateMileageTransaction(convertedRows, file.name, batchNo);
          break;
        case '兑换订单':
          validationResult = this.validator.validateExchangeOrder(convertedRows, file.name, batchNo);
          break;
        case '过期日历':
          validationResult = this.validator.validateExpireCalendar(convertedRows, file.name, batchNo);
          break;
        default:
          throw new Error('未知的数据源类型');
      }

      const validDataWithIds = validationResult.data.map(item => ({
        ...item,
        id: generateId(sourceType === '会员账户' ? 'MEM' : sourceType === '里程流水' ? 'TRX' : sourceType === '兑换订单' ? 'ORD' : 'EXP'),
        createTime: formatDateTime(new Date()),
        updateTime: formatDateTime(new Date()),
      }));

      return {
        success: true,
        totalRows: validationResult.stats.totalRows,
        validRows: validationResult.stats.validRows,
        badRows: validationResult.stats.badRows,
        badRecords: validationResult.badRecords,
        batchNo,
      };
    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        validRows: 0,
        badRows: 0,
        badRecords: [],
        batchNo,
      };
    }
  }

  generateTemplate(sourceType: SourceType): { headers: string[]; sampleData: any[] } {
    const templates: Record<SourceType, { headers: string[]; sampleData: any[] }> = {
      '会员账户': {
        headers: ['memberNo', 'memberName', 'accountType', 'totalMiles', 'usedMiles', 'remainingMiles', 'expireDate', 'lastTransactionDate', 'remark'],
        sampleData: [
          { memberNo: 'MEM-000001', memberName: '张三', accountType: '普通', totalMiles: 50000, usedMiles: 20000, remainingMiles: 30000, expireDate: '2025-12-31', lastTransactionDate: '2024-05-01', remark: '' },
        ],
      },
      '里程流水': {
        headers: ['memberNo', 'transactionType', 'businessType', 'miles', 'transactionDate', 'orderNo', 'activityId', 'description', 'operator', 'status', 'remark'],
        sampleData: [
          { memberNo: 'MEM-000001', transactionType: '累积', businessType: '正常', miles: 5000, transactionDate: '2024-05-01', orderNo: '', activityId: '', description: '航班飞行累积', operator: '系统', status: '已完成', remark: '' },
        ],
      },
      '兑换订单': {
        headers: ['orderNo', 'memberNo', 'exchangeType', 'miles', 'amount', 'applyDate', 'status', 'auditor', 'auditTime', 'payoutTime', 'rejectReason', 'remark'],
        sampleData: [
          { orderNo: 'ORD-2024000001', memberNo: 'MEM-000001', exchangeType: '机票', miles: 15000, amount: 1500, applyDate: '2024-05-01', status: '已兑付', auditor: '李主管', auditTime: '2024-05-02', payoutTime: '2024-05-03', rejectReason: '', remark: '' },
        ],
      },
      '过期日历': {
        headers: ['memberNo', 'batchNo', 'expireDate', 'milesToExpire', 'actualExpiredMiles', 'isExpired', 'expireReason', 'processStatus', 'processor', 'processTime', 'remark'],
        sampleData: [
          { memberNo: 'MEM-000001', batchNo: 'EXP-BATCH-2024-0001', expireDate: '2024-06-30', milesToExpire: 10000, actualExpiredMiles: 10000, isExpired: true, expireReason: '里程有效期已满', processStatus: '未处理', processor: '', processTime: '', remark: '' },
        ],
      },
    };

    return templates[sourceType];
  }
}
