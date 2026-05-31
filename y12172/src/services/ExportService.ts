import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import {
  Booking,
  BookingWithConflicts,
  MonthlyReport,
  ConflictDetail,
  ConflictCheckResult,
} from '../types';
import { dataStore } from '../store/DataStore';
import { conflictDetectionService } from './ConflictDetectionService';
import { bookingStateMachine } from './BookingStateMachine';

export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  public async exportBookingsToExcel(
    startDate: Date,
    endDate: Date,
    includeConflicts: boolean = true
  ): Promise<Buffer> {
    const bookings = dataStore.getBookingsByDateRange(startDate, endDate);
    const rooms = dataStore.getAllRooms();
    const teachers = dataStore.getAllTeachers();

    const bookingsWithDetails = bookings.map((booking) => {
      const room = rooms.find((r) => r.id === booking.roomId);
      const teacher = booking.teacherId
        ? teachers.find((t) => t.id === booking.teacherId)
        : null;
      const equipmentNames = booking.equipmentIds
        .map((id) => dataStore.getEquipment(id)?.name)
        .filter(Boolean)
        .join('、');

      const conflictCheck = includeConflicts
        ? conflictDetectionService.checkAllConflicts(booking, booking.id)
        : null;

      const statusInfo = bookingStateMachine.getStatusDescription(booking.status);

      return {
        ...booking,
        roomName: room?.name || '未知',
        teacherName: teacher?.name || '-',
        equipmentNames,
        statusLabel: statusInfo.label,
        conflictCheck,
      };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '排练室预约系统';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('预约总览');
    this.addSummarySheet(summarySheet, bookingsWithDetails, startDate, endDate);

    const bookingsSheet = workbook.addWorksheet('预约明细');
    this.addBookingsSheet(bookingsSheet, bookingsWithDetails, includeConflicts);

    if (includeConflicts) {
      const conflictsSheet = workbook.addWorksheet('冲突报告');
      this.addConflictsSheet(conflictsSheet, bookingsWithDetails);
    }

    const roomsSheet = workbook.addWorksheet('排练室使用统计');
    this.addRoomsStatsSheet(roomsSheet, bookings, rooms, startDate, endDate);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  public async exportMonthlyReportToExcel(
    year: number,
    month: number
  ): Promise<Buffer> {
    const report = this.getMonthlyReportData(year, month);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '排练室预约系统';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('月度概览');
    this.addMonthlySummarySheet(summarySheet, report);

    const dailySheet = workbook.addWorksheet('每日明细');
    this.addMonthlyDailySheet(dailySheet, report);

    const conflictsSheet = workbook.addWorksheet('冲突分析');
    this.addMonthlyConflictsSheet(conflictsSheet, report);

    const equipmentSheet = workbook.addWorksheet('设备使用统计');
    this.addMonthlyEquipmentSheet(equipmentSheet, report);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  public exportBookingDetailToPDF(
    booking: BookingWithConflicts
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(20).text('预约详情单', { align: 'center' });
      doc.moveDown();

      doc.fontSize(14).text(`预约编号: ${booking.id}`);
      doc.fontSize(12).text(`客户姓名: ${booking.customerName}`);
      doc.text(`联系电话: ${booking.customerPhone}`);
      if (booking.customerEmail) {
        doc.text(`邮箱: ${booking.customerEmail}`);
      }
      doc.moveDown();

      const room = dataStore.getRoom(booking.roomId);
      const teacher = booking.teacherId
        ? dataStore.getTeacher(booking.teacherId)
        : null;
      const statusInfo = bookingStateMachine.getStatusDescription(booking.status);

      doc.fillColor(statusInfo.color).fontSize(14).text(`状态: ${statusInfo.label}`);
      doc.fillColor('black').fontSize(12);
      doc.text(statusInfo.description);
      doc.moveDown();

      doc.fontSize(13).text('预约信息', { underline: true });
      doc.fontSize(12);
      doc.text(`排练室: ${room?.name || '未知'}`);
      doc.text(`预约时间: ${this.formatDateTime(booking.startTime)} - ${this.formatDateTime(booking.endTime)}`);
      if (booking.isCrossDay) {
        doc.fillColor('#f97316').text('⚠️ 跨日预约');
        doc.fillColor('black');
      }
      doc.text(`用途: ${booking.purpose}`);
      doc.text(`人数: ${booking.numberOfPeople} 人`);
      if (teacher) {
        doc.text(`指导老师: ${teacher.name} (${teacher.instrument})`);
      }
      if (booking.equipmentIds.length > 0) {
        const equipmentNames = booking.equipmentIds
          .map((id) => dataStore.getEquipment(id)?.name)
          .filter(Boolean)
          .join('、');
        doc.text(`借用设备: ${equipmentNames}`);
      }
      if (booking.remarks) {
        doc.text(`备注: ${booking.remarks}`);
      }
      if (booking.sourceSystem) {
        const systemNames: Record<string, string> = {
          ROOM_SYSTEM: '排练室预约系统',
          TEACHER_SYSTEM: '老师课表系统',
          MANUAL: '人工录入',
        };
        doc.text(`数据来源: ${systemNames[booking.sourceSystem] || booking.sourceSystem}`);
      }
      doc.moveDown();

      if (booking.conflictCheck.conflicts.length > 0 || booking.conflictCheck.warnings.length > 0) {
        doc.fontSize(13).text('冲突检测结果', { underline: true });
        doc.moveDown();

        if (booking.conflictCheck.conflicts.length > 0) {
          doc.fillColor('#ef4444').fontSize(12).text(`❌ 存在 ${booking.conflictCheck.conflicts.length} 个错误冲突:`);
          doc.fillColor('black');
          doc.moveDown(0.5);
          booking.conflictCheck.conflicts.forEach((conflict, index) => {
            doc.text(`${index + 1}. ${conflict.humanReadableMessage}`);
            if (conflict.leaveRecordId) {
              doc.text(`   关联请假记录: ${conflict.leaveRecordId}`);
            }
            if (conflict.loanRecordId) {
              doc.text(`   关联借出记录: ${conflict.loanRecordId}`);
            }
            doc.moveDown(0.3);
          });
          doc.moveDown();
        }

        if (booking.conflictCheck.warnings.length > 0) {
          doc.fillColor('#f59e0b').fontSize(12).text(`⚠️ 存在 ${booking.conflictCheck.warnings.length} 个警告:`);
          doc.fillColor('black');
          doc.moveDown(0.5);
          booking.conflictCheck.warnings.forEach((warning, index) => {
            doc.text(`${index + 1}. ${warning.humanReadableMessage}`);
            doc.moveDown(0.3);
          });
        }
        doc.moveDown();
      }

      if (booking.equipmentLoans.length > 0) {
        doc.fontSize(13).text('设备借出记录', { underline: true });
        doc.moveDown(0.5);
        booking.equipmentLoans.forEach((loan, index) => {
          const equipment = dataStore.getEquipment(loan.equipmentId);
          doc.fontSize(12).text(`${index + 1}. ${equipment?.name || '未知设备'}`);
          doc.text(`   借出人: ${loan.borrowerName} (${loan.borrowerPhone})`);
          doc.text(`   借出时间: ${this.formatDateTime(loan.checkoutTime)}`);
          doc.text(`   预计归还: ${this.formatDateTime(loan.expectedReturnTime)}`);
          if (loan.actualReturnTime) {
            doc.text(`   实际归还: ${this.formatDateTime(loan.actualReturnTime)}`);
          } else if (loan.expectedReturnTime < new Date()) {
            doc.fillColor('#ef4444').text('   ⚠️ 已逾期未归还');
            doc.fillColor('black');
          }
          doc.moveDown(0.3);
        });
        doc.moveDown();
      }

      doc.fontSize(10).text(`创建时间: ${this.formatDateTime(booking.createdAt)}`);
      doc.text(`最后更新: ${this.formatDateTime(booking.updatedAt)}`);
      doc.text(`创建人: ${booking.createdBy}`);

      doc.end();
    });
  }

  private addSummarySheet(
    sheet: ExcelJS.Worksheet,
    bookings: any[],
    startDate: Date,
    endDate: Date
  ): void {
    sheet.columns = [
      { header: '统计项', key: 'item', width: 30 },
      { header: '数值', key: 'value', width: 20 },
      { header: '说明', key: 'note', width: 40 },
    ];

    sheet.addRow({
      item: '报告时间范围',
      value: `${this.formatDate(startDate)} 至 ${this.formatDate(endDate)}`,
      note: '',
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    ).length;
    const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length;
    const waitlistBookings = bookings.filter((b) => b.status === 'WAITLIST').length;
    const crossDayBookings = bookings.filter((b) => b.isCrossDay).length;
    const bookingsWithConflicts = bookings.filter(
      (b) => b.conflictCheck && (b.conflictCheck.conflicts.length > 0 || b.conflictCheck.warnings.length > 0)
    ).length;

    sheet.addRow({ item: '预约总数', value: totalBookings, note: '' });
    sheet.addRow({
      item: '已确认/完成',
      value: confirmedBookings,
      note: `占比 ${totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0}%`,
    });
    sheet.addRow({
      item: '已取消',
      value: cancelledBookings,
      note: `占比 ${totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0}%`,
    });
    sheet.addRow({
      item: '候补中',
      value: waitlistBookings,
      note: '',
    });
    sheet.addRow({
      item: '跨日预约',
      value: crossDayBookings,
      note: '',
    });
    sheet.addRow({
      item: '存在冲突/警告',
      value: bookingsWithConflicts,
      note: '需要人工复核',
    });

    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.getRows(1, 1)!.forEach((row) => {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
    });
  }

  private addBookingsSheet(
    sheet: ExcelJS.Worksheet,
    bookings: any[],
    includeConflicts: boolean
  ): void {
    const columns: ExcelJS.Column[] = [
      { header: '预约编号', key: 'id', width: 36 },
      { header: '客户姓名', key: 'customerName', width: 15 },
      { header: '联系电话', key: 'customerPhone', width: 15 },
      { header: '开始时间', key: 'startTime', width: 20 },
      { header: '结束时间', key: 'endTime', width: 20 },
      { header: '状态', key: 'statusLabel', width: 10 },
      { header: '排练室', key: 'roomName', width: 20 },
      { header: '指导老师', key: 'teacherName', width: 12 },
      { header: '用途', key: 'purpose', width: 20 },
      { header: '人数', key: 'numberOfPeople', width: 8 },
      { header: '借用设备', key: 'equipmentNames', width: 30 },
      { header: '备注', key: 'remarks', width: 30 },
      { header: '创建人', key: 'createdBy', width: 12 },
    ];

    if (includeConflicts) {
      columns.push(
        { header: '冲突数量', key: 'conflictCount', width: 10 },
        { header: '警告数量', key: 'warningCount', width: 10 }
      );
    }

    sheet.columns = columns;

    bookings.forEach((booking) => {
      const rowData: any = {
        id: booking.id,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        startTime: this.formatDateTime(booking.startTime),
        endTime: this.formatDateTime(booking.endTime),
        statusLabel: booking.statusLabel,
        roomName: booking.roomName,
        teacherName: booking.teacherName,
        purpose: booking.purpose,
        numberOfPeople: booking.numberOfPeople,
        equipmentNames: booking.equipmentNames,
        remarks: booking.remarks || '',
        createdBy: booking.createdBy,
      };

      if (includeConflicts && booking.conflictCheck) {
        rowData.conflictCount = booking.conflictCheck.conflicts.length;
        rowData.warningCount = booking.conflictCheck.warnings.length;
      }

      const row = sheet.addRow(rowData);

      if (booking.status === 'CANCELLED') {
        row.font = { strike: true, color: { argb: 'FF9CA3AF' } };
      } else if (booking.conflictCheck?.conflicts?.length > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      } else if (booking.conflictCheck?.warnings?.length > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' },
        };
      }
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }

  private addConflictsSheet(
    sheet: ExcelJS.Worksheet,
    bookings: any[]
  ): void {
    sheet.columns = [
      { header: '预约编号', key: 'bookingId', width: 36 },
      { header: '客户', key: 'customerName', width: 12 },
      { header: '类型', key: 'type', width: 18 },
      { header: '级别', key: 'severity', width: 10 },
      { header: '资源', key: 'resourceName', width: 25 },
      { header: '冲突说明（技术）', key: 'message', width: 40 },
      { header: '冲突说明（人话）', key: 'humanReadableMessage', width: 60 },
      { header: '关联预约', key: 'overlappingBookingId', width: 36 },
      { header: '关联请假', key: 'leaveRecordId', width: 36 },
      { header: '关联借出', key: 'loanRecordId', width: 36 },
    ];

    const allConflicts: (ConflictDetail & { bookingId: string; customerName: string })[] = [];

    bookings.forEach((booking) => {
      if (booking.conflictCheck) {
        booking.conflictCheck.conflicts.forEach((c: ConflictDetail) => {
          allConflicts.push({ ...c, bookingId: booking.id, customerName: booking.customerName });
        });
        booking.conflictCheck.warnings.forEach((w: ConflictDetail) => {
          allConflicts.push({ ...w, bookingId: booking.id, customerName: booking.customerName });
        });
      }
    });

    allConflicts.forEach((conflict) => {
      const row = sheet.addRow({
        bookingId: conflict.bookingId,
        customerName: conflict.customerName,
        type: conflictDetectionService.getConflictTypeDescription(conflict.type).label,
        severity: conflict.severity === 'ERROR' ? '错误' : conflict.severity === 'WARNING' ? '警告' : '信息',
        resourceName: conflict.resourceName,
        message: conflict.message,
        humanReadableMessage: conflict.humanReadableMessage,
        overlappingBookingId: conflict.overlappingBookingId || '',
        leaveRecordId: conflict.leaveRecordId || '',
        loanRecordId: conflict.loanRecordId || '',
      });

      if (conflict.severity === 'ERROR') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      } else if (conflict.severity === 'WARNING') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3E0' },
        };
      }
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  }

  private addRoomsStatsSheet(
    sheet: ExcelJS.Worksheet,
    bookings: Booking[],
    rooms: any[],
    startDate: Date,
    endDate: Date
  ): void {
    sheet.columns = [
      { header: '排练室', key: 'name', width: 25 },
      { header: '容纳人数', key: 'capacity', width: 12 },
      { header: '预约次数', key: 'bookingCount', width: 12 },
      { header: '使用时长(小时)', key: 'totalHours', width: 15 },
      { header: '利用率', key: 'utilization', width: 12 },
      { header: '收入(元)', key: 'revenue', width: 15 },
    ];

    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    const maxHoursPerRoom = daysDiff * 15;

    rooms.forEach((room) => {
      const roomBookings = bookings.filter(
        (b) =>
          b.roomId === room.id &&
          (b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      );
      const totalHours = roomBookings.reduce((sum, b) => {
        const hours =
          (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      const utilization = Math.round((totalHours / maxHoursPerRoom) * 100);
      const revenue = Math.round(totalHours * room.hourlyRate * 100) / 100;

      sheet.addRow({
        name: room.name,
        capacity: room.capacity,
        bookingCount: roomBookings.length,
        totalHours: Math.round(totalHours * 10) / 10,
        utilization: `${utilization}%`,
        revenue,
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  }

  private addMonthlySummarySheet(
    sheet: ExcelJS.Worksheet,
    report: any
  ): void {
    sheet.columns = [
      { header: '指标', key: 'item', width: 30 },
      { header: '数值', key: 'value', width: 20 },
      { header: '说明', key: 'note', width: 40 },
    ];

    sheet.addRow({ item: '报告月份', value: report.month, note: '' });
    sheet.addRow({ item: '预约总数', value: report.totalBookings, note: '' });
    sheet.addRow({
      item: '已确认/完成',
      value: report.confirmedBookings,
      note: `占比 ${report.totalBookings > 0 ? Math.round((report.confirmedBookings / report.totalBookings) * 100) : 0}%`,
    });
    sheet.addRow({
      item: '已取消',
      value: report.cancelledBookings,
      note: `占比 ${report.totalBookings > 0 ? Math.round((report.cancelledBookings / report.totalBookings) * 100) : 0}%`,
    });
    sheet.addRow({
      item: '爽约未到',
      value: report.noShowCount,
      note: '已确认但未使用',
    });
    sheet.addRow({
      item: '预估总收入',
      value: `¥${report.totalRevenue.toLocaleString()}`,
      note: '包含排练室和老师费用',
    });

    sheet.addRow({ item: '', value: '', note: '' });
    sheet.addRow({ item: '热门排练室 TOP 3', value: '', note: '' });
    report.topRooms.slice(0, 3).forEach((r: any, i: number) => {
      sheet.addRow({
        item: `  第${i + 1}名: ${r.roomName}`,
        value: `${r.count} 次`,
        note: '',
      });
    });

    sheet.addRow({ item: '', value: '', note: '' });
    sheet.addRow({ item: '热门老师 TOP 3', value: '', note: '' });
    report.topTeachers.slice(0, 3).forEach((t: any, i: number) => {
      sheet.addRow({
        item: `  第${i + 1}名: ${t.teacherName}`,
        value: `${t.count} 次`,
        note: '',
      });
    });

    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.getRows(1, 1)!.forEach((row) => {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
    });
  }

  private addMonthlyDailySheet(
    sheet: ExcelJS.Worksheet,
    report: any
  ): void {
    sheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '预约总数', key: 'totalBookings', width: 12 },
      { header: '已确认', key: 'confirmedBookings', width: 12 },
      { header: '已取消', key: 'cancelledBookings', width: 12 },
      { header: '候补数', key: 'waitlistCount', width: 10 },
      { header: '冲突数', key: 'conflictCount', width: 10 },
    ];

    report.dailyBreakdown.forEach((day: any) => {
      const row = sheet.addRow({
        date: day.date,
        totalBookings: day.totalBookings,
        confirmedBookings: day.confirmedBookings,
        cancelledBookings: day.cancelledBookings,
        waitlistCount: day.waitlistCount,
        conflictCount: day.conflictCount,
      });

      if (day.conflictCount > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      }
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  }

  private addMonthlyConflictsSheet(
    sheet: ExcelJS.Worksheet,
    report: any
  ): void {
    sheet.columns = [
      { header: '冲突类型', key: 'type', width: 20 },
      { header: '发生次数', key: 'count', width: 12 },
      { header: '说明', key: 'description', width: 50 },
    ];

    report.conflictSummary.forEach((item: any) => {
      const typeInfo = conflictDetectionService.getConflictTypeDescription(item.type);
      sheet.addRow({
        type: typeInfo.label,
        count: item.count,
        description: typeInfo.description,
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  }

  private addMonthlyEquipmentSheet(
    sheet: ExcelJS.Worksheet,
    report: any
  ): void {
    sheet.columns = [
      { header: '设备名称', key: 'name', width: 30 },
      { header: '借出次数', key: 'loanCount', width: 12 },
      { header: '逾期次数', key: 'overdueCount', width: 12 },
      { header: '逾期率', key: 'overdueRate', width: 12 },
    ];

    report.equipmentLoanStats.forEach((item: any) => {
      const row = sheet.addRow({
        name: item.name,
        loanCount: item.loanCount,
        overdueCount: item.overdueCount,
        overdueRate:
          item.loanCount > 0
            ? `${Math.round((item.overdueCount / item.loanCount) * 100)}%`
            : '0%',
      });

      if (item.overdueCount > 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      }
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  }

  private getMonthlyReportData(year: number, month: number): any {
    const startOfMonth = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endOfMonth = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    const bookings = dataStore.getBookingsByDateRange(startOfMonth, endOfMonth);
    const rooms = dataStore.getAllRooms();
    const teachers = dataStore.getAllTeachers();
    const equipment = dataStore.getAllEquipment();

    const roomBookingCounts: Record<string, number> = {};
    const teacherBookingCounts: Record<string, number> = {};
    const conflictTypeCounts: Record<string, number> = {
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

    const conflictSummary = Object.entries(conflictTypeCounts)
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

    const dailyBreakdown: any[] = [];
    const daysInMonth = dayjs(endOfMonth).date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const targetDate = dayjs(dateStr);
      const startOfDay = targetDate.startOf('day').toDate();
      const endOfDay = targetDate.endOf('day').toDate();

      const dayBookings = bookings.filter(
        (b) => b.startTime < endOfDay && b.endTime > startOfDay
      );

      let conflictCount = 0;
      for (const booking of dayBookings) {
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

      dailyBreakdown.push({
        date: dateStr,
        totalBookings: dayBookings.length,
        confirmedBookings: dayBookings.filter(
          (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
        ).length,
        cancelledBookings: dayBookings.filter((b) => b.status === 'CANCELLED').length,
        waitlistCount,
        conflictCount,
      });
    }

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(
        (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
      ).length,
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

  private formatDate(date: Date): string {
    return dayjs(date).format('YYYY年MM月DD日');
  }

  private formatDateTime(date: Date): string {
    return dayjs(date).format('YYYY年MM月DD日 HH:mm');
  }
}

export const exportService = ExportService.getInstance();
