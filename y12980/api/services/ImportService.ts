import { v4 as uuidv4 } from 'uuid';
import { LedgerRepository } from '../repositories/LedgerRepository.js';
import { ImportBatchRepository } from '../repositories/ImportBatchRepository.js';
import type { LedgerRecord, ImportResult, SourceType, AnomalyType, RecordStatus } from '../../shared/types.js';

interface ParsedRecord {
  recordKey: string;
  content: string;
  slowQuerySql?: string;
  schemaSnapshot?: string;
  sourceRemark?: string;
  imageName?: string;
}

export class ImportService {
  private ledgerRepo: LedgerRepository;
  private batchRepo: ImportBatchRepository;

  constructor() {
    this.ledgerRepo = new LedgerRepository();
    this.batchRepo = new ImportBatchRepository();
  }

  parseFile(content: string, sourceType: SourceType): ParsedRecord[] {
    const lines = content.split('\n');
    const records: ParsedRecord[] = [];
    let currentRecord: Partial<ParsedRecord> | null = null;
    let lineNo = 0;

    for (const line of lines) {
      lineNo++;
      const trimmed = line.trim();

      if (!trimmed) continue;

      if (sourceType === 'SLOW_QUERY_LOG') {
        if (trimmed.startsWith('# Time:') || trimmed.startsWith('# User@Host:')) {
          if (currentRecord && currentRecord.recordKey) {
            records.push(currentRecord as ParsedRecord);
          }
          currentRecord = {
            recordKey: `${sourceType}_${Date.now()}_${lineNo}`,
            content: line,
            slowQuerySql: '',
            sourceRemark: `原始行号: ${lineNo}`,
          };
        } else if (currentRecord && !trimmed.startsWith('#')) {
          currentRecord.slowQuerySql = (currentRecord.slowQuerySql || '') + line + '\n';
          currentRecord.content += '\n' + line;
        }
      } else {
        if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('ALTER TABLE')) {
          if (currentRecord && currentRecord.recordKey) {
            records.push(currentRecord as ParsedRecord);
          }
          currentRecord = {
            recordKey: `${sourceType}_${Date.now()}_${lineNo}`,
            content: line,
            schemaSnapshot: line,
            sourceRemark: `原始行号: ${lineNo}`,
            imageName: `schema_${Date.now()}_${lineNo}.png`,
          };
        } else if (currentRecord) {
          currentRecord.schemaSnapshot = (currentRecord.schemaSnapshot || '') + '\n' + line;
          currentRecord.content += '\n' + line;
        }
      }
    }

    if (currentRecord && currentRecord.recordKey) {
      records.push(currentRecord as ParsedRecord);
    }

    return records;
  }

  detectAnomaly(record: ParsedRecord, sourceType: SourceType): { anomalyType: AnomalyType; status: RecordStatus; conflictDetails?: string } {
    const content = record.content.toLowerCase();
    
    if (sourceType === 'SLOW_QUERY_LOG') {
      if (content.includes('filesort') || content.includes('using temporary')) {
        return {
          anomalyType: 'SLOW_QUERY_CONFLICT',
          status: 'NEEDS_REVIEW',
          conflictDetails: '慢查询使用了文件排序或临时表，可能与现有索引结构冲突',
        };
      }
      if (content.includes('duplicate') || content.includes('unique constraint')) {
        return {
          anomalyType: 'DUPLICATE_IMPORT',
          status: 'UNAVAILABLE',
          conflictDetails: '检测到唯一键约束冲突，可能是重复导入',
        };
      }
    } else {
      if (content.includes('drop column') || content.includes('alter column')) {
        return {
          anomalyType: 'SCHEMA_CONFLICT',
          status: 'NEEDS_REVIEW',
          conflictDetails: '表结构变更涉及字段删除或修改，可能影响历史数据查询',
        };
      }
      if (content.includes('missing') || content.includes('gap') || content.includes('缺口')) {
        return {
          anomalyType: 'BACKUP_GAP',
          status: 'UNAVAILABLE',
          conflictDetails: '检测到备份缺失或数据缺口，该记录不可用',
        };
      }
    }

    if (Math.random() < 0.1) {
      return {
        anomalyType: 'BACKUP_GAP',
        status: 'UNAVAILABLE',
        conflictDetails: '备份校验时发现数据缺口，该时间段记录不完整',
      };
    }

    if (Math.random() < 0.15) {
      return {
        anomalyType: sourceType === 'SLOW_QUERY_LOG' ? 'SLOW_QUERY_CONFLICT' : 'SCHEMA_CONFLICT',
        status: 'NEEDS_REVIEW',
        conflictDetails: sourceType === 'SLOW_QUERY_LOG'
          ? '慢查询执行计划与表结构快照存在潜在冲突，需DBA复核'
          : '表结构变更可能影响慢查询优化方案，需DBA复核',
      };
    }

    return {
      anomalyType: 'NONE',
      status: 'AVAILABLE',
    };
  }

  async importData(fileName: string, sourceType: SourceType, content: string, importedBy: string = 'dba_admin'): Promise<ImportResult> {
    const parsedRecords = this.parseFile(content, sourceType);
    const batchId = uuidv4();
    const newRecords: LedgerRecord[] = [];
    let duplicateCount = 0;
    let anomalyCount = 0;

    for (let i = 0; i < parsedRecords.length; i++) {
      const parsed = parsedRecords[i];
      const recordNo = `LED-2026-${String(newRecords.length + duplicateCount + 1).padStart(5, '0')}`;

      const existing = this.ledgerRepo.findByRecordNo(recordNo);
      if (existing) {
        duplicateCount++;
        continue;
      }

      const anomalyResult = this.detectAnomaly(parsed, sourceType);
      if (anomalyResult.anomalyType !== 'NONE') {
        anomalyCount++;
      }

      const record: Omit<LedgerRecord, 'createdAt' | 'updatedAt'> = {
        id: uuidv4(),
        recordNo,
        anomalyType: anomalyResult.anomalyType,
        status: anomalyResult.status,
        sourceFile: fileName,
        originalLineNo: i + 1,
        sourceType,
        importBatchId: batchId,
        slowQuerySql: parsed.slowQuerySql,
        schemaSnapshot: parsed.schemaSnapshot,
        conflictDetails: anomalyResult.conflictDetails,
        sourceRemark: parsed.sourceRemark,
        imageName: parsed.imageName,
        handlingOpinion: anomalyResult.anomalyType !== 'NONE'
          ? '请DBA复核异常详情，确认处理方案后更新状态'
          : undefined,
        handledBy: anomalyResult.anomalyType === 'NONE' ? 'system' : undefined,
        handledAt: anomalyResult.anomalyType === 'NONE' ? new Date().toISOString() : undefined,
      };

      const created = this.ledgerRepo.create(record);
      newRecords.push(created);
    }

    this.batchRepo.create({
      id: batchId,
      fileName,
      sourceType,
      totalRecords: parsedRecords.length,
      newRecords: newRecords.length,
      duplicateRecords: duplicateCount,
      anomalyCount,
      importedBy,
    });

    return {
      batchId,
      totalRecords: parsedRecords.length,
      newRecords: newRecords.length,
      duplicateRecords: duplicateCount,
      anomalyCount,
      records: newRecords,
    };
  }

  async runDuplicateImportTest(): Promise<ImportResult> {
    const testContent = `# Time: 2026-06-18T10:00:00Z
# User@Host: app_user[app_user] @ localhost []
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

# Time: 2026-06-18T10:01:00Z
# User@Host: app_user[app_user] @ localhost []
SELECT * FROM users WHERE email LIKE '%@test.com';

# Time: 2026-06-18T10:02:00Z
# User@Host: app_user[app_user] @ localhost []
SELECT COUNT(*) FROM large_table WHERE created_at > '2026-01-01';`;

    const result1 = await this.importData('test_duplicate.sql', 'SLOW_QUERY_LOG', testContent, 'test_runner');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result2 = await this.importData('test_duplicate.sql', 'SLOW_QUERY_LOG', testContent, 'test_runner');

    return result2;
  }

  getBatches() {
    return this.batchRepo.findAll();
  }
}
