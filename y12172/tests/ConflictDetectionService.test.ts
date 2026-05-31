import dayjs from 'dayjs';
import { conflictDetectionService } from '../src/services/ConflictDetectionService';
import { dataStore } from '../src/store/DataStore';
import { Booking } from '../src/types';

describe('ConflictDetectionService', () => {
  describe('checkRoomConflicts', () => {
    it('should detect room time overlap conflict', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const conflictBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.endTime).add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: existingBooking.roomId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkRoomConflicts(conflictBooking, 'test-booking');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('ROOM_OVERLAP');
      expect(result[0].severity).toBe('ERROR');
      expect(result[0].humanReadableMessage).toContain(existingBooking.customerName);
    });

    it('should not detect conflict when times do not overlap', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const nonConflictBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.endTime).add(1, 'hour').toDate(),
        endTime: dayjs(existingBooking.endTime).add(2, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: existingBooking.roomId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkRoomConflicts(nonConflictBooking, 'test-booking');
      const errorConflicts = result.filter((c) => c.severity === 'ERROR' && c.type === 'ROOM_OVERLAP');
      expect(errorConflicts.length).toBe(0);
    });

    it('should detect room capacity warning', () => {
      const room = dataStore.getRoom('room-001')!;
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(3, 'day').toDate(),
        endTime: dayjs().add(3, 'day').add(2, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: room.id,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: room.capacity + 5,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkRoomConflicts(booking, 'test-booking');
      const warning = result.find((c) => c.severity === 'WARNING' && c.message.includes('容量'));
      expect(warning).toBeDefined();
      expect(warning?.humanReadableMessage).toContain(`${room.capacity} 人`);
    });

    it('should return error for non-existent room', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: new Date(),
        endTime: new Date(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'non-existent-room',
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkRoomConflicts(booking);
      expect(result[0].type).toBe('ROOM_OVERLAP');
      expect(result[0].severity).toBe('ERROR');
      expect(result[0].humanReadableMessage).toContain('不存在');
    });
  });

  describe('checkTeacherConflicts', () => {
    it('should detect teacher time overlap conflict', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const conflictBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.endTime).add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-002',
        teacherId: existingBooking.teacherId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTeacherConflicts(conflictBooking, 'test-booking');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('TEACHER_OVERLAP');
      expect(result[0].severity).toBe('ERROR');
    });

    it('should detect teacher on leave conflict', () => {
      const leave = dataStore.getAllTeacherLeaves()[0];
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(leave.startDate).add(2, 'hour').toDate(),
        endTime: dayjs(leave.startDate).add(4, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        teacherId: leave.teacherId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTeacherLeaveConflicts(booking);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('TEACHER_ON_LEAVE');
      expect(result[0].leaveRecordId).toBe(leave.id);
      expect(result[0].humanReadableMessage).toContain(leave.reason);
    });
  });

  describe('checkEquipmentConflicts', () => {
    it('should detect equipment time overlap conflict', () => {
      const existingBooking = dataStore.getBooking('booking-002')!;
      const equipmentId = existingBooking.equipmentIds[0];
      const conflictBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.endTime).add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-003',
        equipmentIds: [equipmentId],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkEquipmentConflicts(conflictBooking, 'test-booking');
      const overlapConflict = result.find((c) => c.type === 'EQUIPMENT_OVERLAP');
      expect(overlapConflict).toBeDefined();
      expect(overlapConflict?.severity).toBe('ERROR');
      expect(overlapConflict?.humanReadableMessage).toContain(existingBooking.customerName);
    });

    it('should detect equipment in maintenance', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(1, 'day').toDate(),
        endTime: dayjs().add(1, 'day').add(2, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        equipmentIds: ['equip-004'],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkEquipmentConflicts(booking, 'test-booking');
      const maintenanceConflict = result.find((c) => c.message.includes('维护'));
      expect(maintenanceConflict).toBeDefined();
      expect(maintenanceConflict?.severity).toBe('ERROR');
    });
  });

  describe('checkTimeSlotValidity', () => {
    it('should return error for end time before start time', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(2, 'hour').toDate(),
        endTime: dayjs().add(1, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTimeSlotValidity(booking);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('TIME_SLOT_INVALID');
      expect(result?.severity).toBe('ERROR');
      expect(result?.humanReadableMessage).toContain('晚于开始时间');
    });

    it('should return warning for booking duration less than 1 hour', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(1, 'day').toDate(),
        endTime: dayjs().add(1, 'day').add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTimeSlotValidity(booking);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('TIME_SLOT_INVALID');
      expect(result?.severity).toBe('WARNING');
      expect(result?.humanReadableMessage).toContain('不足1小时');
    });

    it('should return error for past booking', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().subtract(2, 'day').toDate(),
        endTime: dayjs().subtract(2, 'day').add(2, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTimeSlotValidity(booking);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('ERROR');
      expect(result?.humanReadableMessage).toContain('已经过去');
    });

    it('should return warning for outside business hours', () => {
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(1, 'day').hour(6).minute(0).toDate(),
        endTime: dayjs().add(1, 'day').hour(7).minute(0).toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkTimeSlotValidity(booking);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('WARNING');
      expect(result?.humanReadableMessage).toContain('营业时间');
    });
  });

  describe('checkSourceSystemDiscrepancies', () => {
    it('should detect discrepancy between different source systems', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const conflictingBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.endTime).add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: existingBooking.roomId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        sourceSystem: 'TEACHER_SYSTEM',
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkSourceSystemDiscrepancies(conflictingBooking, 'test-booking');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].severity).toBe('WARNING');
      expect(result[0].humanReadableMessage).toContain('数据来源不一致');
      expect(result[0].humanReadableMessage).toContain('不要自动覆盖');
    });
  });

  describe('checkAllConflicts', () => {
    it('should return no conflicts for valid booking', () => {
      const validBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs().add(5, 'day').hour(10).minute(0).toDate(),
        endTime: dayjs().add(5, 'day').hour(12).minute(0).toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        teacherId: 'teacher-002',
        equipmentIds: ['equip-001'],
        purpose: '钢琴练习',
        numberOfPeople: 1,
        sourceSystem: 'MANUAL',
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkAllConflicts(validBooking, 'test-booking');
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });

    it('should return multiple conflicts for problematic booking', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const problematicBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.startTime).add(30, 'minute').add(2, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: existingBooking.roomId,
        teacherId: existingBooking.teacherId,
        equipmentIds: existingBooking.equipmentIds,
        purpose: '测试',
        numberOfPeople: 10,
        sourceSystem: 'TEACHER_SYSTEM',
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkAllConflicts(problematicBooking, 'test-booking');
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include human readable messages for all conflicts', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const conflictingBooking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(existingBooking.startTime).add(30, 'minute').toDate(),
        endTime: dayjs(existingBooking.endTime).add(30, 'minute').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: existingBooking.roomId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkAllConflicts(conflictingBooking, 'test-booking');
      for (const conflict of result.conflicts) {
        expect(conflict.humanReadableMessage).toBeDefined();
        expect(conflict.humanReadableMessage.length).toBeGreaterThan(0);
        expect(conflict.humanReadableMessage).not.toContain('undefined');
      }
    });

    it('should link to related records', () => {
      const leave = dataStore.getAllTeacherLeaves()[0];
      const booking: Booking = {
        id: 'test-booking',
        customerName: '测试用户',
        customerPhone: '13800000000',
        startTime: dayjs(leave.startDate).add(2, 'hour').toDate(),
        endTime: dayjs(leave.startDate).add(4, 'hour').toDate(),
        isCrossDay: false,
        status: 'PENDING',
        roomId: 'room-001',
        teacherId: leave.teacherId,
        equipmentIds: [],
        purpose: '测试',
        numberOfPeople: 1,
        createdBy: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = conflictDetectionService.checkAllConflicts(booking, 'test-booking');
      const leaveConflict = result.conflicts.find((c) => c.type === 'TEACHER_ON_LEAVE');
      expect(leaveConflict?.leaveRecordId).toBe(leave.id);
    });
  });

  describe('getConflictTypeDescription', () => {
    it('should return description for all conflict types', () => {
      const types = [
        'ROOM_OVERLAP',
        'TEACHER_OVERLAP',
        'TEACHER_ON_LEAVE',
        'EQUIPMENT_OVERLAP',
        'EQUIPMENT_NOT_RETURNED',
        'CROSS_DAY_OVERLAP',
        'TIME_SLOT_INVALID',
      ] as const;

      for (const type of types) {
        const description = conflictDetectionService.getConflictTypeDescription(type);
        expect(description.label).toBeDefined();
        expect(description.description).toBeDefined();
        expect(description.category).toBeDefined();
      }
    });
  });
});
