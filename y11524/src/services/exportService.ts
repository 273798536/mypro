import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../database/connection';
import { Ledger, LedgerStatus, RoleType, LedgerDetail } from '../types';
import { maskSensitiveData } from '../utils/stateMachine';
import { getLedgerDetail } from './ledgerService';

export interface ExportParams {
  status?: LedgerStatus;
  area?: string;
  role: RoleType;
  exportType: 'summary' | 'detail';
}

function ensureExportDir(): string {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
}

function maskLedgerDetailForRole(detail: LedgerDetail, role: RoleType): LedgerDetail {
  if (role === RoleType.ADMIN) {
    return detail;
  }

  const masked = { ...detail };

  if (masked.appointment) {
    masked.appointment = {
      ...masked.appointment,
      customerName: maskSensitiveData(masked.appointment.customerName, 'customerName'),
      customerPhone: maskSensitiveData(masked.appointment.customerPhone, 'customerPhone'),
      customerAddress: maskSensitiveData(masked.appointment.customerAddress, 'customerAddress'),
    };
  }

  if (masked.userReview) {
    masked.userReview = {
      ...masked.userReview,
      reviewerPhone: maskSensitiveData(masked.userReview.reviewerPhone, 'reviewerPhone'),
    };
  }

  return masked;
}

export async function exportToCSV(params: ExportParams): Promise<string> {
  const db = getDatabase();
  const exportDir = ensureExportDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ledger_export_${params.exportType}_${timestamp}.csv`;
  const filepath = path.join(exportDir, filename);

  const conditions: string[] = [];
  const values: any[] = [];

  if (params.status) {
    conditions.push('l.status = ?');
    values.push(params.status);
  }
  if (params.area) {
    conditions.push('l.area = ?');
    values.push(params.area);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const ledgers = db
    .prepare(`
      SELECT l.*, 
             ao.customer_name, ao.customer_phone, ao.technician_name,
             ur.rating, ur.review_content,
             sc.confirm_type, sc.confirm_result
      FROM ledgers l
      LEFT JOIN appointment_orders ao ON l.id = ao.ledger_id
      LEFT JOIN user_reviews ur ON l.id = ur.ledger_id
      LEFT JOIN second_confirmations sc ON l.id = sc.ledger_id
      ${whereClause}
      ORDER BY l.created_at DESC
    `)
    .all(...values) as any[];

  const records = ledgers.map((ledger) => {
    const record: any = {
      id: ledger.id,
      appointmentNo: ledger.appointment_no,
      batchNo: ledger.batch_no,
      status: ledger.status,
      area: ledger.area,
      applianceType: ledger.appliance_type,
      createdBy: ledger.created_by,
      createdAt: ledger.created_at,
      updatedAt: ledger.updated_at,
    };

    if (ledger.customer_name) {
      record.customerName = params.role === RoleType.ADMIN 
        ? ledger.customer_name 
        : maskSensitiveData(ledger.customer_name, 'customerName');
    }
    if (ledger.customer_phone) {
      record.customerPhone = params.role === RoleType.ADMIN
        ? ledger.customer_phone
        : maskSensitiveData(ledger.customer_phone, 'customerPhone');
    }
    if (ledger.technician_name) {
      record.technicianName = ledger.technician_name;
    }
    if (ledger.rating !== undefined) {
      record.rating = ledger.rating;
    }
    if (ledger.review_content) {
      record.reviewContent = ledger.review_content;
    }
    if (ledger.confirm_type) {
      record.confirmType = ledger.confirm_type;
      record.confirmResult = ledger.confirm_result;
    }

    return record;
  });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'id', title: '台账ID' },
      { id: 'appointmentNo', title: '预约单号' },
      { id: 'batchNo', title: '批次号' },
      { id: 'status', title: '状态' },
      { id: 'area', title: '区域' },
      { id: 'applianceType', title: '家电类型' },
      { id: 'customerName', title: '客户姓名' },
      { id: 'customerPhone', title: '客户电话' },
      { id: 'technicianName', title: '师傅姓名' },
      { id: 'rating', title: '评分' },
      { id: 'reviewContent', title: '评价内容' },
      { id: 'confirmType', title: '确认类型' },
      { id: 'confirmResult', title: '确认结果' },
      { id: 'createdBy', title: '创建人' },
      { id: 'createdAt', title: '创建时间' },
      { id: 'updatedAt', title: '更新时间' },
    ],
  });

  await csvWriter.writeRecords(records);

  return filepath;
}

export async function exportDetailToCSV(ledgerId: string, role: RoleType): Promise<string> {
  const exportDir = ensureExportDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ledger_detail_${ledgerId}_${timestamp}.csv`;
  const filepath = path.join(exportDir, filename);

  const detail = getLedgerDetail(ledgerId, role);
  const maskedDetail = maskLedgerDetailForRole(detail, role);

  const records: any[] = [];

  records.push({
    section: '台账信息',
    field: '台账ID',
    value: maskedDetail.id,
  });
  records.push({
    section: '台账信息',
    field: '预约单号',
    value: maskedDetail.appointmentNo,
  });
  records.push({
    section: '台账信息',
    field: '批次号',
    value: maskedDetail.batchNo,
  });
  records.push({
    section: '台账信息',
    field: '状态',
    value: maskedDetail.status,
  });
  records.push({
    section: '台账信息',
    field: '区域',
    value: maskedDetail.area,
  });
  records.push({
    section: '台账信息',
    field: '家电类型',
    value: maskedDetail.applianceType,
  });

  if (maskedDetail.appointment) {
    records.push({ section: '预约单', field: '客户姓名', value: maskedDetail.appointment.customerName });
    records.push({ section: '预约单', field: '客户电话', value: maskedDetail.appointment.customerPhone });
    records.push({ section: '预约单', field: '客户地址', value: maskedDetail.appointment.customerAddress });
    records.push({ section: '预约单', field: '预约时间', value: maskedDetail.appointment.appointmentTime });
    records.push({ section: '预约单', field: '师傅姓名', value: maskedDetail.appointment.technicianName });
    records.push({ section: '预约单', field: '状态', value: maskedDetail.appointment.status });
  }

  if (maskedDetail.technicianLocation) {
    records.push({ section: '师傅定位', field: '签到时间', value: maskedDetail.technicianLocation.checkInTime });
    records.push({ section: '师傅定位', field: '签退时间', value: maskedDetail.technicianLocation.checkOutTime || '-' });
    records.push({ section: '师傅定位', field: '位置地址', value: maskedDetail.technicianLocation.locationAddress });
    records.push({ section: '师傅定位', field: '距客户距离(米)', value: maskedDetail.technicianLocation.distanceToCustomer });
  }

  if (maskedDetail.userReview) {
    records.push({ section: '用户评价', field: '评分', value: maskedDetail.userReview.rating });
    records.push({ section: '用户评价', field: '评价内容', value: maskedDetail.userReview.reviewContent });
    records.push({ section: '用户评价', field: '差评原因', value: maskedDetail.userReview.negativeReason || '-' });
    records.push({ section: '用户评价', field: '评价时间', value: maskedDetail.userReview.reviewTime });
  }

  if (maskedDetail.secondConfirmation) {
    records.push({ section: '二次确认', field: '确认类型', value: maskedDetail.secondConfirmation.confirmType });
    records.push({ section: '二次确认', field: '确认结果', value: maskedDetail.secondConfirmation.confirmResult });
    records.push({ section: '二次确认', field: '确认时间', value: maskedDetail.secondConfirmation.confirmTime });
    records.push({ section: '二次确认', field: '操作人', value: maskedDetail.secondConfirmation.operatorName });
    records.push({ section: '二次确认', field: '备注', value: maskedDetail.secondConfirmation.remark || '-' });
  }

  maskedDetail.statusHistory.forEach((log, index) => {
    records.push({
      section: `状态变更_${index + 1}`,
      field: '从状态',
      value: log.fromStatus,
    });
    records.push({
      section: `状态变更_${index + 1}`,
      field: '到状态',
      value: log.toStatus,
    });
    records.push({
      section: `状态变更_${index + 1}`,
      field: '操作人',
      value: log.operatorName,
    });
    records.push({
      section: `状态变更_${index + 1}`,
      field: '变更原因',
      value: log.changeReason,
    });
    records.push({
      section: `状态变更_${index + 1}`,
      field: '变更时间',
      value: log.createdAt,
    });
  });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'section', title: '模块' },
      { id: 'field', title: '字段' },
      { id: 'value', title: '值' },
    ],
  });

  await csvWriter.writeRecords(records);

  return filepath;
}

export function getStatistics(params: { area?: string; role: RoleType }) {
  const db = getDatabase();

  const conditions: string[] = [];
  const values: any[] = [];

  if (params.area && params.role !== RoleType.ADMIN) {
    conditions.push('area = ?');
    values.push(params.area);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const stats = db
    .prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM ledgers
      ${whereClause}
      GROUP BY status
    `)
    .all(...values) as { status: string; count: number }[];

  const result: Record<string, number> = {
    draft: 0,
    submitted: 0,
    rejected: 0,
    second_confirm: 0,
    audit_only: 0,
    total: 0,
  };

  stats.forEach((s) => {
    result[s.status] = s.count;
    result.total += s.count;
  });

  return result;
}
