import type { FieldMapping } from '../types';

export const commonFieldMappings: FieldMapping[] = [
  { oldFieldName: '题目', newFieldName: 'questionContent', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '题干', newFieldName: 'questionContent', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '学生答案', newFieldName: 'studentAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '答题内容', newFieldName: 'studentAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '参考答案', newFieldName: 'correctAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '正确答案', newFieldName: 'correctAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '标准答案', newFieldName: 'referenceAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '公式', newFieldName: 'formula', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '解题公式', newFieldName: 'formula', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '知识点', newFieldName: 'chapter', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '章节', newFieldName: 'chapter', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '难度', newFieldName: 'difficulty', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '科目', newFieldName: 'subject', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '创建时间', newFieldName: 'createdAt', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '录入时间', newFieldName: 'createdAt', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '状态', newFieldName: 'status', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '来源', newFieldName: 'dataSource', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '数据来源', newFieldName: 'dataSource', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '附件', newFieldName: 'attachments', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '附属材料', newFieldName: 'attachments', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '复盘笔记', newFieldName: 'reviewNotes', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '备注', newFieldName: 'reviewNotes', mappedAt: '2024-01-15', mapper: 'system' },
];

export interface NormalizeResult<T> {
  data: T;
  mappings: FieldMapping[];
  warnings: string[];
}

export function normalizeFieldName(fieldName: string): string {
  const mapping = commonFieldMappings.find(m => m.oldFieldName === fieldName);
  return mapping ? mapping.newFieldName : fieldName;
}

export function getFieldMapping(oldName: string): FieldMapping | undefined {
  return commonFieldMappings.find(m => m.oldFieldName === oldName);
}

export function isMappedField(fieldName: string): boolean {
  return commonFieldMappings.some(m => m.oldFieldName === fieldName || m.newFieldName === fieldName);
}
