import { Request, Response } from 'express';
import { dataStore } from '../store/DataStore';
import { conflictDetectionService } from '../services/ConflictDetectionService';

export class ResourceController {
  public getRooms(req: Request, res: Response): void {
    try {
      const { activeOnly } = req.query;
      let rooms = dataStore.getAllRooms();

      if (activeOnly === 'true') {
        rooms = rooms.filter((r) => r.isActive);
      }

      res.json({
        success: true,
        data: rooms.map((room) => ({
          ...room,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
          purchaseDate: room.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取排练室列表失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getRoomAvailability(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { date } = req.query;

      const room = dataStore.getRoom(id);
      if (!room) {
        res.status(404).json({
          success: false,
          message: '排练室不存在',
        });
        return;
      }

      const targetDate = date ? new Date(date as string) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = dataStore
        .getBookingsByRoom(id)
        .filter(
          (b) =>
            b.status !== 'CANCELLED' &&
            b.startTime < endOfDay &&
            b.endTime > startOfDay
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      const occupiedSlots = bookings.map((b) => ({
        bookingId: b.id,
        customerName: b.customerName,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        purpose: b.purpose,
        status: b.status,
      }));

      const availableSlots: { startTime: string; endTime: string }[] = [];
      let currentTime = new Date(startOfDay);
      currentTime.setHours(8, 0, 0, 0);

      for (const booking of bookings) {
        if (currentTime < booking.startTime) {
          availableSlots.push({
            startTime: currentTime.toISOString(),
            endTime: booking.startTime.toISOString(),
          });
        }
        currentTime = new Date(
          Math.max(currentTime.getTime(), booking.endTime.getTime())
        );
      }

      const endOfBusiness = new Date(startOfDay);
      endOfBusiness.setHours(23, 0, 0, 0);
      if (currentTime < endOfBusiness) {
        availableSlots.push({
          startTime: currentTime.toISOString(),
          endTime: endOfBusiness.toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          room: {
            ...room,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
          },
          date: targetDate.toISOString().split('T')[0],
          occupiedSlots,
          availableSlots,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取排练室可用时间失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getTeachers(req: Request, res: Response): void {
    try {
      const { activeOnly } = req.query;
      let teachers = dataStore.getAllTeachers();

      if (activeOnly === 'true') {
        teachers = teachers.filter((t) => t.isActive);
      }

      res.json({
        success: true,
        data: teachers.map((teacher) => ({
          ...teacher,
          createdAt: teacher.createdAt.toISOString(),
          updatedAt: teacher.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取老师列表失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getTeacherSchedule(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const teacher = dataStore.getTeacher(id);
      if (!teacher) {
        res.status(404).json({
          success: false,
          message: '老师不存在',
        });
        return;
      }

      const start = startDate
        ? new Date(startDate as string)
        : new Date();
      const end = endDate
        ? new Date(endDate as string)
        : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

      const bookings = dataStore
        .getBookingsByTeacher(id)
        .filter(
          (b) =>
            b.status !== 'CANCELLED' &&
            b.startTime < end &&
            b.endTime > start
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      const leaves = dataStore.getTeacherLeavesByTeacher(id).filter(
        (l) => l.startDate <= end && l.endDate >= start
      );

      const schedule = [
        ...bookings.map((b) => ({
          type: 'BOOKING' as const,
          id: b.id,
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          title: `${b.customerName} - ${b.purpose}`,
          status: b.status,
          roomId: b.roomId,
        })),
        ...leaves.map((l) => ({
          type: 'LEAVE' as const,
          id: l.id,
          startTime: l.startDate.toISOString(),
          endTime: l.endDate.toISOString(),
          title: `请假: ${l.reason}`,
          isHalfDay: l.isHalfDay,
          halfDayPeriod: l.halfDayPeriod,
        })),
      ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      res.json({
        success: true,
        data: {
          teacher: {
            ...teacher,
            createdAt: teacher.createdAt.toISOString(),
            updatedAt: teacher.updatedAt.toISOString(),
          },
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          schedule,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取老师日程失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public createTeacherLeave(req: Request, res: Response): void {
    try {
      const { teacherId, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;

      const teacher = dataStore.getTeacher(teacherId);
      if (!teacher) {
        res.status(404).json({
          success: false,
          message: '老师不存在',
        });
        return;
      }

      const leave = dataStore.createTeacherLeave({
        teacherId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isHalfDay: isHalfDay || false,
        halfDayPeriod,
      });

      const affectedBookings = dataStore
        .getBookingsByTeacher(teacherId)
        .filter(
          (b) =>
            b.status !== 'CANCELLED' &&
            b.startTime < leave.endDate &&
            b.endTime > leave.startDate
        );

      res.json({
        success: true,
        data: {
          ...leave,
          startDate: leave.startDate.toISOString(),
          endDate: leave.endDate.toISOString(),
          createdAt: leave.createdAt.toISOString(),
          updatedAt: leave.updatedAt.toISOString(),
        },
        warnings:
          affectedBookings.length > 0
            ? [
                {
                  message: `有 ${affectedBookings.length} 个预约与该请假时间冲突`,
                  affectedBookings: affectedBookings.map((b) => ({
                    id: b.id,
                    customerName: b.customerName,
                    startTime: b.startTime.toISOString(),
                    endTime: b.endTime.toISOString(),
                    purpose: b.purpose,
                  })),
                },
              ]
            : undefined,
        message: '请假记录已创建',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建请假记录失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getEquipment(req: Request, res: Response): void {
    try {
      const { category, status, activeOnly } = req.query;
      let equipmentList = dataStore.getAllEquipment();

      if (category) {
        equipmentList = equipmentList.filter((e) => e.category === category);
      }

      if (status) {
        equipmentList = equipmentList.filter((e) => e.status === status);
      }

      if (activeOnly === 'true') {
        equipmentList = equipmentList.filter((e) => e.isActive);
      }

      res.json({
        success: true,
        data: equipmentList.map((equip) => ({
          ...equip,
          purchaseDate: equip.purchaseDate.toISOString(),
          createdAt: equip.createdAt.toISOString(),
          updatedAt: equip.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取设备列表失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getEquipmentLoans(req: Request, res: Response): void {
    try {
      const { equipmentId, bookingId, activeOnly, overdueOnly } = req.query;
      let loans = dataStore.getAllEquipmentLoans();

      if (equipmentId) {
        loans = loans.filter((l) => l.equipmentId === equipmentId);
      }

      if (bookingId) {
        loans = loans.filter((l) => l.bookingId === bookingId);
      }

      if (activeOnly === 'true') {
        loans = loans.filter((l) => !l.actualReturnTime);
      }

      if (overdueOnly === 'true') {
        loans = dataStore.getOverdueEquipmentLoans();
      }

      res.json({
        success: true,
        data: loans.map((loan) => ({
          ...loan,
          checkoutTime: loan.checkoutTime.toISOString(),
          expectedReturnTime: loan.expectedReturnTime.toISOString(),
          actualReturnTime: loan.actualReturnTime?.toISOString(),
          createdAt: loan.createdAt.toISOString(),
          updatedAt: loan.updatedAt.toISOString(),
          equipment: dataStore.getEquipment(loan.equipmentId)
            ? {
                id: dataStore.getEquipment(loan.equipmentId)!.id,
                name: dataStore.getEquipment(loan.equipmentId)!.name,
                category: dataStore.getEquipment(loan.equipmentId)!.category,
              }
            : null,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取设备借出记录失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public returnEquipment(req: Request, res: Response): void {
    try {
      const { loanId } = req.params;
      const { condition, notes } = req.body;

      const loan = dataStore.getEquipmentLoan(loanId);
      if (!loan) {
        res.status(404).json({
          success: false,
          message: '借出记录不存在',
        });
        return;
      }

      if (loan.actualReturnTime) {
        res.status(400).json({
          success: false,
          message: '设备已归还',
        });
        return;
      }

      const updatedLoan = dataStore.updateEquipmentLoan(loanId, {
        actualReturnTime: new Date(),
        condition: condition || loan.condition,
        notes,
      });

      const equipment = dataStore.getEquipment(loan.equipmentId);
      if (equipment && equipment.status === 'IN_USE') {
        dataStore.updateEquipment(loan.equipmentId, { status: 'AVAILABLE' });
      }

      res.json({
        success: true,
        data: updatedLoan
          ? {
              ...updatedLoan,
              checkoutTime: updatedLoan.checkoutTime.toISOString(),
              expectedReturnTime: updatedLoan.expectedReturnTime.toISOString(),
              actualReturnTime: updatedLoan.actualReturnTime?.toISOString(),
              createdAt: updatedLoan.createdAt.toISOString(),
              updatedAt: updatedLoan.updatedAt.toISOString(),
            }
          : null,
        message: '设备已归还',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '归还设备失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getConflictTypes(req: Request, res: Response): void {
    try {
      const types = [
        'ROOM_OVERLAP',
        'TEACHER_OVERLAP',
        'TEACHER_ON_LEAVE',
        'EQUIPMENT_OVERLAP',
        'EQUIPMENT_NOT_RETURNED',
        'CROSS_DAY_OVERLAP',
        'TIME_SLOT_INVALID',
      ] as const;

      const typeDescriptions = types.map((type) => ({
        type,
        ...conflictDetectionService.getConflictTypeDescription(type),
      }));

      res.json({
        success: true,
        data: typeDescriptions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取冲突类型失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getWaitlist(req: Request, res: Response): void {
    try {
      const { roomId } = req.query;
      let waitlist;

      if (roomId) {
        waitlist = dataStore.getWaitlistByRoom(roomId as string);
      } else {
        waitlist = dataStore.getAllWaitlistEntries();
      }

      const result = waitlist.map((entry) => ({
        ...entry,
        preferredStartTime: entry.preferredStartTime.toISOString(),
        preferredEndTime: entry.preferredEndTime.toISOString(),
        expiresAt: entry.expiresAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        booking: dataStore.getBooking(entry.bookingId)
          ? {
              id: dataStore.getBooking(entry.bookingId)!.id,
              customerName: dataStore.getBooking(entry.bookingId)!.customerName,
              purpose: dataStore.getBooking(entry.bookingId)!.purpose,
              status: dataStore.getBooking(entry.bookingId)!.status,
            }
          : null,
      }));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取候补队列失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

export const resourceController = new ResourceController();
