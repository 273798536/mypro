import type { Anomaly, ChangeRecord, SchemaField, SourceInfo } from '../../shared/types';

export class AnomalyDetectionService {
  detectAll(
    record: Omit<ChangeRecord, 'id' | 'createdAt' | 'updatedAt' | 'anomalies'>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    anomalies.push(...this.detectNullValues(record.schemaBefore, record.schemaAfter));
    anomalies.push(...this.detectMixedNotes(record.schemaBefore, record.schemaAfter));
    anomalies.push(...this.detectBackupGap(record.sourceInfo));
    anomalies.push(...this.detectSchemaInconsistency(record.schemaBefore, record.schemaAfter));

    return anomalies;
  }

  detectNullValues(before: SchemaField, after: SchemaField): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    if (!after.name && after.name !== '') {
      anomalies.push({
        type: 'NULL_VALUE',
        description: '字段名称为空',
        severity: 'HIGH',
        detectedAt: now,
      });
    }

    if (!after.type && after.type !== '') {
      anomalies.push({
        type: 'NULL_VALUE',
        description: '字段类型为空',
        severity: 'HIGH',
        detectedAt: now,
      });
    }

    if (before.nullable === false && after.nullable === true && !after.defaultValue) {
      anomalies.push({
        type: 'NULL_VALUE',
        description: '非空字段改为可空但未设置默认值，可能导致空值问题',
        severity: 'MEDIUM',
        detectedAt: now,
      });
    }

    if (after.defaultValue === 'NULL' || after.defaultValue === 'null') {
      anomalies.push({
        type: 'NULL_VALUE',
        description: '默认值设置为NULL，需要确认是否合理',
        severity: 'LOW',
        detectedAt: now,
      });
    }

    return anomalies;
  }

  detectMixedNotes(before: SchemaField, after: SchemaField): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    const mixedPatterns = [
      /TODO|FIXME|XXX|HACK/i,
      /待确认|待处理|待完善|临时|测试/i,
      /可能|大概|应该|貌似|似乎/i,
      /\?{2,}/,
      /!{2,}/,
    ];

    const fieldsToCheck = [
      { value: after.comment, field: '注释' },
      { value: after.defaultValue, field: '默认值' },
      { value: before.comment, field: '原注释' },
    ];

    for (const field of fieldsToCheck) {
      if (!field.value) continue;

      for (const pattern of mixedPatterns) {
        if (pattern.test(field.value)) {
          anomalies.push({
            type: 'MIXED_NOTES',
            description: `${field.field}中包含不确定的备注内容: "${field.value}"`,
            severity: 'MEDIUM',
            detectedAt: now,
          });
          break;
        }
      }
    }

    if (after.comment && before.comment) {
      const beforeHasMeta = /^\[.*\]/.test(before.comment);
      const afterHasMeta = /^\[.*\]/.test(after.comment);
      if (beforeHasMeta && !afterHasMeta) {
        anomalies.push({
          type: 'MIXED_NOTES',
          description: '原注释包含元数据标记，新注释丢失了标记格式',
          severity: 'LOW',
          detectedAt: now,
        });
      }
    }

    return anomalies;
  }

  detectBackupGap(sourceInfo: SourceInfo): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    if (!sourceInfo.materialLink) {
      anomalies.push({
        type: 'BACKUP_GAP',
        description: '缺少原始材料链接，无法追溯变更来源',
        severity: 'HIGH',
        detectedAt: now,
      });
    }

    if (!sourceInfo.ticketNo) {
      anomalies.push({
        type: 'BACKUP_GAP',
        description: '缺少工单编号，无法关联业务审批流程',
        severity: 'MEDIUM',
        detectedAt: now,
      });
    }

    if (!sourceInfo.businessDesc) {
      anomalies.push({
        type: 'BACKUP_GAP',
        description: '缺少业务描述，变更背景不明确',
        severity: 'LOW',
        detectedAt: now,
      });
    }

    return anomalies;
  }

  detectSchemaInconsistency(before: SchemaField, after: SchemaField): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const now = new Date().toISOString();

    if (before.type && after.type && before.type !== after.type) {
      const typeChangeRisk = this.assessTypeChangeRisk(before.type, after.type);
      if (typeChangeRisk) {
        anomalies.push({
          type: 'OTHER',
          description: `类型变更风险: ${before.type} -> ${after.type}，${typeChangeRisk}`,
          severity: 'MEDIUM',
          detectedAt: now,
        });
      }
    }

    if (
      before.length &&
      after.length &&
      after.length < before.length &&
      before.type.includes('varchar')
    ) {
      anomalies.push({
        type: 'OTHER',
        description: `字段长度缩小: ${before.length} -> ${after.length}，可能导致数据截断`,
        severity: 'HIGH',
        detectedAt: now,
      });
    }

    return anomalies;
  }

  private assessTypeChangeRisk(from: string, to: string): string | null {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    if (fromLower.includes('int') && toLower.includes('varchar')) {
      return '数字转字符串需要确认数据格式兼容性';
    }

    if (fromLower.includes('varchar') && toLower.includes('int')) {
      return '字符串转数字存在转换失败风险，需要确保所有数据可转换';
    }

    if (fromLower.includes('datetime') && toLower.includes('date')) {
      return '日期时间转日期会丢失时间信息';
    }

    if (fromLower.includes('decimal') && toLower.includes('int')) {
      return '高精度转整数会丢失小数部分';
    }

    if (fromLower.includes('bigint') && toLower.includes('int')) {
      return '大整数转普通整数可能溢出';
    }

    return null;
  }

  detectDuplicates(
    records: Array<Omit<ChangeRecord, 'id' | 'createdAt' | 'updatedAt' | 'anomalies'>>,
    existingRecordNos: string[]
  ): Map<number, Anomaly[]> {
    const result = new Map<number, Anomaly[]>();
    const seenKeys = new Map<string, number>();
    const now = new Date().toISOString();

    records.forEach((record, index) => {
      const anomalies: Anomaly[] = [];

      if (existingRecordNos.includes(record.recordNo)) {
        anomalies.push({
          type: 'DUPLICATE',
          description: `记录编号 ${record.recordNo} 已存在于系统中`,
          severity: 'HIGH',
          detectedAt: now,
        });
      }

      const key = `${record.tableName}|${record.fieldName}|${record.changeType}`;
      if (seenKeys.has(key)) {
        const prevIndex = seenKeys.get(key)!;
        anomalies.push({
          type: 'DUPLICATE',
          description: `与第 ${prevIndex + 1} 行重复: 相同表、相同字段、相同变更类型`,
          severity: 'MEDIUM',
          detectedAt: now,
        });

        if (!result.has(prevIndex)) {
          result.set(prevIndex, []);
        }
        result.get(prevIndex)!.push({
          type: 'DUPLICATE',
          description: `与第 ${index + 1} 行重复: 相同表、相同字段、相同变更类型`,
          severity: 'MEDIUM',
          detectedAt: now,
        });
      } else {
        seenKeys.set(key, index);
      }

      if (anomalies.length > 0) {
        result.set(index, [...(result.get(index) || []), ...anomalies]);
      }
    });

    return result;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
