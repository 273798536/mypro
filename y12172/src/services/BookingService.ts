import dayjs from 'dayjs';
import {
  Booking,
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingWithConflicts,
  ConflictCheckResult,
  DailyStats,
  MonthlyReport,
  ConflictType,
  UUID,
} from '../types';
import { dataStore } from '../store/DataStore';
import { conflictDetectionService } from './ConflictDetectionService';
import { bookingStateMachine, StateTransitionAction } from './BookingStateMachine';

export class BookingService {
  private static instance: BookingService;

  private constructor() {}

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  public async createBooking(
    request: CreateBookingRequest
  ): Promise<{
    success: boolean;
    booking?: Booking;
    conflictCheck: ConflictCheckResult;
    message: string;
  }> {
    const startTime = new Date(request.startTime);
    const endTime = new Date(request.endTime);

    const isCrossDay = this.isCrossDayBooking(startTime, endTime);

    const tempBooking: Booking = {
      id: 'temp-' + Date.now(),
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      startTime,
      endTime,
      isCrossDay,
      status: 'PENDING',
      roomId: request.roomId,
      teacherId: request.teacherId,
      equipmentIds: request.equipmentIds || [],
      purpose: request.purpose,
      numberOfPeople: request.numberOfPeople,
      remarks: request.remarks,
      sourceSystem: request.sourceSystem || 'MANUAL',
      createdBy: request.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conflictCheck = conflictDetectionService.checkAllConflicts(tempBooking);

    if (conflictCheck.hasConflicts) {
      const hasRoomConflict = conflictCheck.conflicts.some(
        (c) => c.type === 'ROOM_OVERLAP'
      );

      if (hasRoomConflict) {
        const { id, createdAt, updatedAt, ...bookingData } = tempBooking;
        const booking = dataStore.createBooking(bookingData);

        const waitlistPriority = this.getNextWaitlistPriority(request.roomId);
        dataStore.createWaitlistEntry({
          bookingId: booking.id,
          roomId: request.roomId,
          preferredStartTime: startTime,
          preferredEndTime: endTime,
          priority: waitlistPriority,
          expiresAt: dayjs(startTime).subtract(1, 'hour').toDate(),
        });

        await bookingStateMachine.transition(booking.id, 'START_WAITLIST');

        const updatedBooking = dataStore.getBooking(booking.id);

        return {
          success: true,
          booking: updatedBooking,
          conflictCheck,
          message: '时段冲突，已加入候补队列',
        };
      }

      return {
        success: false,
        conflictCheck,
        message: '存在冲突，无法创建预约',
      };
    }

    const booking = dataStore.createBooking({
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      startTime,
      endTime,
      isCrossDay,
      status: 'PENDING',
      roomId: request.roomId,
      teacherId: request.teacherId,
      equipmentIds: request.equipmentIds || [],
      purpose: request.purpose,
      numberOfPeople: request.numberOfPeople,
      remarks: request.remarks,
      sourceSystem: request.sourceSystem || 'MANUAL',
      createdBy: request.createdBy,
    });

    const transitionResult = await bookingStateMachine.transition(booking.id, 'CONFIRM');

    if (!transitionResult.success && transitionResult.conflictCheck) {
      return {
        success: false,
        booking,
        conflictCheck: transitionResult.conflictCheck,
        message: transitionResult.message,
      };
    }

    const updatedBooking = dataStore.getBooking(booking.id);

    return {
      success: true,
      booking: updatedBooking,
      conflictCheck,
      message: '预约创建成功',
    };
  }

  public async updateBooking(
    bookingId: UUID,
    request: UpdateBookingRequest
  ): Promise<{
    success: boolean;
    booking?: Booking;
    conflictCheck?: ConflictCheckResult;
    message: string;
  }> {
    const existingBooking = dataStore.getBooking(bookingId);
    if (!existingBooking) {
      return {
        success: false,
        message: '预约不存在',
      };
    }

    const startTime = request.startTime
      ? new Date(request.startTime)
      : existingBooking.startTime;
    const endTime = request.endTime
      ? new Date(request.endTime)
      : existingBooking.endTime;

    const isCrossDay = this.isCrossDayBooking(startTime, endTime);

    const updatedBookingData: Partial<Booking> = {
      startTime,
      endTime,
      isCrossDay,
      roomId: request.roomId || existingBooking.roomId,
      teacherId: request.teacherId !== undefined ? request.teacherId : existingBooking.teacherId,
      equipmentIds: request.equipmentIds || existingBooking.equipmentIds,
      purpose: request.purpose || existingBooking.purpose,
      numberOfPeople: request.numberOfPeople || existingBooking.numberOfPeople,
      remarks: request.remarks !== undefined ? request.remarks : existingBooking.remarks,
    };

    const tempBooking: Booking = {
      ...existingBooking,
      ...updatedBookingData,
    };

    const conflictCheck = conflictDetectionService.checkAllConflicts(tempBooking, bookingId);

    if (conflictCheck.hasConflicts) {
      return {
        success: false,
        conflictCheck,
        message: '修改后存在冲突，无法更新',
      };
    }

    dataStore.updateBooking(bookingId, updatedBookingData);

    if (request.status && request.status !== existingBooking.status) {
      const action = this.getTransitionAction(existingBooking.status, request.status);
      if (action) {
        const transitionResult = await bookingStateMachine.transition(bookingId, action);
        if (!transitionResult.success) {
          return {
            success: false,
            message: transitionResult.message,
            conflictCheck: transitionResult.conflictCheck,
          };
        }
      }
    }

    const finalBooking = dataStore.getBooking(bookingId);

    return {
      success: true,
      booking: finalBooking,
      conflictCheck,
      message: '预约更新成功',
    };
  }

  public async cancelBooking(
    bookingId: UUID,
    reason?: string
  ): Promise<{
    success: boolean;
    booking?: Booking;
    message: string;
  }> {
    const booking = dataStore.getBooking(bookingId);
    if (!booking) {
      return {
        success: false,
        message: '预约不存在',
      };
    }

    const transitionResult = await bookingStateMachine.transition(bookingId, 'CANCEL');

    if (!transitionResult.success) {
      return {
        success: false,
        message: transitionResult.message,
      };
    }

    if (reason) {
      dataStore.updateBooking(bookingId, {
        remarks: booking.remarks
          ? `${booking.remarks}\n取消原因：${reason}`
          : `取消原因：${reason}`,
      });
    }

    const updatedBooking = dataStore.getBooking(bookingId);

    return {
      success: true,
      booking: updatedBooking,
      message: '预约已取消，候补队列已处理',
    };
  }

  public getBookingWithConflicts(bookingId: UUID): BookingWithConflicts | null {
    const booking = dataStore.getBooking(bookingId);
    if (!booking) return null;

    const conflictCheck = conflictDetectionService.checkAllConflicts(booking, bookingId);
    const equipmentLoans = dataStore.getEquipmentLoansByBooking(bookingId);

    return {
      ...booking,
      conflictCheck,
      equipmentLoans,
    };
  }

  public getBookings(
    filters?: {
      startDate?: string;
      endDate?: string;
      roomId?: UUID;
      teacherId?: UUID;
      status?: string;
      includeConflicts?: boolean;
    }
  ): Booking[] | BookingWithConflicts[] {
    let bookings: Booking[];

    if (filters?.startDate && filters?.endDate) {
      bookings = dataStore.getBookingsByDateRange(
        new Date(filters.startDate),
        new Date(filters.endDate)
      );
    } else if (filters?.roomId) {
      bookings = dataStore.getBookingsByRoom(filters.roomId, false);
    } else if (filters?.teacherId) {
      bookings = dataStore.getBookingsByTeacher(filters.teacherId, false);
    } else {
      bookings = dataStore.getAllBookings();
    }

    if (filters?.status) {
      bookings = bookings.filter((b) => b.status === filters.status);
    }

    bookings = bookings.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    if (filters?.includeConflicts) {
      return bookings.map((booking) => {
        const conflictCheck = conflictDetectionService.checkAllConflicts(booking, booking.id);
        const equipmentLoans = dataStore.getEquipmentLoansByBooking(booking.id);
        return {
          ...booking,
          conflictCheck,
          equipmentLoans,
        };
      });
    }

    return bookings;
  }

  public checkBookingConflicts(
    request: CreateBookingRequest,
    excludeBookingId?: UUID
  ): ConflictCheckResult {
    const startTime = new Date(request.startTime);
    const endTime = new Date(request.endTime);
    const isCrossDay = this.isCrossDayBooking(startTime, endTime);

    const tempBooking: Booking = {
      id: excludeBookingId || 'temp-check',
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      startTime,
      endTime,
      isCrossDay,
      status: 'PENDING',
      roomId: request.roomId,
      teacherId: request.teacherId,
      equipmentIds: request.equipmentIds || [],
      purpose: request.purpose,
      numberOfPeople: request.numberOfPeople,
      remarks: request.remarks,
      sourceSystem: request.sourceSystem || 'MANUAL',
      createdBy: request.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return conflictDetectionService.checkAllConflicts(tempBooking, excludeBookingId);
  }

  public getDailyStats(date: string): DailyStats {
    const targetDate = dayjs(date);
    const startOfDay = targetDate.startOf('day').toDate();
    const endOfDay = targetDate.endOf('day').toDate();

    const bookings = dataStore.getBookingsByDateRange(startOfDay, endOfDay);
    const rooms = dataStore.getAllRooms();
    const teachers = dataStore.getAllTeachers();

    const roomUtilization: Record<UUID, number> = {};
    const teacherUtilization: Record<UUID, number> = {};

    for (const room of rooms) {
      const roomBookings = bookings.filter(
        (b) => b.roomId === room.id && b.status !== 'CANCELLED'
      );
      const totalHours = roomBookings.reduce((sum, b) => {
        const overlapStart = b.startTime > startOfDay ? b.startTime : startOfDay;
        const overlapEnd = b.endTime < endOfDay ? b.endTime : endOfDay;
        const hours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
        return sum + Math.max(0, hours);
      }, 0);
      roomUtilization[room.id] = Math.round((totalHours / 15) * 100);
    }

    for (const teacher of teachers) {
      const teacherBookings = bookings.filter(
        (b) => b.teacherId === teacher.id && b.status !== 'CANCELLED'
      );
      const totalHours = teacherBookings.reduce((sum, b) => {
        const overlapStart = b.startTime > startOfDay ? b.startTime : startOfDay;
        const overlapEnd = b.endTime < endOfDay ? b.endTime : endOfDay;
        const hours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
        return sum + Math.max(0, hours);
      }, 0);
      teacherUtilization[teacher.id] = Math.round((totalHours / 8) * 100);
    }

    let conflictCount = 0;
    for (const booking of bookings) {
      const check = conflictDetectionService.checkAllConflicts(booking, booking.id);
      if (check.conflicts.length > 0) {
        conflictCount++;
      }
    }

    const waitlistCount = dataStore
      .getAllWaitlistEntries()
      .filter(
        (e) =>
          dayjs(e.preferredStartTime).isSame(targetDate, 'day') &&
          e.expiresAt > new Date()
      ).length;

    return {
      date: targetDate.format('YYYY-MM-DD'),
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === 'CONFIRMED').length,
      cancelledBookings: bookings.filter((b) => b.status === 'CANCELLED').length,
      waitlistCount,
      conflictCount,
      roomUtilization,
      teacherUtilization,
    };
  }

  public getMonthlyReport(year: number, month: number): MonthlyReport {
    const startOfMonth = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endOfMonth = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    const bookings = dataStore.getBookingsByDateRange(startOfMonth, endOfMonth);
    const rooms = dataStore.getAllRooms();
    const teachers = dataStore.getAllTeachers();
    const equipment = dataStore.getAllEquipment();

    const roomBookingCounts: Record<UUID, number> = {};
    const teacherBookingCounts: Record<UUID, number> = {};
    const conflictTypeCounts: Record<ConflictType, number> = {
      ROOM_OVERLAP: 0,
      TEACHER_OVERLAP: 0,
      TEACHER_ON_LEAVE: 0,
      EQUIPMENT_OVERLAP: 0,
      EQUIPMENT_NOT_RETURNED: 0,
      CROSS_DAY_OVERLAP: 0,
      TIME_SLOT_INVALID: 0,
    };

    let totalRevenue = 0;
    let noShowCount = 0;

    for (const booking of bookings) {
      if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
        const room = dataStore.getRoom(booking.roomId);
        if (room) {
          const hours =
            (booking.endTime.getTime() - booking.startTime.getTime()) /
            (1000 * 60 * 60);
          totalRevenue += hours * room.hourlyRate;

          if (booking.teacherId) {
            const teacher = dataStore.getTeacher(booking.teacherId);
            if (teacher) {
              totalRevenue += hours * teacher.hourlyRate;
            }
          }
        }
      }

      if (booking.status === 'CONFIRMED' && booking.endTime < new Date()) {
        noShowCount++;
      }

      roomBookingCounts[booking.roomId] =
        (roomBookingCounts[booking.roomId] || 0) + 1;

      if (booking.teacherId) {
        teacherBookingCounts[booking.teacherId] =
          (teacherBookingCounts[booking.teacherId] || 0) + 1;
      }

      const check = conflictDetectionService.checkAllConflicts(booking, booking.id);
      for (const conflict of check.conflicts) {
        conflictTypeCounts[conflict.type]++;
      }
      for (const warning of check.warnings) {
        conflictTypeCounts[warning.type]++;
      }
    }

    const topRooms = Object.entries(roomBookingCounts)
      .map(([roomId, count]) => {
        const room = rooms.find((r) => r.id === roomId);
        return {
          roomId,
          roomName: room?.name || '未知',
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topTeachers = Object.entries(teacherBookingCounts)
      .map(([teacherId, count]) => {
        const teacher = teachers.find((t) => t.id === teacherId);
        return {
          teacherId,
          teacherName: teacher?.name || '未知',
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const conflictSummary = (Object.entries(conflictTypeCounts) as [ConflictType, number][])
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const equipmentLoanStats = equipment.map((e) => {
      const loans = dataStore.getEquipmentLoansByEquipment(e.id);
      const overdueLoans = loans.filter(
        (l) => !l.actualReturnTime && l.expectedReturnTime < endOfMonth
      );
      return {
        equipmentId: e.id,
        name: e.name,
        loanCount: loans.length,
        overdueCount: overdueLoans.length,
      };
    });

    const dailyBreakdown: DailyStats[] = [];
    const daysInMonth = dayjs(endOfMonth).date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyBreakdown.push(this.getDailyStats(dateStr));
    }

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length,
      cancelledBookings: bookings.filter((b) => b.status === 'CANCELLED').length,
      noShowCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      topRooms,
      topTeachers,
      conflictSummary,
      equipmentLoanStats,
      dailyBreakdown,
    };
  }

  public async transitionBookingStatus(
    bookingId: UUID,
    action: StateTransitionAction
  ) {
    return bookingStateMachine.transition(bookingId, action);
  }

  public getStatusFlow() {
    return bookingStateMachine.getStatusFlow();
  }

  private isCrossDayBooking(startTime: Date, endTime: Date): boolean {
    return (
      startTime.getDate() !== endTime.getDate() ||
      endTime.getHours() < startTime.getHours()
    );
  }

  private getNextWaitlistPriority(roomId: UUID): number {
    const existingEntries = dataStore.getWaitlistByRoom(roomId);
    return existingEntries.length + 1;
  }

  private getTransitionAction(
    from: string,
    to: string
  ): StateTransitionAction | null {
    const actionMap: Record<string, StateTransitionAction> = {
      'PENDING->CONFIRMED': 'CONFIRM',
      'PENDING->WAITLIST': 'START_WAITLIST',
      'WAITLIST->CONFIRMED': 'PROMOTE_FROM_WAITLIST',
      'CONFIRMED->IN_PROGRESS': 'CHECK_IN',
      'IN_PROGRESS->COMPLETED': 'COMPLETE',
      'CONFIRMED->COMPLETED': 'COMPLETE',
      'PENDING->CANCELLED': 'CANCEL',
      'CONFIRMED->CANCELLED': 'CANCEL',
      'WAITLIST->CANCELLED': 'CANCEL',
      'IN_PROGRESS->CANCELLED': 'CANCEL',
      'PENDING->EXPIRED': 'EXPIRE',
      'WAITLIST->EXPIRED': 'EXPIRE',
    };
    return actionMap[`${from}->${to}`] || null;
  }
}

export const bookingService = BookingService.getInstance();
