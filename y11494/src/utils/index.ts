import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { runQuery, getOne, getAll } from '../config/database';
import { DocumentStatus } from '../types';
import dayjs from 'dayjs';

export const generateFileHash = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
};

export const ensureDirExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const recordChange = async (
  documentId: number,
  projectId: number,
  operatorId: number,
  operatorName: string,
  fieldName: string,
  oldValue: string,
  newValue: string,
  changeReason: string
): Promise<void> => {
  await runQuery(
    'INSERT INTO change_records (document_id, project_id, operator_id, operator_name, field_name, old_value, new_value, change_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [documentId, projectId, operatorId, operatorName, fieldName, oldValue, newValue, changeReason]
  );
};

export const recordStatusTransition = async (
  documentId: number,
  projectId: number,
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus,
  operatorId: number,
  operatorName: string,
  reason: string
): Promise<void> => {
  await runQuery(
    'INSERT INTO status_transitions (document_id, project_id, from_status, to_status, operator_id, operator_name, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [documentId, projectId, fromStatus, toStatus, operatorId, operatorName, reason]
  );
};

export const detectDirtyRecord = (document: any, oldDocument?: any): { type: string; field?: string; originalValue?: string; currentValue?: string; description: string }[] => {
  const issues: { type: string; field?: string; originalValue?: string; currentValue?: string; description: string }[] = [];
  const requiredFields = [
    { dbField: 'title', label: '标题' },
    { dbField: 'document_no', label: '文档编号' }
  ];
  for (const field of requiredFields) {
    if (!document[field.dbField]) {
      issues.push({
        type: 'missing_field',
        field: field.dbField,
        originalValue: oldDocument?.[field.dbField] ? String(oldDocument[field.dbField]) : undefined,
        currentValue: document[field.dbField] ? String(document[field.dbField]) : undefined,
        description: `缺少必填字段: ${field.label}`
      });
    }
  }
  if (document.effective_date && document.expiry_date) {
    const effective = dayjs(document.effective_date);
    const expiry = dayjs(document.expiry_date);
    if (effective.isAfter(expiry)) {
      issues.push({
        type: 'cross_date',
        field: 'effective_date,expiry_date',
        originalValue: oldDocument?.effective_date ? String(oldDocument.effective_date) : undefined,
        currentValue: `${document.effective_date},${document.expiry_date}`,
        description: '生效日期晚于失效日期'
      });
    }
  }
  if (document.amount !== undefined && document.amount < 0) {
    issues.push({
      type: 'amount_conflict',
      field: 'amount',
      originalValue: oldDocument?.amount !== undefined ? String(oldDocument.amount) : undefined,
      currentValue: String(document.amount),
      description: '金额为负数'
    });
  }
  if (document.quantity !== undefined && document.quantity < 0) {
    issues.push({
      type: 'quantity_conflict',
      field: 'quantity',
      originalValue: oldDocument?.quantity !== undefined ? String(oldDocument.quantity) : undefined,
      currentValue: String(document.quantity),
      description: '数量为负数'
    });
  }
  if (oldDocument) {
    if (oldDocument.title && document.title && oldDocument.title !== document.title) {
      issues.push({
        type: 'renamed',
        field: 'title',
        originalValue: String(oldDocument.title),
        currentValue: String(document.title),
        description: `标题已修改: ${oldDocument.title} → ${document.title}`
      });
    }
    if (oldDocument.document_no && document.document_no && oldDocument.document_no !== document.document_no) {
      issues.push({
        type: 'renamed',
        field: 'document_no',
        originalValue: String(oldDocument.document_no),
        currentValue: String(document.document_no),
        description: `文档编号已修改: ${oldDocument.document_no} → ${document.document_no}`
      });
    }
  }
  return issues;
};

export const createDirtyRecord = async (
  documentId: number,
  projectId: number,
  dirtyType: string,
  fieldName: string | undefined,
  originalValue: string | undefined,
  currentValue: string | undefined,
  description: string
): Promise<void> => {
  if (dirtyType === 'renamed') {
    const existingRenamed = await getOne(
      'SELECT id FROM dirty_records WHERE document_id = ? AND dirty_type = ? AND field_name = ? AND is_resolved = 0',
      [documentId, dirtyType, fieldName || null]
    );
    if (existingRenamed) {
      await runQuery(
        'UPDATE dirty_records SET current_value = ?, description = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [currentValue || null, description, existingRenamed.id]
      );
      return;
    }
  } else {
    const existing = await getOne(
      'SELECT id FROM dirty_records WHERE document_id = ? AND dirty_type = ? AND field_name = ? AND is_resolved = 0',
      [documentId, dirtyType, fieldName || null]
    );
    if (existing) {
      return;
    }
  }
  await runQuery(
    'INSERT INTO dirty_records (document_id, project_id, dirty_type, field_name, original_value, current_value, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [documentId, projectId, dirtyType, fieldName || null, originalValue || null, currentValue || null, description]
  );
};

export const syncDirtyRecords = async (
  documentId: number,
  currentIssues: { type: string; field?: string; description: string }[],
  handlerId: number,
  handlerName: string
): Promise<void> => {
  const unresolvedRecords = await getAll(
    'SELECT id, dirty_type, field_name FROM dirty_records WHERE document_id = ? AND is_resolved = 0',
    [documentId]
  );
  const currentIssueKeys = new Set(
    currentIssues.map(issue => `${issue.type}:${issue.field || ''}`)
  );
  for (const record of unresolvedRecords) {
    const recordKey = `${record.dirty_type}:${record.field_name || ''}`;
    if (!currentIssueKeys.has(recordKey)) {
      await runQuery(
        'UPDATE dirty_records SET is_resolved = 1, handler_id = ?, handler_name = ?, handling_opinion = ?, handled_at = CURRENT_TIMESTAMP WHERE id = ?',
        [handlerId, handlerName, '字段已修正，问题自动解决', record.id]
      );
    }
  }
};

export const resolveAllDirtyRecords = async (
  documentId: number,
  handlerId: number,
  handlerName: string,
  opinion: string
): Promise<void> => {
  await runQuery(
    'UPDATE dirty_records SET is_resolved = 1, handler_id = ?, handler_name = ?, handling_opinion = ?, handled_at = CURRENT_TIMESTAMP WHERE document_id = ? AND is_resolved = 0',
    [handlerId, handlerName, opinion, documentId]
  );
};

export const maskSensitiveFields = (data: any, sensitiveFields: string[]): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveFields(item, sensitiveFields));
  }
  const masked = { ...data };
  for (const field of sensitiveFields) {
    if (masked[field]) {
      if (typeof masked[field] === 'number') {
        masked[field] = '***';
      } else if (typeof masked[field] === 'string') {
        masked[field] = '***';
      }
    }
  }
  return masked;
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const generateDocumentNo = (type: string, projectNo: string): string => {
  const prefixMap: Record<string, string> = {
    qualification: 'QUAL',
    quotation: 'QUOT',
    stamped_scan: 'STAMP',
    supplier_statement: 'SUPP',
    approval_email: 'APPR',
    receipt_photo: 'RCPT'
  };
  const prefix = prefixMap[type] || 'DOC';
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${projectNo}-${timestamp}${random}`;
};

export const validateStatusTransition = (from: DocumentStatus, to: DocumentStatus, role: string): boolean => {
  const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
    [DocumentStatus.DRAFT]: [DocumentStatus.SUBMITTED],
    [DocumentStatus.SUBMITTED]: [DocumentStatus.REJECTED, DocumentStatus.SECOND_CONFIRMATION, DocumentStatus.READ_ONLY_AUDIT],
    [DocumentStatus.REJECTED]: [DocumentStatus.DRAFT, DocumentStatus.SUBMITTED],
    [DocumentStatus.SECOND_CONFIRMATION]: [DocumentStatus.READ_ONLY_AUDIT, DocumentStatus.REJECTED],
    [DocumentStatus.READ_ONLY_AUDIT]: [DocumentStatus.FINALIZED],
    [DocumentStatus.FINALIZED]: []
  };

  if (!validTransitions[from]?.includes(to)) {
    return false;
  }

  if (to === DocumentStatus.SUBMITTED && !['data_entry', 'reviewer', 'manager'].includes(role)) {
    return false;
  }
  if ((to === DocumentStatus.REJECTED || to === DocumentStatus.SECOND_CONFIRMATION) && !['reviewer', 'manager'].includes(role)) {
    return false;
  }
  if ((to === DocumentStatus.READ_ONLY_AUDIT || to === DocumentStatus.FINALIZED) && role !== 'manager') {
    return false;
  }

  return true;
};
