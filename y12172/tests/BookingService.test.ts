import dayjs from 'dayjs';
import { bookingService } from '../src/services/BookingService';
import { dataStore } from '../src/store/DataStore';
import type { CreateBookingRequest } from '../src/types';

describe('BookingService', () => {
  describe('createBooking', () => {
    it('should create booking successfully when no conflicts', async () => {
      const request: CreateBookingRequest = {
        customerName: '测试用户',
        customerPhone: '13800000000',
        customerEmail: 'test@example.com',
        startTime: dayjs().add(5, 'day').hour(10).minute(0).toISOString(),
        endTime: dayjs().add(5, 'day').hour(12).minute(0).toISOString(),
        roomId: 'room-001',
        teacherId: 'teacher-002',
        equipmentIds: ['equip-001'],
        purpose: '钢琴练习',
        numberOfPeople: 1,
        remarks: '请提前准备',
        sourceSystem: 'MANUAL',
        createdBy: 'test-admin',
      };

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.booking?.status).toBe('CONFIRMED');
      expect(result.conflictCheck.hasConflicts).toBe(false);
      expect(result.message).toBe('预约创建成功');

      const loans = dataStore.getEquipmentLoansByBooking(result.booking!.id);
      expect(loans.length).toBe(1);
      expect(loans[0].equipmentId).toBe('equip-001');
    });

    it('should add to waitlist when room conflict exists', async () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const request: CreateBookingRequest = {
        customerName: '冲突用户',
        customerPhone: '13900000000',
        startTime: dayjs(existingBooking.startTime).toISOString(),
        endTime: dayjs(existingBooking.endTime).toISOString(),
        roomId: existingBooking.roomId,
        purpose: '冲突测试',
        numberOfPeople: 2,
        createdBy: 'test-admin',
      };

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking?.status).toBe('WAITLIST');
      expect(result.conflictCheck.hasConflicts).toBe(true);
      expect(result.message).toContain('候补');

      const waitlist = dataStore.getWaitlistByRoom(existingBooking.roomId);
      const hasWaitlistEntry = waitlist.some(
        (e) => e.bookingId === result.booking?.id
      );
      expect(hasWaitlistEntry).toBe(true);
    });

    it('should fail when non-room conflict exists', async () => {
      const leave = dataStore.getAllTeacherLeaves()[0];
      const request: CreateBookingRequest = {
        customerName: '请假冲突用户',
        customerPhone: '14000000000',
        startTime: dayjs(leave.startDate).add(2, 'hour').toISOString(),
        endTime: dayjs(leave.startDate).add(4, 'hour').toISOString(),
        roomId: 'room-001',
        teacherId: leave.teacherId,
        purpose: '请假冲突测试',
        numberOfPeople: 1,
        createdBy: 'test-admin',
      };

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.conflictCheck.hasConflicts).toBe(true);
      expect(result.conflictCheck.conflicts[0].type).toBe('TEACHER_ON_LEAVE');
    });

    it('should detect cross-day booking', async () => {
      const request: CreateBookingRequest = {
        customerName: '跨日用户',
        customerPhone: '14100000000',
        startTime: dayjs().add(10, 'day').hour(22).minute(0).toISOString(),
        endTime: dayjs().add(11, 'day').hour(2).minute(0).toISOString(),
        roomId: 'room-002',
        purpose: '跨日测试',
        numberOfPeople: 3,
        createdBy: 'test-admin',
      };

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking?.isCrossDay).toBe(true);
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully when no conflicts', async () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const newStartTime = dayjs(existingBooking.startTime).add(7, 'day').toDate();
      const newEndTime = dayjs(existingBooking.endTime).add(7, 'day').toDate();

      const result = await bookingService.updateBooking(existingBooking.id, {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        purpose: '更新后的用途',
        updatedBy: 'test-admin',
      });

      expect(result.success).toBe(true);
      expect(result.booking?.purpose).toBe('更新后的用途');
      expect(result.booking?.startTime.getTime()).toBe(newStartTime.getTime());
    });

    it('should fail update when conflicts exist', async () => {
      const booking1 = dataStore.getBooking('booking-001')!;
      const booking2 = dataStore.getBooking('booking-002')!;

      const result = await bookingService.updateBooking(booking2.id, {
        startTime: booking1.startTime.toISOString(),
        endTime: booking1.endTime.toISOString(),
        roomId: booking1.roomId,
        updatedBy: 'test-admin',
      });

      expect(result.success).toBe(false);
      expect(result.conflictCheck?.hasConflicts).toBe(true);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking and process waitlist', async () => {
      const booking = dataStore.getBooking('booking-001')!;

      const result = await bookingService.cancelBooking(booking.id, '测试取消');

      expect(result.success).toBe(true);
      expect(result.booking?.status).toBe('CANCELLED');
      expect(result.booking?.remarks).toContain('测试取消');

      const equipment = dataStore.getEquipment('equip-002');
      expect(equipment?.status).toBe('AVAILABLE');

      const loans = dataStore.getEquipmentLoansByBooking(booking.id);
      expect(loans[0].actualReturnTime).toBeDefined();
    });

    it('should return error for non-existent booking', async () => {
      const result = await bookingService.cancelBooking('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.message).toContain('不存在');
    });
  });

  describe('getBookingWithConflicts', () => {
    it('should return booking with conflict information', () => {
      const booking = dataStore.getBooking('booking-001')!;
      const result = bookingService.getBookingWithConflicts(booking.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(booking.id);
      expect(result?.conflictCheck).toBeDefined();
      expect(result?.equipmentLoans).toBeDefined();
      expect(result?.equipmentLoans.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent booking', () => {
      const result = bookingService.getBookingWithConflicts('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getBookings', () => {
    it('should return all bookings when no filters', () => {
      const result = bookingService.getBookings();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by date range', () => {
      const startDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
      const endDate = dayjs().add(2, 'day').format('YYYY-MM-DD');

      const result = bookingService.getBookings({ startDate, endDate });
      expect(result.length).toBeGreaterThan(0);

      for (const booking of result) {
        expect(booking.startTime >= new Date(startDate)).toBe(true);
        expect(booking.endTime <= new Date(endDate + 'T23:59:59')).toBe(true);
      }
    });

    it('should include conflicts when requested', () => {
      const result = bookingService.getBookings({ includeConflicts: true }) as any[];

      expect(result[0].conflictCheck).toBeDefined();
      expect(result[0].equipmentLoans).toBeDefined();
    });
  });

  describe('checkBookingConflicts', () => {
    it('should check conflicts without creating booking', () => {
      const existingBooking = dataStore.getBooking('booking-001')!;
      const request: CreateBookingRequest = {
        customerName: '预检用户',
        customerPhone: '14200000000',
        startTime: dayjs(existingBooking.startTime).toISOString(),
        endTime: dayjs(existingBooking.endTime).toISOString(),
        roomId: existingBooking.roomId,
        purpose: '预检测试',
        numberOfPeople: 1,
        createdBy: 'test-admin',
      };

      const result = bookingService.checkBookingConflicts(request);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts[0].type).toBe('ROOM_OVERLAP');
    });
  });

  describe('getDailyStats', () => {
    it('should return daily statistics', () => {
      const date = dayjs().add(1, 'day').format('YYYY-MM-DD');
      const stats = bookingService.getDailyStats(date);

      expect(stats.date).toBe(date);
      expect(stats.totalBookings).toBeGreaterThan(0);
      expect(stats.confirmedBookings).toBeGreaterThan(0);
      expect(stats.roomUtilization).toBeDefined();
      expect(stats.teacherUtilization).toBeDefined();
    });
  });

  describe('getMonthlyReport', () => {
    it('should return comprehensive monthly report', async () => {
      const now = dayjs();
      const bookingStart = now.add(1, 'hour');
      const bookingEnd = now.add(3, 'hour');
      
      const request: CreateBookingRequest = {
        customerName: '月报测试用户',
        customerPhone: '14200000000',
        startTime: bookingStart.toISOString(),
        endTime: bookingEnd.toISOString(),
        roomId: 'room-003',
        teacherId: 'teacher-003',
        purpose: '月报测试',
        numberOfPeople: 2,
        createdBy: 'test-admin',
      };
      
      const createResult = await bookingService.createBooking(request);
      expect(createResult.success).toBe(true);
      
      const report = bookingService.getMonthlyReport(now.year(), now.month() + 1);

      expect(report.month).toBe(now.format('YYYY-MM'));
      expect(report.totalBookings).toBeGreaterThan(0);
      expect(report.confirmedBookings).toBeGreaterThan(0);
      expect(report.totalRevenue).toBeGreaterThan(0);
      expect(report.topRooms.length).toBeGreaterThan(0);
      expect(report.topTeachers.length).toBeGreaterThan(0);
      expect(report.conflictSummary).toBeDefined();
      expect(report.equipmentLoanStats).toBeDefined();
      expect(report.dailyBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe('transitionBookingStatus', () => {
    it('should transition booking status', async () => {
      const request: CreateBookingRequest = {
        customerName: '状态测试用户',
        customerPhone: '14300000000',
        startTime: dayjs().add(10, 'day').hour(10).minute(0).toISOString(),
        endTime: dayjs().add(10, 'day').hour(12).minute(0).toISOString(),
        roomId: 'room-001',
        purpose: '状态测试',
        numberOfPeople: 1,
        createdBy: 'test-admin',
      };

      const createResult = await bookingService.createBooking(request);
      expect(createResult.booking?.status).toBe('CONFIRMED');

      const cancelResult = await bookingService.transitionBookingStatus(
        createResult.booking!.id,
        'CANCEL'
      );

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.newStatus).toBe('CANCELLED');
    });

    it('should return error for invalid transition', async () => {
      const booking = dataStore.getBooking('booking-001')!;
      const result = await bookingService.transitionBookingStatus(
        booking.id,
        'COMPLETE' as any
      );

      expect(result.success).toBe(false);
    });
  });

  describe('waitlist auto-promotion', () => {
    it('should promote waitlist booking when slot becomes available', async () => {
      const existingBooking = dataStore.getBooking('booking-001')!;

      const waitlistRequest: CreateBookingRequest = {
        customerName: '候补用户',
        customerPhone: '14400000000',
        startTime: dayjs(existingBooking.startTime).toISOString(),
        endTime: dayjs(existingBooking.endTime).toISOString(),
        roomId: existingBooking.roomId,
        purpose: '候补转正测试',
        numberOfPeople: 1,
        createdBy: 'test-admin',
      };

      const waitlistResult = await bookingService.createBooking(waitlistRequest);
      expect(waitlistResult.booking?.status).toBe('WAITLIST');

      await bookingService.cancelBooking(existingBooking.id);

      const updatedWaitlistBooking = dataStore.getBooking(waitlistResult.booking!.id);
      expect(updatedWaitlistBooking?.status).toBe('CONFIRMED');
    });
  });
});
