import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { getDatabase } from '../database/connection';
import {
  Ledger,
  LedgerStatus,
  AppointmentOrder,
  TechnicianLocation,
  UserReview,
  SecondConfirmation,
  StatusChangeLog,
  FailedRecord,
  DataSource,
  LedgerDetail,
  IdempotencyResult,
  RoleType,
} from '../types';
import { canTransition, maskSensitiveData } from '../utils/stateMachine';
import { snakeToCamel } from '../utils/caseConvert';
import {
  AppointmentOrderInput,
  TechnicianLocationInput,
  UserReviewInput,
  SecondConfirmationInput,
  StatusChangeInput,
} from '../validation/schemas';

function now(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function recordFailure(
  dataSource: DataSource,
  rawData: string,
  errorMessage: string,
  appointmentNo?: string,
  batchNo?: string
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO failed_records (id, data_source, raw_data, error_message, appointment_no, batch_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(uuidv4(), dataSource, rawData, errorMessage, appointmentNo, batchNo, now());
}

export function importAppointmentOrder(
  input: AppointmentOrderInput
): IdempotencyResult<{ ledger: Ledger; appointment: AppointmentOrder }> {
  const db = getDatabase();
  const rawData = JSON.stringify(input);

  try {
    const existingLedger = snakeToCamel(
      db
        .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as Ledger | undefined;

    const existingAppointment = snakeToCamel(
      db
        .prepare('SELECT * FROM appointment_orders WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as AppointmentOrder | undefined;

    const isNew = !existingLedger;

    let ledgerId: string;
    if (isNew) {
      ledgerId = uuidv4();
      db.prepare(`
        INSERT INTO ledgers (id, appointment_no, batch_no, status, area, appliance_type, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ledgerId,
        input.appointmentNo,
        input.batchNo,
        LedgerStatus.DRAFT,
        input.area,
        input.applianceType,
        input.operatorId,
        now(),
        now()
      );
    } else {
      ledgerId = existingLedger.id;
      db.prepare(`
        UPDATE ledgers SET area = ?, appliance_type = ?, updated_at = ?
        WHERE id = ?
      `).run(input.area, input.applianceType, now(), ledgerId);
    }

    if (existingAppointment) {
      db.prepare(`
        UPDATE appointment_orders SET
          customer_name = ?, customer_phone = ?, customer_address = ?, area = ?,
          appliance_type = ?, appointment_time = ?, technician_id = ?, technician_name = ?,
          status = ?, raw_data = ?, updated_at = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(
        input.customerName,
        input.customerPhone,
        input.customerAddress,
        input.area,
        input.applianceType,
        input.appointmentTime,
        input.technicianId,
        input.technicianName,
        input.status,
        rawData,
        now(),
        input.appointmentNo,
        input.batchNo
      );
    } else {
      db.prepare(`
        INSERT INTO appointment_orders (
          id, ledger_id, appointment_no, batch_no, customer_name, customer_phone,
          customer_address, area, appliance_type, appointment_time, technician_id,
          technician_name, status, raw_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        ledgerId,
        input.appointmentNo,
        input.batchNo,
        input.customerName,
        input.customerPhone,
        input.customerAddress,
        input.area,
        input.applianceType,
        input.appointmentTime,
        input.technicianId,
        input.technicianName,
        input.status,
        rawData,
        now(),
        now()
      );
    }

    const ledger = snakeToCamel(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(ledgerId)) as Ledger;
    const appointment = snakeToCamel(
      db.prepare('SELECT * FROM appointment_orders WHERE ledger_id = ?').get(ledgerId)
    ) as AppointmentOrder;

    return { created: isNew, data: { ledger, appointment } };
  } catch (error) {
    recordFailure(
      DataSource.APPOINTMENT,
      rawData,
      error instanceof Error ? error.message : '未知错误',
      input.appointmentNo,
      input.batchNo
    );
    throw error;
  }
}

export function importTechnicianLocation(
  input: TechnicianLocationInput
): IdempotencyResult<TechnicianLocation> {
  const db = getDatabase();
  const rawData = JSON.stringify(input);

  try {
    const ledger = snakeToCamel(
      db
        .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as Ledger | undefined;

    if (!ledger) {
      throw new Error('台账记录不存在，请先导入预约单');
    }

    const existing = snakeToCamel(
      db
        .prepare('SELECT * FROM technician_locations WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as TechnicianLocation | undefined;

    const isNew = !existing;

    if (existing) {
      db.prepare(`
        UPDATE technician_locations SET
          technician_id = ?, check_in_time = ?, check_out_time = ?, location_address = ?,
          latitude = ?, longitude = ?, distance_to_customer = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(
        input.technicianId,
        input.checkInTime,
        input.checkOutTime || null,
        input.locationAddress,
        input.latitude,
        input.longitude,
        input.distanceToCustomer,
        rawData,
        input.appointmentNo,
        input.batchNo
      );
    } else {
      db.prepare(`
        INSERT INTO technician_locations (
          id, ledger_id, appointment_no, batch_no, technician_id, check_in_time,
          check_out_time, location_address, latitude, longitude, distance_to_customer,
          raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        ledger.id,
        input.appointmentNo,
        input.batchNo,
        input.technicianId,
        input.checkInTime,
        input.checkOutTime || null,
        input.locationAddress,
        input.latitude,
        input.longitude,
        input.distanceToCustomer,
        rawData,
        now()
      );
    }

    const result = snakeToCamel(
      db
        .prepare('SELECT * FROM technician_locations WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as TechnicianLocation;

    return { created: isNew, data: result };
  } catch (error) {
    recordFailure(
      DataSource.TECHNICIAN_LOCATION,
      rawData,
      error instanceof Error ? error.message : '未知错误',
      input.appointmentNo,
      input.batchNo
    );
    throw error;
  }
}

export function importUserReview(
  input: UserReviewInput
): IdempotencyResult<UserReview> {
  const db = getDatabase();
  const rawData = JSON.stringify(input);

  try {
    const ledger = snakeToCamel(
      db
        .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as Ledger | undefined;

    if (!ledger) {
      throw new Error('台账记录不存在，请先导入预约单');
    }

    const existing = snakeToCamel(
      db
        .prepare('SELECT * FROM user_reviews WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as UserReview | undefined;

    const isNew = !existing;

    if (existing) {
      db.prepare(`
        UPDATE user_reviews SET
          rating = ?, review_content = ?, negative_reason = ?, review_time = ?,
          reviewer_phone = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(
        input.rating,
        input.reviewContent,
        input.negativeReason || null,
        input.reviewTime,
        input.reviewerPhone,
        rawData,
        input.appointmentNo,
        input.batchNo
      );
    } else {
      db.prepare(`
        INSERT INTO user_reviews (
          id, ledger_id, appointment_no, batch_no, rating, review_content,
          negative_reason, review_time, reviewer_phone, raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        ledger.id,
        input.appointmentNo,
        input.batchNo,
        input.rating,
        input.reviewContent,
        input.negativeReason || null,
        input.reviewTime,
        input.reviewerPhone,
        rawData,
        now()
      );
    }

    const result = snakeToCamel(
      db
        .prepare('SELECT * FROM user_reviews WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as UserReview;

    return { created: isNew, data: result };
  } catch (error) {
    recordFailure(
      DataSource.USER_REVIEW,
      rawData,
      error instanceof Error ? error.message : '未知错误',
      input.appointmentNo,
      input.batchNo
    );
    throw error;
  }
}

export function importSecondConfirmation(
  input: SecondConfirmationInput
): IdempotencyResult<SecondConfirmation> {
  const db = getDatabase();
  const rawData = JSON.stringify(input);

  try {
    const ledger = snakeToCamel(
      db
        .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as Ledger | undefined;

    if (!ledger) {
      throw new Error('台账记录不存在，请先导入预约单');
    }

    const existing = snakeToCamel(
      db
        .prepare('SELECT * FROM second_confirmations WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as SecondConfirmation | undefined;

    const isNew = !existing;

    if (existing) {
      db.prepare(`
        UPDATE second_confirmations SET
          confirm_type = ?, confirm_result = ?, confirm_time = ?, operator_id = ?,
          operator_name = ?, remark = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(
        input.confirmType,
        input.confirmResult,
        input.confirmTime,
        input.operatorId,
        input.operatorName,
        input.remark || null,
        rawData,
        input.appointmentNo,
        input.batchNo
      );
    } else {
      db.prepare(`
        INSERT INTO second_confirmations (
          id, ledger_id, appointment_no, batch_no, confirm_type, confirm_result,
          confirm_time, operator_id, operator_name, remark, raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        ledger.id,
        input.appointmentNo,
        input.batchNo,
        input.confirmType,
        input.confirmResult,
        input.confirmTime,
        input.operatorId,
        input.operatorName,
        input.remark || null,
        rawData,
        now()
      );
    }

    const result = snakeToCamel(
      db
        .prepare('SELECT * FROM second_confirmations WHERE appointment_no = ? AND batch_no = ?')
        .get(input.appointmentNo, input.batchNo)
    ) as SecondConfirmation;

    return { created: isNew, data: result };
  } catch (error) {
    recordFailure(
      DataSource.SECOND_CONFIRMATION,
      rawData,
      error instanceof Error ? error.message : '未知错误',
      input.appointmentNo,
      input.batchNo
    );
    throw error;
  }
}

export function changeLedgerStatus(
  input: StatusChangeInput
): { ledger: Ledger; log: StatusChangeLog } {
  const db = getDatabase();

  const ledger = snakeToCamel(
    db.prepare('SELECT * FROM ledgers WHERE id = ?').get(input.ledgerId)
  ) as Ledger | undefined;

  if (!ledger) {
    throw new Error('台账记录不存在');
  }

  if (!canTransition(ledger.status, input.targetStatus as LedgerStatus, input.role)) {
    throw new Error(`无法从 ${ledger.status} 转换到 ${input.targetStatus}，当前角色无权限`);
  }

  const sensitiveFields = JSON.stringify(['status', 'rejectReason']);

  db.prepare(`
    UPDATE ledgers SET status = ?, updated_at = ?, reject_reason = ?
    WHERE id = ?
  `).run(
    input.targetStatus,
    now(),
    input.targetStatus === LedgerStatus.REJECTED ? input.changeReason : ledger.rejectReason,
    input.ledgerId
  );

  const logId = uuidv4();
  db.prepare(`
    INSERT INTO status_change_logs (
      id, ledger_id, from_status, to_status, operator_id, operator_name,
      change_reason, sensitive_fields, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    logId,
    input.ledgerId,
    ledger.status,
    input.targetStatus,
    input.operatorId,
    input.operatorName,
    input.changeReason,
    sensitiveFields,
    now()
  );

  const updatedLedger = snakeToCamel(
    db.prepare('SELECT * FROM ledgers WHERE id = ?').get(input.ledgerId)
  ) as Ledger;
  const log = snakeToCamel(
    db.prepare('SELECT * FROM status_change_logs WHERE id = ?').get(logId)
  ) as StatusChangeLog;

  return { ledger: updatedLedger, log };
}

export function getLedgerList(params: {
  status?: LedgerStatus;
  area?: string;
  page?: number;
  pageSize?: number;
  role?: RoleType;
}): { list: Ledger[]; total: number; page: number; pageSize: number } {
  const db = getDatabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];

  if (params.status) {
    conditions.push('status = ?');
    values.push(params.status);
  }
  if (params.area) {
    conditions.push('area = ?');
    values.push(params.area);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM ledgers ${whereClause}`)
    .get(...values) as { count: number };

  const list = snakeToCamel(
    db
      .prepare(`SELECT * FROM ledgers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...values, pageSize, offset)
  ) as Ledger[];

  return { list, total: total.count, page, pageSize };
}

export function getLedgerDetail(ledgerId: string, role?: RoleType): LedgerDetail {
  const db = getDatabase();

  const ledger = snakeToCamel(
    db.prepare('SELECT * FROM ledgers WHERE id = ?').get(ledgerId)
  ) as Ledger | undefined;
  if (!ledger) {
    throw new Error('台账记录不存在');
  }

  const appointment = snakeToCamel(
    db.prepare('SELECT * FROM appointment_orders WHERE ledger_id = ?').get(ledgerId)
  ) as AppointmentOrder | undefined;

  const technicianLocation = snakeToCamel(
    db.prepare('SELECT * FROM technician_locations WHERE ledger_id = ?').get(ledgerId)
  ) as TechnicianLocation | undefined;

  const userReview = snakeToCamel(
    db.prepare('SELECT * FROM user_reviews WHERE ledger_id = ?').get(ledgerId)
  ) as UserReview | undefined;

  const secondConfirmation = snakeToCamel(
    db.prepare('SELECT * FROM second_confirmations WHERE ledger_id = ?').get(ledgerId)
  ) as SecondConfirmation | undefined;

  const statusHistory = snakeToCamel(
    db
      .prepare('SELECT * FROM status_change_logs WHERE ledger_id = ? ORDER BY created_at ASC')
      .all(ledgerId)
  ) as StatusChangeLog[];

  let detail: LedgerDetail = {
    ...ledger,
    appointment,
    technicianLocation,
    userReview,
    secondConfirmation,
    statusHistory,
  };

  if (role !== RoleType.ADMIN && appointment) {
    detail.appointment = {
      ...appointment,
      customerName: maskSensitiveData(appointment.customerName, 'customerName'),
      customerPhone: maskSensitiveData(appointment.customerPhone, 'customerPhone'),
      customerAddress: maskSensitiveData(appointment.customerAddress, 'customerAddress'),
    };
    if (userReview) {
      detail.userReview = {
        ...userReview,
        reviewerPhone: maskSensitiveData(userReview.reviewerPhone, 'reviewerPhone'),
      };
    }
  }

  return detail;
}

export function getFailedRecords(params: {
  dataSource?: DataSource;
  page?: number;
  pageSize?: number;
}): { list: FailedRecord[]; total: number } {
  const db = getDatabase();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];

  if (params.dataSource) {
    conditions.push('data_source = ?');
    values.push(params.dataSource);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM failed_records ${whereClause}`)
    .get(...values) as { count: number };

  const list = snakeToCamel(
    db
      .prepare(`SELECT * FROM failed_records ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...values, pageSize, offset)
  ) as FailedRecord[];

  return { list, total: total.count };
}
