import type { SchemaField, SchemaCompareResult, SchemaDiff } from '../../shared/types';

export class SchemaCompareService {
  compare(
    version1: { version: string; fields: SchemaField[] },
    version2: { version: string; fields: SchemaField[] },
    tableName: string
  ): SchemaCompareResult {
    const addedFields: SchemaField[] = [];
    const deletedFields: SchemaField[] = [];
    const modifiedFields: Array<{ field: SchemaField; changes: SchemaDiff[] }> = [];

    const v1FieldMap = new Map(version1.fields.map((f) => [f.name, f]));
    const v2FieldMap = new Map(version2.fields.map((f) => [f.name, f]));

    for (const field of version2.fields) {
      if (!v1FieldMap.has(field.name)) {
        addedFields.push(field);
      } else {
        const oldField = v1FieldMap.get(field.name)!;
        const changes = this.compareField(oldField, field);
        if (changes.length > 0) {
          modifiedFields.push({ field, changes });
        }
      }
    }

    for (const field of version1.fields) {
      if (!v2FieldMap.has(field.name)) {
        deletedFields.push(field);
      }
    }

    return {
      version1: version1.version,
      version2: version2.version,
      tableName,
      addedFields,
      deletedFields,
      modifiedFields,
      statistics: {
        total: version1.fields.length,
        added: addedFields.length,
        deleted: deletedFields.length,
        modified: modifiedFields.length,
      },
    };
  }

  private compareField(oldField: SchemaField, newField: SchemaField): SchemaDiff[] {
    const changes: SchemaDiff[] = [];
    const properties: Array<keyof SchemaField> = [
      'type',
      'nullable',
      'defaultValue',
      'comment',
      'length',
      'precision',
    ];

    for (const prop of properties) {
      const oldVal = oldField[prop];
      const newVal = newField[prop];

      if (oldVal !== newVal) {
        changes.push({
          type: 'MODIFY',
          fieldName: newField.name,
          property: prop,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return changes;
  }

  compareRecords(before: SchemaField, after: SchemaField): SchemaDiff[] {
    return this.compareField(before, after);
  }

  generateChangeSummary(result: SchemaCompareResult): string {
    const parts: string[] = [];

    parts.push(`表: ${result.tableName}`);
    parts.push(`版本对比: ${result.version1} -> ${result.version2}`);
    parts.push('');
    parts.push(
      `统计: 共${result.statistics.total}个字段, ` +
        `新增${result.statistics.added}个, ` +
        `删除${result.statistics.deleted}个, ` +
        `修改${result.statistics.modified}个`
    );

    if (result.addedFields.length > 0) {
      parts.push('');
      parts.push('【新增字段】');
      for (const field of result.addedFields) {
        parts.push(`  + ${field.name} (${field.type}) - ${field.comment || '无注释'}`);
      }
    }

    if (result.deletedFields.length > 0) {
      parts.push('');
      parts.push('【删除字段】');
      for (const field of result.deletedFields) {
        parts.push(`  - ${field.name} (${field.type})`);
      }
    }

    if (result.modifiedFields.length > 0) {
      parts.push('');
      parts.push('【修改字段】');
      for (const { field, changes } of result.modifiedFields) {
        parts.push(`  * ${field.name}:`);
        for (const change of changes) {
          parts.push(
            `    - ${change.property}: ${JSON.stringify(change.oldValue)} -> ${JSON.stringify(
              change.newValue
            )}`
          );
        }
      }
    }

    return parts.join('\n');
  }

  getRiskAssessment(result: SchemaCompareResult): { level: 'LOW' | 'MEDIUM' | 'HIGH'; details: string[] } {
    const details: string[] = [];
    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (result.deletedFields.length > 0) {
      level = 'HIGH';
      details.push(`删除${result.deletedFields.length}个字段，可能导致依赖该字段的系统故障`);
    }

    for (const { field, changes } of result.modifiedFields) {
      for (const change of changes) {
        if (change.property === 'type') {
          level = 'HIGH';
          details.push(`字段${field.name}类型变更: ${change.oldValue} -> ${change.newValue}，需要确认数据兼容性`);
        }
        if (change.property === 'nullable' && change.oldValue === false && change.newValue === true) {
          if (level !== 'HIGH') level = 'MEDIUM';
          details.push(`字段${field.name}由非空改为可空，需要确认业务逻辑是否允许空值`);
        }
        if (change.property === 'length' && typeof change.oldValue === 'number' && typeof change.newValue === 'number' && change.newValue < change.oldValue) {
          level = 'HIGH';
          details.push(`字段${field.name}长度缩小: ${change.oldValue} -> ${change.newValue}，可能导致数据截断`);
        }
      }
    }

    if (result.addedFields.length > 5) {
      if (level !== 'HIGH') level = 'MEDIUM';
      details.push(`新增${result.addedFields.length}个字段，建议分批发布以降低风险`);
    }

    if (details.length === 0) {
      details.push('无重大风险，变更相对安全');
    }

    return { level, details };
  }
}

export const schemaCompareService = new SchemaCompareService();
