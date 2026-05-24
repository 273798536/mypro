import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import { db } from '../database/connection';
import { Ledger, LedgerStatus, Role, CheckInRecord, DepositRecord, RoomChangeRecord } from '../types';
import { ledgerService } from './ledger-service';

export class ExportService {
  private static instance: ExportService;
  private exportDir: string;

  private constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private maskSensitiveData(data: any, role: Role): any {
    if (role === Role.FINANCE || role === Role.AUDITOR) {
      return data;
    }
    const masked = { ...data };
    if (masked.guestIdCard) {
      const id = masked.guestIdCard;
      masked.guestIdCard = id.substring(0, 6) + '********' + id.substring(id.length - 4);
    }
    return masked;
  }

  async exportLedgersToCSV(
    filter: { status?: LedgerStatus; hasSyncIssue?: boolean },
    operator: string,
    role: Role
  ): Promise<string> {
    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (filter.status) {
      whereSql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter.hasSyncIssue !== undefined) {
      whereSql += ' AND hasSyncIssue = ?';
      params.push(filter.hasSyncIssue ? 1 : 0);
    }

    const ledgers = await db.all<Ledger>(`SELECT * FROM ledgers ${whereSql} ORDER BY createdAt DESC`, params);

    const filename = `ledgers_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    const filePath = path.join(this.exportDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'checkInNo', title: '入住单号' },
        { id: 'status', title: '状态' },
        { id: 'currentRoomNo', title: '当前房号' },
        { id: 'currentRoomRate', title: '当前房价' },
        { id: 'totalRoomFee', title: '总房费' },
        { id: 'totalDeposit', title: '总押金' },
        { id: 'totalInvoice', title: '总发票' },
        { id: 'balance', title: '余额' },
        { id: 'hasSyncIssue', title: '是否有同步问题' },
        { id: 'syncIssueDesc', title: '同步问题描述' },
        { id: 'createdBy', title: '创建人' },
        { id: 'createdAt', title: '创建时间' },
        { id: 'submittedAt', title: '提交时间' },
        { id: 'rejectedAt', title: '驳回时间' },
        { id: 'confirmedAt', title: '确认时间' },
        { id: 'auditedAt', title: '审计时间' }
      ]
    });

    const records = ledgers.map(ledger => this.maskSensitiveData({
      ...ledger,
      hasSyncIssue: ledger.hasSyncIssue ? '是' : '否'
    }, role));

    await csvWriter.writeRecords(records);

    for (const ledger of ledgers) {
      await ledgerService.markExported(ledger.id, operator, role);
    }

    return filePath;
  }

  async exportLedgerDetailToCSV(
    ledgerId: string,
    operator: string,
    role: Role
  ): Promise<string> {
    const detail = await ledgerService.getLedgerDetail(ledgerId, role);
    if (!detail) {
      throw new Error('台账不存在');
    }

    const filename = `ledger_${detail.ledger.checkInNo}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    const filePath = path.join(this.exportDir, filename);

    const checkInData = detail.checkIn ? [this.maskSensitiveData({
      section: '入住信息',
      field: '客人姓名',
      value: detail.checkIn.guestName
    }, role), {
      section: '入住信息',
      field: '身份证号',
      value: this.maskSensitiveData({ guestIdCard: detail.checkIn.guestIdCard }, role).guestIdCard
    }, {
      section: '入住信息',
      field: '房间号',
      value: detail.checkIn.roomNo
    }, {
      section: '入住信息',
      field: '房型',
      value: detail.checkIn.roomType
    }, {
      section: '入住信息',
      field: '入住时间',
      value: detail.checkIn.checkInTime
    }, {
      section: '入住信息',
      field: '预计离店',
      value: detail.checkIn.checkOutTime
    }, {
      section: '入住信息',
      field: '房价',
      value: detail.checkIn.roomRate.toString()
    }] : [];

    const depositData = detail.deposits.flatMap((d: DepositRecord, i: number) => [
      { section: `押金记录${i + 1}`, field: '押金单号', value: d.depositNo },
      { section: `押金记录${i + 1}`, field: '金额', value: d.amount.toString() },
      { section: `押金记录${i + 1}`, field: '支付方式', value: d.paymentMethod },
      { section: `押金记录${i + 1}`, field: '操作人', value: d.operator },
      { section: `押金记录${i + 1}`, field: '操作时间', value: d.operateTime }
    ]);

    const roomChangeData = detail.roomChanges.flatMap((r: RoomChangeRecord, i: number) => [
      { section: `换房记录${i + 1}`, field: '换房单号', value: r.changeNo },
      { section: `换房记录${i + 1}`, field: '原房号', value: r.oldRoomNo },
      { section: `换房记录${i + 1}`, field: '新房号', value: r.newRoomNo },
      { section: `换房记录${i + 1}`, field: '原房价', value: r.oldRoomRate.toString() },
      { section: `换房记录${i + 1}`, field: '新房价', value: r.newRoomRate.toString() },
      { section: `换房记录${i + 1}`, field: '是否半夜换房', value: r.isMidNight ? '是' : '否' },
      { section: `换房记录${i + 1}`, field: '换房原因', value: r.changeReason },
      { section: `换房记录${i + 1}`, field: '操作人', value: r.operator },
      { section: `换房记录${i + 1}`, field: '换房时间', value: r.changeTime }
    ]);

    const historyData = detail.histories.flatMap((h: any, i: number) => [
      { section: `操作记录${i + 1}`, field: '操作', value: h.operation },
      { section: `操作记录${i + 1}`, field: '操作人', value: h.operator },
      { section: `操作记录${i + 1}`, field: '角色', value: h.role },
      { section: `操作记录${i + 1}`, field: '原状态', value: h.oldStatus || '-' },
      { section: `操作记录${i + 1}`, field: '新状态', value: h.newStatus || '-' },
      { section: `操作记录${i + 1}`, field: '变更原因', value: h.changeReason || '-' },
      { section: `操作记录${i + 1}`, field: '操作时间', value: h.operateTime }
    ]);

    const allRecords = [...checkInData, ...depositData, ...roomChangeData, ...historyData];

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'section', title: '模块' },
        { id: 'field', title: '字段' },
        { id: 'value', title: '值' }
      ]
    });

    await csvWriter.writeRecords(allRecords);
    await ledgerService.markExported(ledgerId, operator, role);

    return filePath;
  }

  async exportFailedRecordsToCSV(operator: string, role: Role): Promise<string> {
    const failed = await db.all('SELECT * FROM failed_records ORDER BY failTime DESC');

    const filename = `failed_records_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    const filePath = path.join(this.exportDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'recordType', title: '记录类型' },
        { id: 'failReason', title: '失败原因' },
        { id: 'operator', title: '操作人' },
        { id: 'failTime', title: '失败时间' },
        { id: 'recordData', title: '原始数据' }
      ]
    });

    const records = failed.map(r => this.maskSensitiveData({
      ...r,
      recordData: JSON.stringify(JSON.parse(r.recordData), null, 2)
    }, role));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  getExportFilePath(filename: string): string {
    return path.join(this.exportDir, filename);
  }

  listExportFiles(): string[] {
    return fs.readdirSync(this.exportDir).filter(f => f.endsWith('.csv'));
  }
}

export const exportService = ExportService.getInstance();
