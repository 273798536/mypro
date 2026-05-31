import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import type {
  Booking,
  ConflictCheckResult,
  ConflictDetail,
  ConflictType,
  UUID,
} from '../types';
import { dataStore } from '../store/DataStore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export class ConflictDetectionService {
  private static instance: ConflictDetectionService;

  private constructor() {}

  public static getInstance(): ConflictDetectionService {
    if (!ConflictDetectionService.instance) {
      ConflictDetectionService.instance = new ConflictDetectionService();
    }
    return ConflictDetectionService.instance;
  }

  public checkAllConflicts(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictCheckResult {
    const conflicts: ConflictDetail[] = [];
    const warnings: ConflictDetail[] = [];

    const timeValidityCheck = this.checkTimeSlotValidity(booking);
    if (timeValidityCheck) {
      if (timeValidityCheck.severity === 'ERROR') {
        conflicts.push(timeValidityCheck);
      } else {
        warnings.push(timeValidityCheck);
      }
    }

    const roomConflicts = this.checkRoomConflicts(booking, excludeBookingId);
    conflicts.push(...roomConflicts.filter((c) => c.severity === 'ERROR'));
    warnings.push(...roomConflicts.filter((c) => c.severity !== 'ERROR'));

    if (booking.teacherId) {
      const teacherConflicts = this.checkTeacherConflicts(booking, excludeBookingId);
      conflicts.push(...teacherConflicts.filter((c) => c.severity === 'ERROR'));
      warnings.push(...teacherConflicts.filter((c) => c.severity !== 'ERROR'));

      const leaveConflicts = this.checkTeacherLeaveConflicts(booking);
      conflicts.push(...leaveConflicts.filter((c) => c.severity === 'ERROR'));
      warnings.push(...leaveConflicts.filter((c) => c.severity !== 'ERROR'));
    }

    if (booking.equipmentIds && booking.equipmentIds.length > 0) {
      const equipmentConflicts = this.checkEquipmentConflicts(booking, excludeBookingId);
      conflicts.push(...equipmentConflicts.filter((c) => c.severity === 'ERROR'));
      warnings.push(...equipmentConflicts.filter((c) => c.severity !== 'ERROR'));
    }

    if (booking.isCrossDay) {
      const crossDayWarnings = this.checkCrossDayWarnings(booking, excludeBookingId);
      warnings.push(...crossDayWarnings);
    }

    const sourceSystemWarnings = this.checkSourceSystemDiscrepancies(booking, excludeBookingId);
    warnings.push(...sourceSystemWarnings);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      warnings,
      bookingId: booking.id,
      checkedAt: new Date(),
    };
  }

  public checkTimeSlotValidity(booking: Booking): ConflictDetail | null {
    const { startTime, endTime } = booking;

    if (startTime >= endTime) {
      return {
        type: 'TIME_SLOT_INVALID',
        severity: 'ERROR',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: '预约时间',
        message: '结束时间必须晚于开始时间',
        humanReadableMessage: '预约结束时间必须晚于开始时间，请检查时间设置',
      };
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 1) {
      return {
        type: 'TIME_SLOT_INVALID',
        severity: 'WARNING',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: '预约时长',
        message: '预约时长不足1小时',
        humanReadableMessage: '预约时长不足1小时，建议至少预约1小时',
      };
    }

    if (durationHours > 8 && !booking.isCrossDay) {
      return {
        type: 'TIME_SLOT_INVALID',
        severity: 'WARNING',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: '预约时长',
        message: '预约时长超过8小时',
        humanReadableMessage: '单次预约时长超过8小时，如确需跨日请标记为跨日预约',
      };
    }

    const now = new Date();
    if (endTime < now) {
      return {
        type: 'TIME_SLOT_INVALID',
        severity: 'ERROR',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: '预约时间',
        message: '预约时间已过期',
        humanReadableMessage: '预约的结束时间已经过去，请选择未来的时间段',
      };
    }

    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    if (startHour < 8 || endHour > 23) {
      return {
        type: 'TIME_SLOT_INVALID',
        severity: 'WARNING',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: '营业时间',
        message: '预约时间超出常规营业时间(8:00-23:00)',
        humanReadableMessage: '预约时间超出常规营业时间(8:00-23:00)，需要特别批准',
      };
    }

    return null;
  }

  public checkRoomConflicts(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const room = dataStore.getRoom(booking.roomId);

    if (!room) {
      return [
        {
          type: 'ROOM_OVERLAP',
          severity: 'ERROR',
          resourceType: 'ROOM',
          resourceId: booking.roomId,
          resourceName: '未知排练室',
          message: '排练室不存在',
          humanReadableMessage: '所选的排练室不存在，请重新选择',
        },
      ];
    }

    if (!room.isActive) {
      return [
        {
          type: 'ROOM_OVERLAP',
          severity: 'ERROR',
          resourceType: 'ROOM',
          resourceId: booking.roomId,
          resourceName: room.name,
          message: '排练室已停用',
          humanReadableMessage: `${room.name} 目前已停用，无法预约`,
        },
      ];
    }

    const existingBookings = dataStore
      .getBookingsByRoom(booking.roomId)
      .filter((b) => b.id !== excludeBookingId && b.status !== 'CANCELLED');

    for (const existing of existingBookings) {
      if (this.isTimeOverlap(booking, existing)) {
        const overlapInfo = this.formatOverlapInfo(booking, existing);
        conflicts.push({
          type: 'ROOM_OVERLAP',
          severity: 'ERROR',
          resourceType: 'ROOM',
          resourceId: room.id,
          resourceName: room.name,
          message: `排练室时间冲突，与预约 ${existing.id} 重叠`,
          humanReadableMessage: `${room.name} 在 ${overlapInfo.overlapPeriod} 已被「${existing.customerName}」预约（${overlapInfo.existingPeriod}），您的预约时间为 ${overlapInfo.newPeriod}`,
          overlappingBookingId: existing.id,
          overlappingBookingInfo: `${existing.customerName} - ${existing.purpose}`,
        });
      }
    }

    if (booking.numberOfPeople > room.capacity) {
      conflicts.push({
        type: 'ROOM_OVERLAP',
        severity: 'WARNING',
        resourceType: 'ROOM',
        resourceId: room.id,
        resourceName: room.name,
        message: `人数超出容量限制（${booking.numberOfPeople}/${room.capacity}）`,
        humanReadableMessage: `${room.name} 容量为 ${room.capacity} 人，您预约了 ${booking.numberOfPeople} 人，可能需要考虑更大的排练室`,
      });
    }

    return conflicts;
  }

  public checkTeacherConflicts(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const teacher = dataStore.getTeacher(booking.teacherId!);

    if (!teacher) {
      return [
        {
          type: 'TEACHER_OVERLAP',
          severity: 'ERROR',
          resourceType: 'TEACHER',
          resourceId: booking.teacherId!,
          resourceName: '未知老师',
          message: '老师不存在',
          humanReadableMessage: '所选的老师不存在，请重新选择',
        },
      ];
    }

    if (!teacher.isActive) {
      return [
        {
          type: 'TEACHER_OVERLAP',
          severity: 'ERROR',
          resourceType: 'TEACHER',
          resourceId: teacher.id,
          resourceName: teacher.name,
          message: '老师已停用',
          humanReadableMessage: `${teacher.name} 目前已停用，无法预约`,
        },
      ];
    }

    const existingBookings = dataStore
      .getBookingsByTeacher(teacher.id)
      .filter((b) => b.id !== excludeBookingId && b.status !== 'CANCELLED');

    for (const existing of existingBookings) {
      if (this.isTimeOverlap(booking, existing)) {
        const overlapInfo = this.formatOverlapInfo(booking, existing);
        conflicts.push({
          type: 'TEACHER_OVERLAP',
          severity: 'ERROR',
          resourceType: 'TEACHER',
          resourceId: teacher.id,
          resourceName: teacher.name,
          message: `老师时间冲突，与预约 ${existing.id} 重叠`,
          humanReadableMessage: `${teacher.name}（${teacher.instrument}）在 ${overlapInfo.overlapPeriod} 已有课程安排（${existing.purpose}，${overlapInfo.existingPeriod}），您的预约时间为 ${overlapInfo.newPeriod}`,
          overlappingBookingId: existing.id,
          overlappingBookingInfo: `${existing.customerName} - ${existing.purpose}`,
        });
      }
    }

    return conflicts;
  }

  public checkTeacherLeaveConflicts(booking: Booking): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const teacherId = booking.teacherId;
    if (!teacherId) return conflicts;

    const teacher = dataStore.getTeacher(teacherId);
    if (!teacher) return conflicts;

    const leaves = dataStore.getTeacherLeavesByTeacher(teacherId);

    for (const leave of leaves) {
      if (this.isTimeOverlapWithRange(booking, leave.startDate, leave.endDate)) {
        const isPartialOverlap =
          booking.startTime >= leave.startDate || booking.endTime <= leave.endDate;

        let humanReadableMessage = '';
        if (leave.isHalfDay) {
          const period = leave.halfDayPeriod === 'AM' ? '上午' : '下午';
          humanReadableMessage = `${teacher.name} 在 ${this.formatDate(leave.startDate)} ${period} 请假（原因：${leave.reason}），您的预约时间与此冲突`;
        } else if (this.isSameDay(leave.startDate, leave.endDate)) {
          humanReadableMessage = `${teacher.name} 在 ${this.formatDate(leave.startDate)} 全天请假（原因：${leave.reason}），您的预约时间与此冲突`;
        } else {
          humanReadableMessage = `${teacher.name} 在 ${this.formatDate(leave.startDate)} 至 ${this.formatDate(leave.endDate)} 期间请假（原因：${leave.reason}），${isPartialOverlap ? '部分' : '全部'}时间与此冲突`;
        }

        conflicts.push({
          type: 'TEACHER_ON_LEAVE',
          severity: 'ERROR',
          resourceType: 'TEACHER',
          resourceId: teacherId,
          resourceName: teacher.name,
          message: `老师请假期间无法安排课程`,
          humanReadableMessage,
          leaveRecordId: leave.id,
        });
      }
    }

    return conflicts;
  }

  public checkEquipmentConflicts(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const equipmentIds = booking.equipmentIds || [];

    for (const equipmentId of equipmentIds) {
      const equipment = dataStore.getEquipment(equipmentId);
      if (!equipment) {
        conflicts.push({
          type: 'EQUIPMENT_OVERLAP',
          severity: 'ERROR',
          resourceType: 'EQUIPMENT',
          resourceId: equipmentId,
          resourceName: '未知设备',
          message: '设备不存在',
          humanReadableMessage: '所选的设备不存在，请重新选择',
        });
        continue;
      }

      if (!equipment.isActive) {
        conflicts.push({
          type: 'EQUIPMENT_OVERLAP',
          severity: 'ERROR',
          resourceType: 'EQUIPMENT',
          resourceId: equipmentId,
          resourceName: equipment.name,
          message: '设备已停用',
          humanReadableMessage: `${equipment.name} 目前已停用，无法借出`,
        });
        continue;
      }

      if (equipment.status === 'MAINTENANCE') {
        conflicts.push({
          type: 'EQUIPMENT_OVERLAP',
          severity: 'ERROR',
          resourceType: 'EQUIPMENT',
          resourceId: equipmentId,
          resourceName: equipment.name,
          message: '设备正在维护',
          humanReadableMessage: `${equipment.name} 目前正在维护保养，暂时无法借出`,
        });
        continue;
      }

      if (equipment.status === 'LOST') {
        conflicts.push({
          type: 'EQUIPMENT_OVERLAP',
          severity: 'ERROR',
          resourceType: 'EQUIPMENT',
          resourceId: equipmentId,
          resourceName: equipment.name,
          message: '设备已丢失',
          humanReadableMessage: `${equipment.name} 已登记丢失，无法借出`,
        });
        continue;
      }

      const activeLoans = dataStore.getActiveEquipmentLoans().filter(
        (l) => l.equipmentId === equipmentId && l.bookingId !== excludeBookingId
      );

      for (const loan of activeLoans) {
        if (this.isTimeOverlapWithRange(booking, loan.checkoutTime, loan.expectedReturnTime)) {
          const loanBooking = dataStore.getBooking(loan.bookingId);
          conflicts.push({
            type: 'EQUIPMENT_NOT_RETURNED',
            severity: 'ERROR',
            resourceType: 'EQUIPMENT',
            resourceId: equipmentId,
            resourceName: equipment.name,
            message: `设备已被借出，与借出记录 ${loan.id} 冲突`,
            humanReadableMessage: `${equipment.name} 已被「${loan.borrowerName}」借出（${this.formatDateTime(loan.checkoutTime)} - ${this.formatDateTime(loan.expectedReturnTime)}）${loanBooking ? `，用于「${loanBooking.purpose}」` : ''}，预计归还时间可能与您的预约重叠`,
            loanRecordId: loan.id,
            overlappingBookingId: loan.bookingId,
          });
        }
      }

      const existingBookings = dataStore
        .getBookingsByEquipment(equipmentId)
        .filter((b) => b.id !== excludeBookingId && b.status !== 'CANCELLED');

      for (const existing of existingBookings) {
        if (this.isTimeOverlap(booking, existing)) {
          const overlapInfo = this.formatOverlapInfo(booking, existing);
          conflicts.push({
            type: 'EQUIPMENT_OVERLAP',
            severity: 'ERROR',
            resourceType: 'EQUIPMENT',
            resourceId: equipmentId,
            resourceName: equipment.name,
            message: `设备使用冲突，与预约 ${existing.id} 重叠`,
            humanReadableMessage: `${equipment.name} 在 ${overlapInfo.overlapPeriod} 已被「${existing.customerName}」预约使用（${overlapInfo.existingPeriod}），您的预约时间为 ${overlapInfo.newPeriod}`,
            overlappingBookingId: existing.id,
            overlappingBookingInfo: `${existing.customerName} - ${existing.purpose}`,
          });
        }
      }

      const overdueLoans = dataStore.getOverdueEquipmentLoans().filter(
        (l) => l.equipmentId === equipmentId
      );

      for (const loan of overdueLoans) {
        const overdueHours = Math.round(
          (new Date().getTime() - loan.expectedReturnTime.getTime()) / (1000 * 60 * 60)
        );
        conflicts.push({
          type: 'EQUIPMENT_NOT_RETURNED',
          severity: 'WARNING',
          resourceType: 'EQUIPMENT',
          resourceId: equipmentId,
          resourceName: equipment.name,
          message: `设备逾期未归还（${overdueHours}小时）`,
          humanReadableMessage: `⚠️ ${equipment.name} 被「${loan.borrowerName}」借出后已逾期 ${overdueHours} 小时未归还，实际可用性无法保证，建议先联系设备管理员确认`,
          loanRecordId: loan.id,
        });
      }
    }

    return conflicts;
  }

  public checkCrossDayWarnings(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictDetail[] {
    const warnings: ConflictDetail[] = [];

    const nextDayBookings = dataStore
      .getBookingsByRoom(booking.roomId)
      .filter(
        (b) =>
          b.id !== excludeBookingId &&
          b.status !== 'CANCELLED' &&
          b.startTime >= booking.endTime &&
          b.startTime < dayjs(booking.endTime).add(12, 'hour').toDate()
      );

    for (const nextBooking of nextDayBookings) {
      const gapMinutes = Math.round(
        (nextBooking.startTime.getTime() - booking.endTime.getTime()) / (1000 * 60)
      );
      if (gapMinutes < 120) {
        warnings.push({
          type: 'CROSS_DAY_OVERLAP',
          severity: 'WARNING',
          resourceType: 'ROOM',
          resourceId: booking.roomId,
          resourceName: '跨日预约',
          message: `跨日预约与次日预约间隔仅 ${gapMinutes} 分钟`,
          humanReadableMessage: `您的跨日预约结束时间为 ${this.formatDateTime(booking.endTime)}，次日已有「${nextBooking.customerName}」的预约从 ${this.formatDateTime(nextBooking.startTime)} 开始，间隔仅 ${gapMinutes} 分钟，请确保按时清场`,
          overlappingBookingId: nextBooking.id,
        });
      }
    }

    return warnings;
  }

  public checkSourceSystemDiscrepancies(
    booking: Booking,
    excludeBookingId?: UUID
  ): ConflictDetail[] {
    const warnings: ConflictDetail[] = [];
    if (!booking.sourceSystem) return warnings;

    const room = dataStore.getRoom(booking.roomId);
    const overlappingBookings = dataStore
      .getBookingsByRoom(booking.roomId)
      .filter(
        (b) =>
          b.id !== excludeBookingId &&
          b.status !== 'CANCELLED' &&
          b.sourceSystem &&
          b.sourceSystem !== booking.sourceSystem &&
          this.isTimeOverlap(booking, b)
      );

    for (const overlapping of overlappingBookings) {
      const systemName = this.getSourceSystemName(booking.sourceSystem);
      const otherSystemName = this.getSourceSystemName(overlapping.sourceSystem!);
      const overlapInfo = this.formatOverlapInfo(booking, overlapping);

      warnings.push({
        type: 'ROOM_OVERLAP',
        severity: 'WARNING',
        resourceType: 'ROOM',
        resourceId: booking.roomId,
        resourceName: room?.name || '未知排练室',
        message: `不同系统数据冲突：${systemName} vs ${otherSystemName}`,
        humanReadableMessage: `⚠️ 数据来源不一致警告：本条预约来自「${systemName}」，但「${otherSystemName}」中已有「${overlapping.customerName}」的预约在同一时段（${overlapInfo.overlapPeriod}）。请人工核实后处理，不要自动覆盖任何一方数据！`,
        overlappingBookingId: overlapping.id,
        overlappingBookingInfo: `${overlapping.customerName} - ${overlapping.purpose} (来源: ${otherSystemName})`,
      });
    }

    return warnings;
  }

  public findConflictsInDateRange(
    startDate: Date,
    endDate: Date
  ): { booking: Booking; conflicts: ConflictCheckResult }[] {
    const bookings = dataStore.getBookingsByDateRange(startDate, endDate);
    const results: { booking: Booking; conflicts: ConflictCheckResult }[] = [];

    for (const booking of bookings) {
      const conflictCheck = this.checkAllConflicts(booking, booking.id);
      if (conflictCheck.conflicts.length > 0 || conflictCheck.warnings.length > 0) {
        results.push({ booking, conflicts: conflictCheck });
      }
    }

    return results;
  }

  public getConflictTypeDescription(type: ConflictType): {
    label: string;
    description: string;
    category: string;
  } {
    const descriptions: Record<
      ConflictType,
      { label: string; description: string; category: string }
    > = {
      ROOM_OVERLAP: {
        label: '排练室时间冲突',
        description: '同一排练室在相同时间段被多个预约占用',
        category: '排练室',
      },
      TEACHER_OVERLAP: {
        label: '老师时间冲突',
        description: '同一位老师在相同时间段被多个预约安排',
        category: '老师',
      },
      TEACHER_ON_LEAVE: {
        label: '老师请假冲突',
        description: '预约时间恰逢老师请假期间',
        category: '老师',
      },
      EQUIPMENT_OVERLAP: {
        label: '设备使用冲突',
        description: '同一设备在相同时间段被多个预约使用',
        category: '设备',
      },
      EQUIPMENT_NOT_RETURNED: {
        label: '设备未归还',
        description: '设备已被借出且未归还，或逾期未归还',
        category: '设备',
      },
      CROSS_DAY_OVERLAP: {
        label: '跨日预约警告',
        description: '跨日预约与次日预约间隔过短',
        category: '预约',
      },
      TIME_SLOT_INVALID: {
        label: '时间段无效',
        description: '预约时间设置不合理或已过期',
        category: '预约',
      },
    };

    return descriptions[type];
  }

  private isTimeOverlap(booking1: Booking, booking2: Booking): boolean {
    return (
      booking1.startTime < booking2.endTime &&
      booking1.endTime > booking2.startTime
    );
  }

  private isTimeOverlapWithRange(
    booking: Booking,
    rangeStart: Date,
    rangeEnd: Date
  ): boolean {
    return (
      booking.startTime < rangeEnd && booking.endTime > rangeStart
    );
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private formatDate(date: Date): string {
    return dayjs(date).format('YYYY年MM月DD日');
  }

  private formatDateTime(date: Date): string {
    return dayjs(date).format('MM月DD日 HH:mm');
  }

  private formatOverlapInfo(
    newBooking: Booking,
    existingBooking: Booking
  ): {
    overlapPeriod: string;
    newPeriod: string;
    existingPeriod: string;
  } {
    const overlapStart = newBooking.startTime > existingBooking.startTime
      ? newBooking.startTime
      : existingBooking.startTime;
    const overlapEnd = newBooking.endTime < existingBooking.endTime
      ? newBooking.endTime
      : existingBooking.endTime;

    return {
      overlapPeriod: `${this.formatDateTime(overlapStart)} - ${this.formatDateTime(overlapEnd)}`,
      newPeriod: `${this.formatDateTime(newBooking.startTime)} - ${this.formatDateTime(newBooking.endTime)}`,
      existingPeriod: `${this.formatDateTime(existingBooking.startTime)} - ${this.formatDateTime(existingBooking.endTime)}`,
    };
  }

  private getSourceSystemName(system: string): string {
    const names: Record<string, string> = {
      ROOM_SYSTEM: '排练室预约系统',
      TEACHER_SYSTEM: '老师课表系统',
      MANUAL: '人工录入',
    };
    return names[system] || system;
  }
}

export const conflictDetectionService = ConflictDetectionService.getInstance();
