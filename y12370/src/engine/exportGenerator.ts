import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Booking,
  Room,
  Band,
  Course,
  Conflict,
  ExportOptions,
  DataChainNode,
} from '../types';
import { dayjsInstance, formatDateTime, formatDate, formatTime } from '../utils/dateUtils';
import { createExportChainNode, addChainNode } from './chainTracker';

interface ExportBookingRow {
  序号: number;
  日期: string;
  星期: string;
  开始时间: string;
  结束时间: string;
  乐队名称: string;
  课程名称: string;
  授课老师: string;
  排练室: string;
  设备需求: string;
  房间设备: string;
  状态: string;
  冲突类型: string;
  数据来源: string;
  数据版本: string;
  链路追踪: string;
}

export function generateExportData(
  bookings: Booking[],
  rooms: Room[],
  bands: Band[],
  courses: Course[],
  conflicts: Conflict[],
  options: ExportOptions,
): {
  rows: ExportBookingRow[];
  updatedBookings: Booking[];
} {
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const updatedBookings: Booking[] = [];

  const filteredBookings = options.dateRange
    ? bookings.filter(b => {
        const bookingDate = dayjsInstance(b.startTime);
        return bookingDate.isAfter(options.dateRange!.start) &&
               bookingDate.isBefore(options.dateRange!.end);
      })
    : bookings;

  const rows = filteredBookings
    .sort((a, b) => dayjsInstance(a.startTime).valueOf() - dayjsInstance(b.startTime).valueOf())
    .map((booking, index) => {
      const room = rooms.find(r => r.id === booking.roomId);
      const band = bands.find(b => b.id === booking.bandId);
      const course = courses.find(c => c.id === booking.courseId);
      const bookingConflicts = conflicts.filter(c => c.bookingId === booking.id && !c.resolved);

      const statusText = {
        normal: '正常',
        conflict: '有冲突',
        resolved: '已解决',
      }[booking.status];

      const conflictTypes = bookingConflicts.map(c => {
        const names: Record<string, string> = {
          equipment: '设备不匹配',
          teacher_leave: '老师请假',
          overday: '跨天预约',
          overlap: '时间重叠',
        };
        return names[c.type] || c.type;
      }).join('、');

      const importNode = booking.dataChain.find(n => n.step === 'import');
      const lastNode = booking.dataChain[booking.dataChain.length - 1];

      const chainSummary = options.includeChain
        ? booking.dataChain.map(n => {
            const stepNames: Record<string, string> = {
              import: '导入',
              conflict_detect: '冲突检测',
              adjust: '调整',
              export: '导出',
            };
            return `${stepNames[n.step]}(${n.version}@${dayjsInstance(n.timestamp).format('MM-DD HH:mm')})`;
          }).join(' → ')
        : '';

      const exportRow: ExportBookingRow = {
        序号: index + 1,
        日期: formatDate(booking.startTime),
        星期: dayNames[dayjsInstance(booking.startTime).isoWeekday() - 1],
        开始时间: formatTime(booking.startTime),
        结束时间: formatTime(booking.endTime),
        乐队名称: band?.name || '',
        课程名称: course?.name || '',
        授课老师: course?.teacher || '',
        排练室: room?.name || '',
        设备需求: (band?.equipmentNeeds?.length ? band.equipmentNeeds : band?.requiredEquipment || []).join('、'),
        房间设备: room?.equipment.join('、') || '',
        状态: statusText,
        冲突类型: conflictTypes || '无',
        数据来源: importNode?.source || '',
        数据版本: lastNode?.version || '',
        链路追踪: chainSummary,
      };

      const exportNode = createExportChainNode(
        { exportOptions: options, rowData: exportRow },
        options.format,
        'current_user',
      );

      const updatedBooking = addChainNode(booking, exportNode);
      updatedBookings.push(updatedBooking);

      return exportRow;
    });

  return { rows, updatedBookings };
}

export function exportToExcel(
  bookings: Booking[],
  rooms: Room[],
  bands: Band[],
  courses: Course[],
  conflicts: Conflict[],
  options: ExportOptions,
): { blob: Blob; updatedBookings: Booking[] } {
  const { rows, updatedBookings } = generateExportData(
    bookings,
    rooms,
    bands,
    courses,
    conflicts,
    options,
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '预约日程');

  if (options.includeChain) {
    const chainRows = updatedBookings.map(booking => ({
      预约ID: booking.id,
      乐队: bands.find(b => b.id === booking.bandId)?.name || '',
      步骤: '',
      时间: '',
      来源: '',
      版本: '',
      备注: '',
    })).flatMap((row, idx) => {
      const booking = updatedBookings[idx];
      return booking.dataChain.map((node, nodeIdx) => ({
        预约ID: nodeIdx === 0 ? row.预约ID : '',
        乐队: nodeIdx === 0 ? row.乐队 : '',
        步骤: (() => {
          const names: Record<string, string> = {
            import: '导入',
            conflict_detect: '冲突检测',
            adjust: '调整',
            export: '导出',
          };
          return names[node.step] || node.step;
        })(),
        时间: dayjsInstance(node.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        来源: node.source,
        版本: node.version,
        备注: node.remark || '',
      }));
    });

    const chainWorksheet = XLSX.utils.json_to_sheet(chainRows);
    XLSX.utils.book_append_sheet(workbook, chainWorksheet, '数据链路');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, updatedBookings };
}

export function exportToCsv(
  bookings: Booking[],
  rooms: Room[],
  bands: Band[],
  courses: Course[],
  conflicts: Conflict[],
  options: ExportOptions,
): { blob: Blob; updatedBookings: Booking[] } {
  const { rows, updatedBookings } = generateExportData(
    bookings,
    rooms,
    bands,
    courses,
    conflicts,
    options,
  );

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  return { blob, updatedBookings };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateExportFilename(format: 'xlsx' | 'csv' | 'pdf'): string {
  const now = dayjsInstance().format('YYYYMMDD_HHmm');
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  return `排练室预约日程_${now}.${ext}`;
}

export function getChainSummary(booking: Booking): string {
  const steps = booking.dataChain.map((node: DataChainNode) => {
    const stepNames: Record<string, string> = {
      import: '导入',
      conflict_detect: '冲突检测',
      adjust: '调整',
      export: '导出',
    };
    return `${stepNames[node.step] || node.step}(${node.version})`;
  });
  return steps.join(' → ');
}

export function performExport(
  bookings: Booking[],
  rooms: Room[],
  bands: Band[],
  courses: Course[],
  conflicts: Conflict[],
  options: ExportOptions,
): { updatedBookings: Booking[] } {
  let result: { blob: Blob; updatedBookings: Booking[] };

  if (options.format === 'xlsx') {
    result = exportToExcel(bookings, rooms, bands, courses, conflicts, options);
  } else {
    result = exportToCsv(bookings, rooms, bands, courses, conflicts, options);
  }

  const filename = generateExportFilename(options.format);
  downloadBlob(result.blob, filename);

  return { updatedBookings: result.updatedBookings };
}
