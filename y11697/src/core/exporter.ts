import { Schedule, ScheduleEntry, Doctor, Department } from '../types';
import { parseDate } from '../utils/date';
import { format } from 'date-fns';

function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function getShiftTimes(shiftType: string, date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  switch (shiftType) {
    case 'morning':
      start.setHours(8, 0, 0, 0);
      end.setHours(16, 0, 0, 0);
      break;
    case 'afternoon':
      start.setHours(14, 0, 0, 0);
      end.setHours(22, 0, 0, 0);
      break;
    case 'night':
      start.setHours(22, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
      break;
    default:
      start.setHours(9, 0, 0, 0);
      end.setHours(17, 0, 0, 0);
  }

  return { start, end };
}

function getShiftTypeName(shiftType: string): string {
  const names: Record<string, string> = {
    morning: '早班',
    afternoon: '午班',
    night: '夜班',
  };
  return names[shiftType] || shiftType;
}

export function exportToICal(
  schedule: Schedule,
  doctors: Doctor[],
  departments: Department[]
): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Clinic Scheduler//CN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push(`X-WR-CALNAME:${schedule.name}`);

  for (const entry of schedule.entries) {
    if (entry.shiftType === 'off') continue;

    const doctor = doctors.find(d => d.id === entry.doctorId);
    const dept = departments.find(d => d.id === entry.departmentId);
    const date = parseDate(entry.date);
    const { start, end } = getShiftTimes(entry.shiftType, date);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${entry.doctorId}-${entry.date}-${entry.shiftType}@clinic-scheduler`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(start)}`);
    lines.push(`DTEND:${formatICalDate(end)}`);
    lines.push(`SUMMARY:${doctor?.name || entry.doctorId} - ${getShiftTypeName(entry.shiftType)}`);
    lines.push(`DESCRIPTION:科室: ${dept?.name || entry.departmentId}\\n班次类型: ${getShiftTypeName(entry.shiftType)}`);
    lines.push(`LOCATION:${dept?.name || entry.departmentId}`);
    if (entry.isLocked) {
      lines.push('STATUS:CONFIRMED');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function exportDoctorICal(
  schedule: Schedule,
  doctorId: string,
  doctor: Doctor | undefined,
  departments: Department[]
): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Clinic Scheduler//CN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push(`X-WR-CALNAME:${doctor?.name || doctorId} - ${schedule.name}`);

  const doctorEntries = schedule.entries.filter(e => e.doctorId === doctorId);

  for (const entry of doctorEntries) {
    if (entry.shiftType === 'off') continue;

    const dept = departments.find(d => d.id === entry.departmentId);
    const date = parseDate(entry.date);
    const { start, end } = getShiftTimes(entry.shiftType, date);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${entry.doctorId}-${entry.date}-${entry.shiftType}@clinic-scheduler`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(start)}`);
    lines.push(`DTEND:${formatICalDate(end)}`);
    lines.push(`SUMMARY:${getShiftTypeName(entry.shiftType)} - ${dept?.name || entry.departmentId}`);
    lines.push(`DESCRIPTION:科室: ${dept?.name || entry.departmentId}\\n班次类型: ${getShiftTypeName(entry.shiftType)}\\n来源: ${entry.source}`);
    lines.push(`LOCATION:${dept?.name || entry.departmentId}`);
    if (entry.isLocked) {
      lines.push('STATUS:CONFIRMED');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function exportToCsv(
  schedule: Schedule,
  doctors: Doctor[],
  departments: Department[]
): string {
  const headers = ['日期', '医生', '科室', '班次', '是否锁定', '来源'];
  const rows: string[][] = [headers];

  for (const entry of schedule.entries) {
    if (entry.shiftType === 'off') continue;

    const doctor = doctors.find(d => d.id === entry.doctorId);
    const dept = departments.find(d => d.id === entry.departmentId);

    rows.push([
      entry.date,
      doctor?.name || entry.doctorId,
      dept?.name || entry.departmentId,
      getShiftTypeName(entry.shiftType),
      entry.isLocked ? '是' : '否',
      entry.source,
    ]);
  }

  return rows.map(row => row.join(',')).join('\n');
}
