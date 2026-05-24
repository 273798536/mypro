"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataChecker = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
class DataChecker {
    constructor(db) {
        this.db = db;
    }
    runChecks(batchId) {
        const issues = [];
        if (batchId) {
            this.db.clearCheckResultsByBatch(batchId);
        }
        const bookings = this.parseRecords(this.db.getImportRecordsBySource('booking', batchId));
        const accesses = this.parseRecords(this.db.getImportRecordsBySource('access', batchId));
        const cancellations = this.parseRecords(this.db.getImportRecordsBySource('cancellation', batchId));
        const confirmations = this.parseRecords(this.db.getImportRecordsBySource('confirmation', batchId));
        const allRecords = [...bookings, ...accesses, ...cancellations, ...confirmations];
        const totalRecords = allRecords.length;
        issues.push(...this.checkBookingCancellationConflict(bookings, cancellations, confirmations));
        issues.push(...this.checkCancellationWithoutConfirmation(cancellations, confirmations));
        issues.push(...this.checkAccessForCancelledMeetings(bookings, accesses, cancellations, confirmations));
        issues.push(...this.checkTeaBreakEquipmentForCancelled(bookings, cancellations, confirmations));
        issues.push(...this.checkTimeConsistency(bookings, accesses, cancellations, confirmations));
        issues.push(...this.checkOrphanRecords(bookings, cancellations, confirmations));
        issues.push(...this.checkDuplicateRecords(bookings, accesses, cancellations, confirmations));
        issues.push(...this.checkIndividualRecords(bookings, 'booking'));
        issues.push(...this.checkIndividualRecords(accesses, 'access'));
        issues.push(...this.checkIndividualRecords(cancellations, 'cancellation'));
        issues.push(...this.checkIndividualRecords(confirmations, 'confirmation'));
        const failed = issues.filter(i => i.status === 'fail').length;
        const warnings = issues.filter(i => i.status === 'warning').length;
        const passed = totalRecords - failed;
        issues.forEach(issue => {
            (issue.relatedRecordIds || []).forEach(recordId => {
                this.db.insertCheckResult({
                    import_record_id: recordId,
                    check_type: issue.checkType,
                    status: issue.status,
                    message: issue.message,
                    details: issue.details,
                    created_at: new Date().toISOString()
                });
            });
        });
        allRecords.forEach(rec => {
            const recordIssues = issues.filter(i => i.relatedRecordIds?.includes(rec.dbId));
            const hasFail = recordIssues.some(i => i.status === 'fail');
            const hasWarning = recordIssues.some(i => i.status === 'warning');
            if (hasFail) {
                this.db.updateImportRecordStatus(rec.dbId, 'failed', JSON.stringify(recordIssues.filter(i => i.status === 'fail')));
            }
            else if (hasWarning) {
                this.db.updateImportRecordStatus(rec.dbId, 'success', JSON.stringify(recordIssues.filter(i => i.status === 'warning')));
            }
            else {
                this.db.updateImportRecordStatus(rec.dbId, 'success');
            }
        });
        return {
            totalRecords,
            passed,
            failed,
            warnings,
            issues
        };
    }
    parseRecords(records) {
        return records
            .filter(r => r.status !== 'withdrawn')
            .map(r => ({
            ...JSON.parse(r.parsed_data),
            dbId: r.id
        }));
    }
    checkBookingCancellationConflict(bookings, cancellations, confirmations) {
        const issues = [];
        bookings.forEach(booking => {
            const hasCancellation = cancellations.some(c => c.bookingId === booking.bookingId);
            const hasConfirmationCancel = confirmations.some(c => c.bookingId === booking.bookingId && c.confirmedStatus === 'cancelled');
            if (booking.status !== 'cancelled' && (hasCancellation || hasConfirmationCancel)) {
                const relatedIds = [
                    booking.dbId,
                    ...cancellations.filter(c => c.bookingId === booking.bookingId).map(c => c.dbId),
                    ...confirmations.filter(c => c.bookingId === booking.bookingId && c.confirmedStatus === 'cancelled').map(c => c.dbId)
                ].filter(Boolean);
                issues.push({
                    checkType: 'booking_cancellation_conflict',
                    status: 'fail',
                    message: `预约 [${booking.bookingId}] 显示状态为"${booking.status}"，但存在取消记录`,
                    details: `预约ID: ${booking.bookingId}, 会议室: ${booking.roomName}, 当前预约状态: ${booking.status}, 但已有取消消息或确认取消`,
                    relatedRecordIds: relatedIds
                });
            }
        });
        return issues;
    }
    checkCancellationWithoutConfirmation(cancellations, confirmations) {
        const issues = [];
        cancellations.forEach(cancellation => {
            const hasConfirmation = confirmations.some(c => c.bookingId === cancellation.bookingId);
            if (!hasConfirmation) {
                issues.push({
                    checkType: 'cancellation_without_confirmation',
                    status: 'warning',
                    message: `取消记录 [${cancellation.cancelId}] 缺少对应的二次确认单`,
                    details: `预约ID: ${cancellation.cancelId}, 会议室: ${cancellation.roomName}, 取消人: ${cancellation.canceller}，但未收到二次确认单`,
                    relatedRecordIds: [cancellation.dbId]
                });
            }
        });
        return issues;
    }
    checkAccessForCancelledMeetings(bookings, accesses, cancellations, confirmations) {
        const issues = [];
        const cancelledBookingIds = new Set();
        cancellations.forEach(c => cancelledBookingIds.add(c.bookingId));
        confirmations.filter(c => c.confirmedStatus === 'cancelled').forEach(c => cancelledBookingIds.add(c.bookingId));
        bookings.filter(b => b.status === 'cancelled').forEach(b => cancelledBookingIds.add(b.bookingId));
        accesses.forEach(access => {
            const relatedBookings = bookings.filter(b => {
                if (!cancelledBookingIds.has(b.bookingId))
                    return false;
                if (b.roomName !== access.roomName)
                    return false;
                const swipeTime = (0, dayjs_1.default)(access.swipeTime);
                const startTime = (0, dayjs_1.default)(b.startTime);
                const endTime = (0, dayjs_1.default)(b.endTime);
                return swipeTime.isAfter(startTime.subtract(1, 'hour')) && swipeTime.isBefore(endTime.add(1, 'hour'));
            });
            if (relatedBookings.length > 0) {
                const relatedIds = [
                    access.dbId,
                    ...relatedBookings.map(b => b.dbId),
                    ...cancellations.filter(c => relatedBookings.some(b => b.bookingId === c.bookingId)).map(c => c.dbId),
                    ...confirmations.filter(c => c.confirmedStatus === 'cancelled' && relatedBookings.some(b => b.bookingId === c.bookingId)).map(c => c.dbId)
                ].filter(Boolean);
                issues.push({
                    checkType: 'access_for_cancelled_meeting',
                    status: 'warning',
                    message: `门禁记录 [${access.accessId}] 可能对应已取消的会议`,
                    details: `人员: ${access.personName}, 会议室: ${access.roomName}, 刷卡时间: ${access.swipeTime}，该时间段有已取消的会议预约`,
                    relatedRecordIds: relatedIds
                });
            }
        });
        return issues;
    }
    checkTeaBreakEquipmentForCancelled(bookings, cancellations, confirmations) {
        const issues = [];
        const cancelledBookingIds = new Set();
        cancellations.forEach(c => cancelledBookingIds.add(c.bookingId));
        confirmations.filter(c => c.confirmedStatus === 'cancelled').forEach(c => cancelledBookingIds.add(c.bookingId));
        bookings.forEach(booking => {
            const isCancelled = booking.status === 'cancelled' || cancelledBookingIds.has(booking.bookingId);
            if (isCancelled && (booking.hasTeaBreak || booking.hasEquipment)) {
                const relatedIds = [booking.dbId].filter(Boolean);
                const allRelatedIds = [
                    booking.dbId,
                    ...cancellations.filter(c => c.bookingId === booking.bookingId).map(c => c.dbId),
                    ...confirmations.filter(c => c.bookingId === booking.bookingId).map(c => c.dbId)
                ].filter(Boolean);
                issues.push({
                    checkType: 'tea_break_equipment_for_cancelled',
                    status: 'fail',
                    message: `【成本追回风险】已取消的预约 [${booking.bookingId}] 仍有茶歇或设备需求`,
                    details: `预约ID: ${booking.bookingId}, 会议室: ${booking.roomName}, 会议已取消，但茶歇: ${booking.hasTeaBreak ? '是' : '否'}, 设备: ${booking.hasEquipment ? '是' : '否'}。成本可能已产生且难以追回！关联记录ID: ${allRelatedIds.join(', ')}`,
                    relatedRecordIds: relatedIds
                });
            }
        });
        return issues;
    }
    checkTimeConsistency(bookings, accesses, cancellations, confirmations) {
        const issues = [];
        bookings.forEach(booking => {
            const startTime = (0, dayjs_1.default)(booking.startTime);
            const endTime = (0, dayjs_1.default)(booking.endTime);
            if (endTime.isBefore(startTime)) {
                issues.push({
                    checkType: 'time_consistency',
                    status: 'fail',
                    message: `预约 [${booking.bookingId}] 结束时间早于开始时间`,
                    details: `开始时间: ${booking.startTime}, 结束时间: ${booking.endTime}`,
                    relatedRecordIds: [booking.dbId]
                });
            }
        });
        cancellations.forEach(cancellation => {
            const cancelTime = (0, dayjs_1.default)(cancellation.cancelTime);
            const originalStartTime = (0, dayjs_1.default)(cancellation.originalStartTime);
            if (cancelTime.isAfter(originalStartTime)) {
                issues.push({
                    checkType: 'time_consistency',
                    status: 'warning',
                    message: `取消记录 [${cancellation.cancelId}] 取消时间晚于原会议开始时间`,
                    details: `取消时间: ${cancellation.cancelTime}, 原开始时间: ${cancellation.originalStartTime}，可能已产生成本`,
                    relatedRecordIds: [cancellation.dbId]
                });
            }
        });
        return issues;
    }
    checkOrphanRecords(bookings, cancellations, confirmations) {
        const issues = [];
        const bookingIds = new Set(bookings.map(b => b.bookingId));
        cancellations.forEach(cancellation => {
            if (!bookingIds.has(cancellation.bookingId)) {
                issues.push({
                    checkType: 'orphan_record',
                    status: 'warning',
                    message: `取消记录 [${cancellation.cancelId}] 找不到对应的预约记录`,
                    details: `取消记录关联的预约ID: ${cancellation.bookingId} 在预约日历中不存在`,
                    relatedRecordIds: [cancellation.dbId]
                });
            }
        });
        confirmations.forEach(confirmation => {
            if (!bookingIds.has(confirmation.bookingId)) {
                issues.push({
                    checkType: 'orphan_record',
                    status: 'warning',
                    message: `确认单 [${confirmation.confirmId}] 找不到对应的预约记录`,
                    details: `确认单关联的预约ID: ${confirmation.bookingId} 在预约日历中不存在`,
                    relatedRecordIds: [confirmation.dbId]
                });
            }
        });
        return issues;
    }
    checkDuplicateRecords(bookings, accesses, cancellations, confirmations) {
        const issues = [];
        const checkDuplicates = (records, idField, typeName, checkType) => {
            const idMap = new Map();
            records.forEach(r => {
                const id = String(r[idField]);
                if (!idMap.has(id))
                    idMap.set(id, []);
                idMap.get(id).push(r);
            });
            idMap.forEach((recs, id) => {
                if (recs.length > 1) {
                    issues.push({
                        checkType,
                        status: 'warning',
                        message: `${typeName} [${id}] 存在 ${recs.length} 条重复记录`,
                        details: `重复的记录ID: ${recs.map(r => r.dbId).join(', ')}`,
                        relatedRecordIds: recs.map(r => r.dbId)
                    });
                }
            });
        };
        checkDuplicates(bookings, 'bookingId', '预约', 'duplicate_booking');
        checkDuplicates(accesses, 'accessId', '门禁记录', 'duplicate_access');
        checkDuplicates(cancellations, 'cancelId', '取消记录', 'duplicate_cancellation');
        checkDuplicates(confirmations, 'confirmId', '确认单', 'duplicate_confirmation');
        return issues;
    }
    checkIndividualRecords(records, sourceType) {
        const issues = [];
        records.forEach(record => {
            const rec = record;
            if (!rec.roomName || String(rec.roomName).trim() === '') {
                issues.push({
                    checkType: `missing_room_${sourceType}`,
                    status: 'fail',
                    message: `${sourceType} 记录缺少会议室名称`,
                    details: `记录ID: ${record.dbId}`,
                    relatedRecordIds: [record.dbId]
                });
            }
        });
        return issues;
    }
}
exports.DataChecker = DataChecker;
//# sourceMappingURL=checker.js.map