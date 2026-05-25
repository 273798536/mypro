"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importAppointmentOrder = importAppointmentOrder;
exports.importTechnicianLocation = importTechnicianLocation;
exports.importUserReview = importUserReview;
exports.importSecondConfirmation = importSecondConfirmation;
exports.changeLedgerStatus = changeLedgerStatus;
exports.getLedgerList = getLedgerList;
exports.getLedgerDetail = getLedgerDetail;
exports.getFailedRecords = getFailedRecords;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const connection_1 = require("../database/connection");
const types_1 = require("../types");
const stateMachine_1 = require("../utils/stateMachine");
const caseConvert_1 = require("../utils/caseConvert");
function now() {
    return (0, dayjs_1.default)().format('YYYY-MM-DD HH:mm:ss');
}
function recordFailure(dataSource, rawData, errorMessage, appointmentNo, batchNo) {
    const db = (0, connection_1.getDatabase)();
    const stmt = db.prepare(`
    INSERT INTO failed_records (id, data_source, raw_data, error_message, appointment_no, batch_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run((0, uuid_1.v4)(), dataSource, rawData, errorMessage, appointmentNo, batchNo, now());
}
function recordDataModificationAttempt(ledgerId, dataSource, rawData, operatorId, operatorName) {
    const db = (0, connection_1.getDatabase)();
    const logId = (0, uuid_1.v4)();
    const sensitiveFields = JSON.stringify(['attempted_modification_after_audit']);
    db.prepare(`
    INSERT INTO status_change_logs (
      id, ledger_id, from_status, to_status, operator_id, operator_name,
      change_reason, sensitive_fields, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(logId, ledgerId, types_1.LedgerStatus.AUDIT_ONLY, types_1.LedgerStatus.AUDIT_ONLY, operatorId, operatorName, `尝试在只读审计状态下修改${dataSource}数据，已拒绝`, sensitiveFields, now());
}
function assertNotAuditOnly(ledger, dataSource, rawData, operatorId, operatorName) {
    if (ledger.status === types_1.LedgerStatus.AUDIT_ONLY) {
        const errorMessage = `台账已进入只读审计状态(audit_only)，无法修改${dataSource}数据`;
        recordFailure(dataSource, rawData, errorMessage, ledger.appointmentNo, ledger.batchNo);
        if (operatorId && operatorName) {
            recordDataModificationAttempt(ledger.id, dataSource, rawData, operatorId, operatorName);
        }
        throw new Error(errorMessage);
    }
}
function importAppointmentOrder(input) {
    const db = (0, connection_1.getDatabase)();
    const rawData = JSON.stringify(input);
    try {
        const existingLedger = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        const existingAppointment = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM appointment_orders WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        const isNew = !existingLedger;
        if (!isNew) {
            assertNotAuditOnly(existingLedger, types_1.DataSource.APPOINTMENT, rawData, input.operatorId, input.operatorName);
        }
        let ledgerId;
        if (isNew) {
            ledgerId = (0, uuid_1.v4)();
            db.prepare(`
        INSERT INTO ledgers (id, appointment_no, batch_no, status, area, appliance_type, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ledgerId, input.appointmentNo, input.batchNo, types_1.LedgerStatus.DRAFT, input.area, input.applianceType, input.operatorId, now(), now());
        }
        else {
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
      `).run(input.customerName, input.customerPhone, input.customerAddress, input.area, input.applianceType, input.appointmentTime, input.technicianId, input.technicianName, input.status, rawData, now(), input.appointmentNo, input.batchNo);
        }
        else {
            db.prepare(`
        INSERT INTO appointment_orders (
          id, ledger_id, appointment_no, batch_no, customer_name, customer_phone,
          customer_address, area, appliance_type, appointment_time, technician_id,
          technician_name, status, raw_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run((0, uuid_1.v4)(), ledgerId, input.appointmentNo, input.batchNo, input.customerName, input.customerPhone, input.customerAddress, input.area, input.applianceType, input.appointmentTime, input.technicianId, input.technicianName, input.status, rawData, now(), now());
        }
        const ledger = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(ledgerId));
        const appointment = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM appointment_orders WHERE ledger_id = ?').get(ledgerId));
        return { created: isNew, data: { ledger, appointment } };
    }
    catch (error) {
        recordFailure(types_1.DataSource.APPOINTMENT, rawData, error instanceof Error ? error.message : '未知错误', input.appointmentNo, input.batchNo);
        throw error;
    }
}
function importTechnicianLocation(input) {
    const db = (0, connection_1.getDatabase)();
    const rawData = JSON.stringify(input);
    try {
        const ledger = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        if (!ledger) {
            throw new Error('台账记录不存在，请先导入预约单');
        }
        assertNotAuditOnly(ledger, types_1.DataSource.TECHNICIAN_LOCATION, rawData, input.technicianId);
        const existing = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM technician_locations WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        const isNew = !existing;
        if (existing) {
            db.prepare(`
        UPDATE technician_locations SET
          technician_id = ?, check_in_time = ?, check_out_time = ?, location_address = ?,
          latitude = ?, longitude = ?, distance_to_customer = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(input.technicianId, input.checkInTime, input.checkOutTime || null, input.locationAddress, input.latitude, input.longitude, input.distanceToCustomer, rawData, input.appointmentNo, input.batchNo);
        }
        else {
            db.prepare(`
        INSERT INTO technician_locations (
          id, ledger_id, appointment_no, batch_no, technician_id, check_in_time,
          check_out_time, location_address, latitude, longitude, distance_to_customer,
          raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run((0, uuid_1.v4)(), ledger.id, input.appointmentNo, input.batchNo, input.technicianId, input.checkInTime, input.checkOutTime || null, input.locationAddress, input.latitude, input.longitude, input.distanceToCustomer, rawData, now());
        }
        const result = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM technician_locations WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        return { created: isNew, data: result };
    }
    catch (error) {
        recordFailure(types_1.DataSource.TECHNICIAN_LOCATION, rawData, error instanceof Error ? error.message : '未知错误', input.appointmentNo, input.batchNo);
        throw error;
    }
}
function importUserReview(input) {
    const db = (0, connection_1.getDatabase)();
    const rawData = JSON.stringify(input);
    try {
        const ledger = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        if (!ledger) {
            throw new Error('台账记录不存在，请先导入预约单');
        }
        assertNotAuditOnly(ledger, types_1.DataSource.USER_REVIEW, rawData);
        const existing = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM user_reviews WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        const isNew = !existing;
        if (existing) {
            db.prepare(`
        UPDATE user_reviews SET
          rating = ?, review_content = ?, negative_reason = ?, review_time = ?,
          reviewer_phone = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(input.rating, input.reviewContent, input.negativeReason || null, input.reviewTime, input.reviewerPhone, rawData, input.appointmentNo, input.batchNo);
        }
        else {
            db.prepare(`
        INSERT INTO user_reviews (
          id, ledger_id, appointment_no, batch_no, rating, review_content,
          negative_reason, review_time, reviewer_phone, raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run((0, uuid_1.v4)(), ledger.id, input.appointmentNo, input.batchNo, input.rating, input.reviewContent, input.negativeReason || null, input.reviewTime, input.reviewerPhone, rawData, now());
        }
        const result = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM user_reviews WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        return { created: isNew, data: result };
    }
    catch (error) {
        recordFailure(types_1.DataSource.USER_REVIEW, rawData, error instanceof Error ? error.message : '未知错误', input.appointmentNo, input.batchNo);
        throw error;
    }
}
function importSecondConfirmation(input) {
    const db = (0, connection_1.getDatabase)();
    const rawData = JSON.stringify(input);
    try {
        const ledger = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM ledgers WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        if (!ledger) {
            throw new Error('台账记录不存在，请先导入预约单');
        }
        assertNotAuditOnly(ledger, types_1.DataSource.SECOND_CONFIRMATION, rawData, input.operatorId, input.operatorName);
        const existing = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM second_confirmations WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        const isNew = !existing;
        if (existing) {
            db.prepare(`
        UPDATE second_confirmations SET
          confirm_type = ?, confirm_result = ?, confirm_time = ?, operator_id = ?,
          operator_name = ?, remark = ?, raw_data = ?
        WHERE appointment_no = ? AND batch_no = ?
      `).run(input.confirmType, input.confirmResult, input.confirmTime, input.operatorId, input.operatorName, input.remark || null, rawData, input.appointmentNo, input.batchNo);
        }
        else {
            db.prepare(`
        INSERT INTO second_confirmations (
          id, ledger_id, appointment_no, batch_no, confirm_type, confirm_result,
          confirm_time, operator_id, operator_name, remark, raw_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run((0, uuid_1.v4)(), ledger.id, input.appointmentNo, input.batchNo, input.confirmType, input.confirmResult, input.confirmTime, input.operatorId, input.operatorName, input.remark || null, rawData, now());
        }
        const result = (0, caseConvert_1.snakeToCamel)(db
            .prepare('SELECT * FROM second_confirmations WHERE appointment_no = ? AND batch_no = ?')
            .get(input.appointmentNo, input.batchNo));
        return { created: isNew, data: result };
    }
    catch (error) {
        recordFailure(types_1.DataSource.SECOND_CONFIRMATION, rawData, error instanceof Error ? error.message : '未知错误', input.appointmentNo, input.batchNo);
        throw error;
    }
}
function changeLedgerStatus(input) {
    const db = (0, connection_1.getDatabase)();
    const ledger = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(input.ledgerId));
    if (!ledger) {
        throw new Error('台账记录不存在');
    }
    if (!(0, stateMachine_1.canTransition)(ledger.status, input.targetStatus, input.role)) {
        throw new Error(`无法从 ${ledger.status} 转换到 ${input.targetStatus}，当前角色无权限`);
    }
    const sensitiveFields = JSON.stringify(['status', 'rejectReason']);
    db.prepare(`
    UPDATE ledgers SET status = ?, updated_at = ?, reject_reason = ?
    WHERE id = ?
  `).run(input.targetStatus, now(), input.targetStatus === types_1.LedgerStatus.REJECTED ? input.changeReason : ledger.rejectReason, input.ledgerId);
    const logId = (0, uuid_1.v4)();
    db.prepare(`
    INSERT INTO status_change_logs (
      id, ledger_id, from_status, to_status, operator_id, operator_name,
      change_reason, sensitive_fields, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(logId, input.ledgerId, ledger.status, input.targetStatus, input.operatorId, input.operatorName, input.changeReason, sensitiveFields, now());
    const updatedLedger = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(input.ledgerId));
    const log = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM status_change_logs WHERE id = ?').get(logId));
    return { ledger: updatedLedger, log };
}
function getLedgerList(params) {
    const db = (0, connection_1.getDatabase)();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const values = [];
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
        .get(...values);
    const list = (0, caseConvert_1.snakeToCamel)(db
        .prepare(`SELECT * FROM ledgers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .all(...values, pageSize, offset));
    return { list, total: total.count, page, pageSize };
}
function getLedgerDetail(ledgerId, role) {
    const db = (0, connection_1.getDatabase)();
    const ledger = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM ledgers WHERE id = ?').get(ledgerId));
    if (!ledger) {
        throw new Error('台账记录不存在');
    }
    const appointment = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM appointment_orders WHERE ledger_id = ?').get(ledgerId));
    const technicianLocation = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM technician_locations WHERE ledger_id = ?').get(ledgerId));
    const userReview = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM user_reviews WHERE ledger_id = ?').get(ledgerId));
    const secondConfirmation = (0, caseConvert_1.snakeToCamel)(db.prepare('SELECT * FROM second_confirmations WHERE ledger_id = ?').get(ledgerId));
    const statusHistory = (0, caseConvert_1.snakeToCamel)(db
        .prepare('SELECT * FROM status_change_logs WHERE ledger_id = ? ORDER BY created_at ASC')
        .all(ledgerId));
    let detail = {
        ...ledger,
        appointment,
        technicianLocation,
        userReview,
        secondConfirmation,
        statusHistory,
    };
    if (role !== types_1.RoleType.ADMIN && appointment) {
        detail.appointment = {
            ...appointment,
            customerName: (0, stateMachine_1.maskSensitiveData)(appointment.customerName, 'customerName'),
            customerPhone: (0, stateMachine_1.maskSensitiveData)(appointment.customerPhone, 'customerPhone'),
            customerAddress: (0, stateMachine_1.maskSensitiveData)(appointment.customerAddress, 'customerAddress'),
        };
        if (userReview) {
            detail.userReview = {
                ...userReview,
                reviewerPhone: (0, stateMachine_1.maskSensitiveData)(userReview.reviewerPhone, 'reviewerPhone'),
            };
        }
    }
    return detail;
}
function getFailedRecords(params) {
    const db = (0, connection_1.getDatabase)();
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const values = [];
    if (params.dataSource) {
        conditions.push('data_source = ?');
        values.push(params.dataSource);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db
        .prepare(`SELECT COUNT(*) as count FROM failed_records ${whereClause}`)
        .get(...values);
    const list = (0, caseConvert_1.snakeToCamel)(db
        .prepare(`SELECT * FROM failed_records ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .all(...values, pageSize, offset));
    return { list, total: total.count };
}
//# sourceMappingURL=ledgerService.js.map