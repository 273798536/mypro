import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { exportService } from '../services/ExportService';
import { bookingService } from '../services/BookingService';

export class ExportController {
  public async exportBookingsToExcel(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, includeConflicts } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : dayjs().startOf('month').toDate();
      const end = endDate
        ? new Date(endDate as string)
        : dayjs().endOf('month').toDate();

      const buffer = await exportService.exportBookingsToExcel(
        start,
        end,
        includeConflicts !== 'false'
      );

      const fileName = `预约明细_${dayjs(start).format('YYYYMMDD')}-${dayjs(end).format('YYYYMMDD')}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出Excel失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public async exportMonthlyReportToExcel(req: Request, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        res.status(400).json({
          success: false,
          message: '无效的年月参数',
        });
        return;
      }

      const buffer = await exportService.exportMonthlyReportToExcel(
        yearNum,
        monthNum
      );

      const fileName = `月度报告_${yearNum}年${monthNum}月.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出月度报告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  public async exportBookingDetailToPDF(req: Request, res: Response): Promise<void> {
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

      const buffer = await exportService.exportBookingDetailToPDF(booking);
      const fileName = `预约详情_${booking.customerName}_${dayjs(booking.startTime).format('YYYYMMDD')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出PDF失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

export const exportController = new ExportController();
