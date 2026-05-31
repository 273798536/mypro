import { Request, Response } from 'express';
import { bookingService } from '../services/BookingService';
import { CreateBookingRequest, UpdateBookingRequest } from '../types';

export class BookingController {
  public async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateBookingRequest = req.body;
      const result = await bookingService.createBooking(request);

      res.status(result.success ? 201 : 400).json({
        success: result.success,
        data: result.booking ? {
          ...result.booking,
          startTime: result.booking.startTime.toISOString(),
          endTime: result.booking.endTime.toISOString(),
          createdAt: result.booking.createdAt.toISOString(),
          updatedAt: result.booking.updatedAt.toISOString(),
        } : null,
        conflictCheck: {
          ...result.conflictCheck,
          checkedAt: result.conflictCheck.checkedAt.toISOString(),
        },
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建预约失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public async updateBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request: UpdateBookingRequest = req.body;
      const result = await bookingService.updateBooking(id, request);

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.booking ? {
          ...result.booking,
          startTime: result.booking.startTime.toISOString(),
          endTime: result.booking.endTime.toISOString(),
          createdAt: result.booking.createdAt.toISOString(),
          updatedAt: result.booking.updatedAt.toISOString(),
        } : null,
        conflictCheck: result.conflictCheck ? {
          ...result.conflictCheck,
          checkedAt: result.conflictCheck.checkedAt.toISOString(),
        } : undefined,
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新预约失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await bookingService.cancelBooking(id, reason);

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result.booking ? {
          ...result.booking,
          startTime: result.booking.startTime.toISOString(),
          endTime: result.booking.endTime.toISOString(),
          createdAt: result.booking.createdAt.toISOString(),
          updatedAt: result.booking.updatedAt.toISOString(),
        } : null,
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '取消预约失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getBooking(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const booking = bookingService.getBookingWithConflicts(id);

      if (!booking) {
        res.status(404).json({
          success: false,
          message: '预约不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...booking,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
          conflictCheck: {
            ...booking.conflictCheck,
            checkedAt: booking.conflictCheck.checkedAt.toISOString(),
          },
          equipmentLoans: booking.equipmentLoans.map((loan) => ({
            ...loan,
            checkoutTime: loan.checkoutTime.toISOString(),
            expectedReturnTime: loan.expectedReturnTime.toISOString(),
            actualReturnTime: loan.actualReturnTime?.toISOString(),
            createdAt: loan.createdAt.toISOString(),
            updatedAt: loan.updatedAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取预约详情失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getBookings(req: Request, res: Response): void {
    try {
      const { startDate, endDate, roomId, teacherId, status, includeConflicts } = req.query;
      const bookings = bookingService.getBookings({
        startDate: startDate as string,
        endDate: endDate as string,
        roomId: roomId as string,
        teacherId: teacherId as string,
        status: status as string,
        includeConflicts: includeConflicts === 'true',
      });

      const serializedBookings = bookings.map((booking) => {
        const base = {
          ...booking,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
        };

        if (includeConflicts === 'true') {
          const bookingWithConflicts = booking as typeof booking & {
            conflictCheck: any;
            equipmentLoans: any[];
          };
          return {
            ...base,
            conflictCheck: bookingWithConflicts.conflictCheck ? {
              ...bookingWithConflicts.conflictCheck,
              checkedAt: bookingWithConflicts.conflictCheck.checkedAt.toISOString(),
            } : undefined,
            equipmentLoans: bookingWithConflicts.equipmentLoans?.map((loan: any) => ({
              ...loan,
              checkoutTime: loan.checkoutTime.toISOString(),
              expectedReturnTime: loan.expectedReturnTime.toISOString(),
              actualReturnTime: loan.actualReturnTime?.toISOString(),
              createdAt: loan.createdAt.toISOString(),
              updatedAt: loan.updatedAt.toISOString(),
            })),
          };
        }

        return base;
      });

      res.json({
        success: true,
        data: serializedBookings,
        total: serializedBookings.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取预约列表失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public checkConflicts(req: Request, res: Response): void {
    try {
      const request: CreateBookingRequest = req.body;
      const { excludeBookingId } = req.query;
      const result = bookingService.checkBookingConflicts(
        request,
        excludeBookingId as string
      );

      res.json({
        success: true,
        data: {
          ...result,
          checkedAt: result.checkedAt.toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '冲突检测失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public async transitionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id, action } = req.params;
      const result = await bookingService.transitionBookingStatus(
        id,
        action as any
      );

      res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: {
          newStatus: result.newStatus,
        },
        message: result.message,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '状态变更失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getStatusFlow(req: Request, res: Response): void {
    try {
      const flow = bookingService.getStatusFlow();
      res.json({
        success: true,
        data: flow,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取状态流转图失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getDailyStats(req: Request, res: Response): void {
    try {
      const { date } = req.params;
      const stats = bookingService.getDailyStats(date);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取每日统计失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public getMonthlyReport(req: Request, res: Response): void {
    try {
      const { year, month } = req.params;
      const report = bookingService.getMonthlyReport(
        parseInt(year),
        parseInt(month)
      );
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取月度报告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

export const bookingController = new BookingController();
