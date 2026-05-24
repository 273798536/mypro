import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import {
  Ledger,
  LedgerStatus,
  CheckInRecord,
  DepositRecord,
  RoomChangeRecord,
  ScanCodeRecord,
  LedgerHistory,
  Role,
  FailedRecord,
  PaginationParams,
  PaginationResult
} from '../types';

export class LedgerService {
  private static instance: LedgerService;

  private constructor() {}

  static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private validateCheckInData(data: Partial<CheckInRecord>): string[] {
    const errors: string[] = [];
    if (!data.checkInNo) errors.push('入住单号不能为空');
    if (!data.guestName) errors.push('客人姓名不能为空');
    if (!data.guestIdCard) errors.push('身份证号不能为空');
    if (!data.roomNo) errors.push('房号不能为空');
    if (!data.roomType) errors.push('房型不能为空');
    if (!data.checkInTime) errors.push('入住时间不能为空');
    if (!data.checkOutTime) errors.push('预计离店时间不能为空');
    if (data.roomRate === undefined || data.roomRate < 0) errors.push('房价无效');
    if (data.expectedDays === undefined || data.expectedDays <= 0) errors.push('入住天数无效');
    return errors;
  }

  private validateDepositData(data: Partial<DepositRecord>): string[] {
    const errors: string[] = [];
    if (!data.depositNo) errors.push('押金单号不能为空');
    if (!data.checkInNo) errors.push('入住单号不能为空');
    if (data.amount === undefined || data.amount <= 0) errors.push('押金金额必须大于0');
    if (!data.paymentMethod) errors.push('支付方式不能为空');
    return errors;
  }

  private validateRoomChangeData(data: Partial<RoomChangeRecord>): string[] {
    const errors: string[] = [];
    if (!data.changeNo) errors.push('换房单号不能为空');
    if (!data.checkInNo) errors.push('入住单号不能为空');
    if (!data.oldRoomNo) errors.push('原房号不能为空');
    if (!data.newRoomNo) errors.push('新房号不能为空');
    if (!data.changeReason) errors.push('换房原因不能为空');
    if (data.newRoomRate === undefined || data.newRoomRate < 0) errors.push('新房房价无效');
    return errors;
  }

  private async saveFailedRecord(
    recordType: string,
    recordData: any,
    failReason: string,
    operator: string,
    ledgerId?: string
  ): Promise<void> {
    const sql = `
      INSERT INTO failed_records (id, ledgerId, recordType, recordData, failReason, failTime, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(sql, [
      uuidv4(),
      ledgerId || null,
      recordType,
      JSON.stringify(recordData),
      failReason,
      this.now(),
      operator
    ]);
  }

  private async addHistory(
    ledgerId: string,
    version: number,
    operation: string,
    operator: string,
    role: Role,
    changedFields: string[],
    changeReason?: string,
    oldStatus?: LedgerStatus,
    newStatus?: LedgerStatus
  ): Promise<void> {
    const sql = `
      INSERT INTO ledger_histories (id, ledgerId, version, operation, operator, role, oldStatus, newStatus, changedFields, changeReason, operateTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(sql, [
      uuidv4(),
      ledgerId,
      version,
      operation,
      operator,
      role,
      oldStatus || null,
      newStatus || null,
      JSON.stringify(changedFields),
      changeReason || null,
      this.now()
    ]);
  }

  private calculateBalance(totalRoomFee: number, totalDeposit: number, totalInvoice: number): number {
    return totalDeposit - totalRoomFee - totalInvoice;
  }

  private checkSyncIssues(ledger: Ledger, deposits: DepositRecord[], roomChanges: RoomChangeRecord[]): { hasIssue: boolean; desc?: string } {
    const actualDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);
    if (Math.abs(actualDeposit - ledger.totalDeposit) > 0.01) {
      return { hasIssue: true, desc: `押金金额不一致: 台账${ledger.totalDeposit}, 实际${actualDeposit}` };
    }
    return { hasIssue: false };
  }

  async createLedgerFromCheckIn(
    checkInData: Partial<CheckInRecord>,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const errors = this.validateCheckInData(checkInData);
    if (errors.length > 0) {
      await this.saveFailedRecord('check_in', checkInData, errors.join('; '), operator);
      return { success: false, message: errors.join('; ') };
    }

    try {
      await db.beginTransaction();

      const existing = await db.get('SELECT id FROM ledgers WHERE checkInNo = ?', [checkInData.checkInNo!]);
      if (existing) {
        await db.rollback();
        return { success: false, message: `入住单 ${checkInData.checkInNo} 已存在` };
      }

      const ledgerId = uuidv4();
      const now = this.now();

      const ledger: Ledger = {
        id: ledgerId,
        checkInNo: checkInData.checkInNo!,
        status: LedgerStatus.DRAFT,
        version: 1,
        currentRoomNo: checkInData.roomNo!,
        currentRoomRate: checkInData.roomRate!,
        totalRoomFee: (checkInData.expectedDays || 0) * (checkInData.roomRate || 0),
        totalDeposit: 0,
        totalInvoice: 0,
        balance: 0,
        hasSyncIssue: false,
        createdBy: operator,
        createdAt: now,
        updatedBy: operator,
        updatedAt: now
      };

      const ledgerSql = `
        INSERT INTO ledgers (id, checkInNo, status, version, currentRoomNo, currentRoomRate, totalRoomFee, totalDeposit, totalInvoice, balance, hasSyncIssue, createdBy, createdAt, updatedBy, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(ledgerSql, [
        ledger.id, ledger.checkInNo, ledger.status, ledger.version,
        ledger.currentRoomNo, ledger.currentRoomRate, ledger.totalRoomFee,
        ledger.totalDeposit, ledger.totalInvoice, ledger.balance,
        ledger.hasSyncIssue ? 1 : 0, ledger.createdBy, ledger.createdAt,
        ledger.updatedBy, ledger.updatedAt
      ]);

      const checkInRecord: CheckInRecord = {
        id: uuidv4(),
        ledgerId,
        checkInNo: checkInData.checkInNo!,
        guestName: checkInData.guestName!,
        guestIdCard: checkInData.guestIdCard!,
        roomNo: checkInData.roomNo!,
        roomType: checkInData.roomType!,
        checkInTime: checkInData.checkInTime!,
        checkOutTime: checkInData.checkOutTime!,
        expectedDays: checkInData.expectedDays!,
        roomRate: checkInData.roomRate!,
        totalAmount: (checkInData.expectedDays || 0) * (checkInData.roomRate || 0),
        operator,
        createTime: now
      };

      const checkInSql = `
        INSERT INTO check_in_records (id, ledgerId, checkInNo, guestName, guestIdCard, roomNo, roomType, checkInTime, checkOutTime, expectedDays, roomRate, totalAmount, operator, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(checkInSql, [
        checkInRecord.id, checkInRecord.ledgerId, checkInRecord.checkInNo,
        checkInRecord.guestName, checkInRecord.guestIdCard, checkInRecord.roomNo,
        checkInRecord.roomType, checkInRecord.checkInTime, checkInRecord.checkOutTime,
        checkInRecord.expectedDays, checkInRecord.roomRate, checkInRecord.totalAmount,
        checkInRecord.operator, checkInRecord.createTime
      ]);

      await this.addHistory(ledgerId, 1, '创建台账', operator, role, ['status', 'currentRoomNo', 'currentRoomRate', 'totalRoomFee'], '初始建账');

      await db.commit();
      return { success: true, ledger };
    } catch (error) {
      await db.rollback();
      await this.saveFailedRecord('check_in', checkInData, (error as Error).message, operator);
      return { success: false, message: (error as Error).message };
    }
  }

  async addDeposit(
    depositData: Partial<DepositRecord>,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const errors = this.validateDepositData(depositData);
    if (errors.length > 0) {
      await this.saveFailedRecord('deposit', depositData, errors.join('; '), operator);
      return { success: false, message: errors.join('; ') };
    }

    try {
      await db.beginTransaction();

      const ledger = await db.get<Ledger>('SELECT * FROM ledgers WHERE checkInNo = ?', [depositData.checkInNo!]);
      if (!ledger) {
        await db.rollback();
        return { success: false, message: `入住单 ${depositData.checkInNo} 不存在` };
      }

      const existingDeposit = await db.get('SELECT id FROM deposit_records WHERE depositNo = ?', [depositData.depositNo!]);
      if (existingDeposit) {
        await db.rollback();
        return { success: false, message: `押金单 ${depositData.depositNo} 已存在` };
      }

      const depositRecord: DepositRecord = {
        id: uuidv4(),
        ledgerId: ledger.id,
        depositNo: depositData.depositNo!,
        checkInNo: depositData.checkInNo!,
        amount: depositData.amount!,
        paymentMethod: depositData.paymentMethod!,
        operator,
        operateTime: this.now(),
        remark: depositData.remark
      };

      const depositSql = `
        INSERT INTO deposit_records (id, ledgerId, depositNo, checkInNo, amount, paymentMethod, operator, operateTime, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(depositSql, [
        depositRecord.id, depositRecord.ledgerId, depositRecord.depositNo,
        depositRecord.checkInNo, depositRecord.amount, depositRecord.paymentMethod,
        depositRecord.operator, depositRecord.operateTime, depositRecord.remark || null
      ]);

      const newVersion = ledger.version + 1;
      const newTotalDeposit = ledger.totalDeposit + depositData.amount!;
      const newBalance = this.calculateBalance(ledger.totalRoomFee, newTotalDeposit, ledger.totalInvoice);
      const now = this.now();

      const updateSql = `
        UPDATE ledgers SET version = ?, totalDeposit = ?, balance = ?, updatedBy = ?, updatedAt = ? WHERE id = ?
      `;
      await db.run(updateSql, [newVersion, newTotalDeposit, newBalance, operator, now, ledger.id]);

      await this.addHistory(ledger.id, newVersion, '添加押金', operator, role, ['totalDeposit', 'balance'], `添加押金 ${depositData.amount}`);

      const syncCheck = this.checkSyncIssues(
        { ...ledger, totalDeposit: newTotalDeposit, balance: newBalance, version: newVersion },
        await db.all<DepositRecord>('SELECT * FROM deposit_records WHERE ledgerId = ?', [ledger.id]),
        []
      );
      if (syncCheck.hasIssue) {
        await db.run('UPDATE ledgers SET hasSyncIssue = 1, syncIssueDesc = ? WHERE id = ?', [syncCheck.desc!, ledger.id]);
      }

      await db.commit();

      const updatedLedger = await this.getLedgerById(ledger.id);
      return { success: true, ledger: updatedLedger! };
    } catch (error) {
      await db.rollback();
      await this.saveFailedRecord('deposit', depositData, (error as Error).message, operator);
      return { success: false, message: (error as Error).message };
    }
  }

  async addRoomChange(
    roomChangeData: Partial<RoomChangeRecord>,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const errors = this.validateRoomChangeData(roomChangeData);
    if (errors.length > 0) {
      await this.saveFailedRecord('room_change', roomChangeData, errors.join('; '), operator);
      return { success: false, message: errors.join('; ') };
    }

    try {
      await db.beginTransaction();

      const ledger = await db.get<Ledger>('SELECT * FROM ledgers WHERE checkInNo = ?', [roomChangeData.checkInNo!]);
      if (!ledger) {
        await db.rollback();
        return { success: false, message: `入住单 ${roomChangeData.checkInNo} 不存在` };
      }

      const existingChange = await db.get('SELECT id FROM room_change_records WHERE changeNo = ?', [roomChangeData.changeNo!]);
      if (existingChange) {
        await db.rollback();
        return { success: false, message: `换房单 ${roomChangeData.changeNo} 已存在` };
      }

      const changeHour = new Date(roomChangeData.changeTime || this.now()).getHours();
      const isMidNight = changeHour >= 0 && changeHour < 6;

      const roomChangeRecord: RoomChangeRecord = {
        id: uuidv4(),
        ledgerId: ledger.id,
        changeNo: roomChangeData.changeNo!,
        checkInNo: roomChangeData.checkInNo!,
        oldRoomNo: roomChangeData.oldRoomNo!,
        newRoomNo: roomChangeData.newRoomNo!,
        oldRoomType: roomChangeData.oldRoomType || '未知',
        newRoomType: roomChangeData.newRoomType || '未知',
        oldRoomRate: roomChangeData.oldRoomRate || ledger.currentRoomRate,
        newRoomRate: roomChangeData.newRoomRate!,
        changeTime: roomChangeData.changeTime || this.now(),
        changeReason: roomChangeData.changeReason!,
        operator,
        isMidNight
      };

      const changeSql = `
        INSERT INTO room_change_records (id, ledgerId, changeNo, checkInNo, oldRoomNo, newRoomNo, oldRoomType, newRoomType, oldRoomRate, newRoomRate, changeTime, changeReason, operator, isMidNight)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(changeSql, [
        roomChangeRecord.id, roomChangeRecord.ledgerId, roomChangeRecord.changeNo,
        roomChangeRecord.checkInNo, roomChangeRecord.oldRoomNo, roomChangeRecord.newRoomNo,
        roomChangeRecord.oldRoomType, roomChangeRecord.newRoomType, roomChangeRecord.oldRoomRate,
        roomChangeRecord.newRoomRate, roomChangeRecord.changeTime, roomChangeRecord.changeReason,
        roomChangeRecord.operator, roomChangeRecord.isMidNight ? 1 : 0
      ]);

      const newVersion = ledger.version + 1;
      const now = this.now();
      let hasSyncIssue = ledger.hasSyncIssue;
      let syncIssueDesc = ledger.syncIssueDesc;

      if (isMidNight) {
        hasSyncIssue = true;
        syncIssueDesc = `半夜换房: ${roomChangeData.oldRoomNo} → ${roomChangeData.newRoomNo}, 需手动核对房费差异`;
      }

      const updateSql = `
        UPDATE ledgers SET version = ?, currentRoomNo = ?, currentRoomRate = ?, hasSyncIssue = ?, syncIssueDesc = ?, updatedBy = ?, updatedAt = ? WHERE id = ?
      `;
      await db.run(updateSql, [
        newVersion, roomChangeData.newRoomNo, roomChangeData.newRoomRate,
        hasSyncIssue ? 1 : 0, syncIssueDesc || null, operator, now, ledger.id
      ]);

      const changeDesc = isMidNight 
        ? `[半夜换房] ${roomChangeData.oldRoomNo} → ${roomChangeData.newRoomNo}, 原因: ${roomChangeData.changeReason}`
        : `换房 ${roomChangeData.oldRoomNo} → ${roomChangeData.newRoomNo}, 原因: ${roomChangeData.changeReason}`;

      await this.addHistory(ledger.id, newVersion, '换房', operator, role, ['currentRoomNo', 'currentRoomRate', 'hasSyncIssue'], changeDesc);

      await db.commit();

      const updatedLedger = await this.getLedgerById(ledger.id);
      return { success: true, ledger: updatedLedger! };
    } catch (error) {
      await db.rollback();
      await this.saveFailedRecord('room_change', roomChangeData, (error as Error).message, operator);
      return { success: false, message: (error as Error).message };
    }
  }

  async submitLedger(
    ledgerId: string,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    return this.transitionStatus(ledgerId, LedgerStatus.SUBMITTED, operator, role, '提交审核');
  }

  async rejectLedger(
    ledgerId: string,
    rejectReason: string,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const result = await this.transitionStatus(ledgerId, LedgerStatus.REJECTED, operator, role, '驳回', rejectReason);
    if (result.success && result.ledger) {
      await db.run('UPDATE ledgers SET rejectReason = ?, rejectedAt = ? WHERE id = ?', [rejectReason, this.now(), ledgerId]);
      result.ledger = await this.getLedgerById(ledgerId);
    }
    return result;
  }

  async confirmLedger(
    ledgerId: string,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const result = await this.transitionStatus(ledgerId, LedgerStatus.CONFIRMED, operator, role, '二次确认');
    if (result.success && result.ledger) {
      await db.run('UPDATE ledgers SET confirmedAt = ? WHERE id = ?', [this.now(), ledgerId]);
      result.ledger = await this.getLedgerById(ledgerId);
    }
    return result;
  }

  async auditLedger(
    ledgerId: string,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const result = await this.transitionStatus(ledgerId, LedgerStatus.AUDITED, operator, role, '夜审通过');
    if (result.success && result.ledger) {
      await db.run('UPDATE ledgers SET auditedAt = ? WHERE id = ?', [this.now(), ledgerId]);
      result.ledger = await this.getLedgerById(ledgerId);
    }
    return result;
  }

  async markExported(
    ledgerId: string,
    operator: string,
    role: Role
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    const result = await this.transitionStatus(ledgerId, LedgerStatus.EXPORTED, operator, role, '已导出');
    if (result.success && result.ledger) {
      await db.run('UPDATE ledgers SET exportedAt = ? WHERE id = ?', [this.now(), ledgerId]);
      result.ledger = await this.getLedgerById(ledgerId);
    }
    return result;
  }

  private async transitionStatus(
    ledgerId: string,
    targetStatus: LedgerStatus,
    operator: string,
    role: Role,
    operation: string,
    reason?: string
  ): Promise<{ success: boolean; ledger?: Ledger; message?: string }> {
    try {
      await db.beginTransaction();

      const ledger = await db.get<Ledger>('SELECT * FROM ledgers WHERE id = ?', [ledgerId]);
      if (!ledger) {
        await db.rollback();
        return { success: false, message: '台账不存在' };
      }

      if (!this.isValidTransition(ledger.status, targetStatus)) {
        await db.rollback();
        return { success: false, message: `不允许从 ${ledger.status} 变更为 ${targetStatus}` };
      }

      const newVersion = ledger.version + 1;
      const now = this.now();

      const updateFields = ['status', 'version', 'updatedBy', 'updatedAt'];
      if (targetStatus === LedgerStatus.SUBMITTED) {
        updateFields.push('submittedAt');
        await db.run('UPDATE ledgers SET status = ?, version = ?, updatedBy = ?, updatedAt = ?, submittedAt = ? WHERE id = ?',
          [targetStatus, newVersion, operator, now, now, ledgerId]);
      } else {
        await db.run('UPDATE ledgers SET status = ?, version = ?, updatedBy = ?, updatedAt = ? WHERE id = ?',
          [targetStatus, newVersion, operator, now, ledgerId]);
      }

      await this.addHistory(ledgerId, newVersion, operation, operator, role, updateFields, reason, ledger.status, targetStatus);

      await db.commit();

      const updatedLedger = await this.getLedgerById(ledgerId);
      return { success: true, ledger: updatedLedger! };
    } catch (error) {
      await db.rollback();
      return { success: false, message: (error as Error).message };
    }
  }

  private isValidTransition(current: LedgerStatus, target: LedgerStatus): boolean {
    const transitions: Record<LedgerStatus, LedgerStatus[]> = {
      [LedgerStatus.DRAFT]: [LedgerStatus.SUBMITTED],
      [LedgerStatus.SUBMITTED]: [LedgerStatus.REJECTED, LedgerStatus.CONFIRMED, LedgerStatus.AUDITED],
      [LedgerStatus.REJECTED]: [LedgerStatus.SUBMITTED],
      [LedgerStatus.CONFIRMED]: [LedgerStatus.AUDITED],
      [LedgerStatus.AUDITED]: [LedgerStatus.EXPORTED],
      [LedgerStatus.EXPORTED]: []
    };
    return transitions[current]?.includes(target) || false;
  }

  async getLedgerById(id: string): Promise<Ledger | undefined> {
    return db.get<Ledger>('SELECT * FROM ledgers WHERE id = ?', [id]);
  }

  async getLedgerByCheckInNo(checkInNo: string): Promise<Ledger | undefined> {
    return db.get<Ledger>('SELECT * FROM ledgers WHERE checkInNo = ?', [checkInNo]);
  }

  async getLedgerList(
    params: PaginationParams & { status?: LedgerStatus; hasSyncIssue?: boolean },
    _role: Role
  ): Promise<PaginationResult<Ledger>> {
    let whereSql = 'WHERE 1=1';
    const whereParams: any[] = [];

    if (params.status) {
      whereSql += ' AND status = ?';
      whereParams.push(params.status);
    }
    if (params.hasSyncIssue !== undefined) {
      whereSql += ' AND hasSyncIssue = ?';
      whereParams.push(params.hasSyncIssue ? 1 : 0);
    }

    const countSql = `SELECT COUNT(*) as count FROM ledgers ${whereSql}`;
    const countResult = await db.get<{ count: number }>(countSql, whereParams);
    const total = countResult?.count || 0;

    const offset = (params.page - 1) * params.pageSize;
    const listSql = `SELECT * FROM ledgers ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    const list = await db.all<Ledger>(listSql, [...whereParams, params.pageSize, offset]);

    return { list, total, page: params.page, pageSize: params.pageSize };
  }

  async getLedgerDetail(ledgerId: string, role: Role): Promise<{
    ledger: Ledger;
    checkIn: CheckInRecord | undefined;
    deposits: DepositRecord[];
    roomChanges: RoomChangeRecord[];
    scanCodes: ScanCodeRecord[];
    histories: LedgerHistory[];
  } | undefined> {
    const ledger = await this.getLedgerById(ledgerId);
    if (!ledger) return undefined;

    const checkIn = await db.get<CheckInRecord>('SELECT * FROM check_in_records WHERE ledgerId = ?', [ledgerId]);
    const deposits = await db.all<DepositRecord>('SELECT * FROM deposit_records WHERE ledgerId = ? ORDER BY operateTime', [ledgerId]);
    const roomChanges = await db.all<RoomChangeRecord>('SELECT * FROM room_change_records WHERE ledgerId = ? ORDER BY changeTime', [ledgerId]);
    const scanCodes = await db.all<ScanCodeRecord>('SELECT * FROM scan_code_records WHERE ledgerId = ? ORDER BY scanTime', [ledgerId]);
    const histories = await db.all<LedgerHistory>('SELECT * FROM ledger_histories WHERE ledgerId = ? ORDER BY operateTime', [ledgerId]);

    const result = { ledger, checkIn, deposits, roomChanges, scanCodes, histories };
    return this.applyRoleMasking(result, role);
  }

  private applyRoleMasking(data: any, role: Role): any {
    if (role === Role.AUDITOR || role === Role.FINANCE) {
      return data;
    }
    if (data.checkIn?.guestIdCard) {
      const id = data.checkIn.guestIdCard;
      data.checkIn.guestIdCard = id.substring(0, 6) + '********' + id.substring(id.length - 4);
    }
    return data;
  }

  async getFailedRecords(params: PaginationParams): Promise<PaginationResult<FailedRecord>> {
    const countSql = `SELECT COUNT(*) as count FROM failed_records`;
    const countResult = await db.get<{ count: number }>(countSql);
    const total = countResult?.count || 0;

    const offset = (params.page - 1) * params.pageSize;
    const listSql = `SELECT * FROM failed_records ORDER BY failTime DESC LIMIT ? OFFSET ?`;
    const list = await db.all<FailedRecord>(listSql, [params.pageSize, offset]);

    return { list, total, page: params.page, pageSize: params.pageSize };
  }

  async getLedgerHistories(ledgerId: string): Promise<LedgerHistory[]> {
    return db.all<LedgerHistory>('SELECT * FROM ledger_histories WHERE ledgerId = ? ORDER BY operateTime', [ledgerId]);
  }

  async getReportSummary(): Promise<{
    totalLedgers: number;
    draftCount: number;
    submittedCount: number;
    auditedCount: number;
    syncIssueCount: number;
    totalRoomFee: number;
    totalDeposit: number;
    balance: number;
  }> {
    const result = await db.get(`
      SELECT
        COUNT(*) as totalLedgers,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftCount,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submittedCount,
        SUM(CASE WHEN status = 'audited' THEN 1 ELSE 0 END) as auditedCount,
        SUM(CASE WHEN hasSyncIssue = 1 THEN 1 ELSE 0 END) as syncIssueCount,
        SUM(totalRoomFee) as totalRoomFee,
        SUM(totalDeposit) as totalDeposit,
        SUM(balance) as balance
      FROM ledgers
      WHERE status != 'draft' OR status IS NULL
    `) || { totalLedgers: 0, draftCount: 0, submittedCount: 0, auditedCount: 0, syncIssueCount: 0, totalRoomFee: 0, totalDeposit: 0, balance: 0 };

    return {
      totalLedgers: result.totalLedgers || 0,
      draftCount: result.draftCount || 0,
      submittedCount: result.submittedCount || 0,
      auditedCount: result.auditedCount || 0,
      syncIssueCount: result.syncIssueCount || 0,
      totalRoomFee: result.totalRoomFee || 0,
      totalDeposit: result.totalDeposit || 0,
      balance: result.balance || 0
    };
  }
}

export const ledgerService = LedgerService.getInstance();
