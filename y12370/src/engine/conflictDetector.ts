import {
  Booking,
  Room,
  Band,
  Course,
  Conflict,
  ConflictType,
  TeacherLeave,
} from '../types';
import {
  dateRangesOverlap,
  isOverday,
  generateId,
  dayjsInstance,
} from '../utils/dateUtils';

function findBookingsByTeacherAndTimeRange(
  teacher: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  courses: Course[],
): string[] {
  return bookings
    .filter(b => {
      const course = courses.find(c => c.id === b.courseId);
      if (!course || course.teacher !== teacher) return false;
      return dateRangesOverlap(b.startTime, b.endTime, startTime, endTime);
    })
    .map(b => b.id);
}

export function detectEquipmentConflict(
  booking: Booking,
  room: Room | undefined,
  band: Band | undefined,
): Conflict | null {
  if (!room || !band) return null;

  const missing = band.requiredEquipment.filter(
    eq => !room.equipment.includes(eq),
  );

  if (missing.length > 0) {
    const now = dayjsInstance().toISOString();
    const affectedIds = [booking.id];
    return {
      id: generateId(),
      bookingId: booking.id,
      roomId: booking.roomId,
      courseId: booking.courseId,
      type: 'equipment',
      description: `缺少设备: ${missing.join('、')}`,
      affectedBookings: affectedIds,
      affectedBookingIds: affectedIds,
      resolved: false,
      detectedAt: now,
      createdAt: now,
      bookingStartTime: booking.startTime,
      bookingEndTime: booking.endTime,
      impactAnalysis: `乐队${band.name}无法使用排练时缺少必要设备，可能影响排练质量或需要更换排练室`,
      suggestions: [
        '更换到配备有这些设备的排练室',
        '临时借用设备',
        '调整排练时间',
      ],
    };
  }
  return null;
}

export function detectTeacherLeaveConflict(
  booking: Booking,
  course: Course | undefined,
  leaves: TeacherLeave[],
  allBookings: Booking[],
  allCourses: Course[],
): Conflict | null {
  if (!course) return null;

  const teacher = course.teacher;
  const overlappingLeave = leaves.find(leave => {
    const leaveStart = dayjsInstance(leave.startDate).hour(0).minute(0);
    const leaveEnd = dayjsInstance(leave.endDate).hour(23).minute(59);
    return dateRangesOverlap(
      booking.startTime,
      booking.endTime,
      leaveStart.toISOString(),
      leaveEnd.toISOString(),
    );
  });

  if (overlappingLeave) {
    const affected = findBookingsByTeacherAndTimeRange(
      teacher,
      overlappingLeave.startDate,
      overlappingLeave.endDate,
      allBookings,
      allCourses,
    );

    const affectedIds = affected.length > 0 ? affected : [booking.id];
    const now = dayjsInstance().toISOString();

    return {
      id: generateId(),
      bookingId: booking.id,
      roomId: booking.roomId,
      courseId: booking.courseId,
      type: 'teacher_leave',
      description: `${teacher} 在该时段请假 (${overlappingLeave.reason})`,
      affectedBookings: affectedIds,
      affectedBookingIds: affectedIds,
      resolved: false,
      detectedAt: now,
      createdAt: now,
      bookingStartTime: booking.startTime,
      bookingEndTime: booking.endTime,
      impactAnalysis: `教师${teacher}请假影响${affectedIds.length}条预约，需要重新安排教师或调整时间`,
      suggestions: [
        '安排代课老师',
        '调整课程时间',
        '暂停该时段的课程',
      ],
    };
  }
  return null;
}

export function detectOverdayConflict(
  booking: Booking,
): Conflict | null {
  if (isOverday(booking.startTime, booking.endTime)) {
    const startDay = dayjsInstance(booking.startTime).startOf('day');
    const endDay = dayjsInstance(booking.endTime).startOf('day');
    const days = endDay.diff(startDay, 'day') + 1;
    const now = dayjsInstance().toISOString();
    const affectedIds = [booking.id];

    return {
      id: generateId(),
      bookingId: booking.id,
      roomId: booking.roomId,
      courseId: booking.courseId,
      type: 'overday',
      description: `预约跨 ${days} 天 (${dayjsInstance(booking.startTime).format('MM-DD')} 至 ${dayjsInstance(booking.endTime).format('MM-DD')})`,
      affectedBookings: affectedIds,
      affectedBookingIds: affectedIds,
      resolved: false,
      detectedAt: now,
      createdAt: now,
      bookingStartTime: booking.startTime,
      bookingEndTime: booking.endTime,
      impactAnalysis: '跨天预约可能占用排练室资源，影响其他预约安排',
      suggestions: [
        '拆分为多天预约',
        '压缩预约时间',
        '确认是否真的需要跨天',
      ],
    };
  }
  return null;
}

export function detectOverlapConflict(
  booking: Booking,
  allBookings: Booking[],
  rooms: Room[],
  bands: Band[],
): Conflict | null {
  const overlapping = allBookings.filter(b =>
    b.id !== booking.id &&
    b.roomId === booking.roomId &&
    dateRangesOverlap(b.startTime, b.endTime, booking.startTime, booking.endTime),
  );

  if (overlapping.length > 0) {
    const bandNames = overlapping
      .map(b => {
        const band = bands.find(band => band.id === b.bandId);
        return band?.name || '未知乐队';
      })
      .join('、');

    const affectedIds = [booking.id, ...overlapping.map(b => b.id)];
    const now = dayjsInstance().toISOString();

    return {
      id: generateId(),
      bookingId: booking.id,
      roomId: booking.roomId,
      courseId: booking.courseId,
      type: 'overlap',
      description: `与 ${bandNames} 的预约时间重叠`,
      affectedBookings: affectedIds,
      affectedBookingIds: affectedIds,
      resolved: false,
      detectedAt: now,
      createdAt: now,
      bookingStartTime: booking.startTime,
      bookingEndTime: booking.endTime,
      impactAnalysis: `时间重叠影响${affectedIds.length}条预约，需要调整时间或换房`,
      suggestions: [
        '其中一方更换排练室',
        '调整预约时间',
        '协商共享排练室',
      ],
    };
  }
  return null;
}

export interface ConflictDetectionContext {
  rooms: Room[];
  bands: Band[];
  courses: Course[];
  bookings: Booking[];
  teacherLeaves: TeacherLeave[];
}

export function detectAllConflicts(
  booking: Booking,
  context: ConflictDetectionContext,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const { rooms, bands, courses, bookings, teacherLeaves } = context;

  const room = rooms.find(r => r.id === booking.roomId);
  const band = bands.find(b => b.id === booking.bandId);
  const course = courses.find(c => c.id === booking.courseId);

  const equipmentConflict = detectEquipmentConflict(booking, room, band);
  if (equipmentConflict) conflicts.push(equipmentConflict);

  const leaveConflict = detectTeacherLeaveConflict(
    booking,
    course,
    teacherLeaves,
    bookings,
    courses,
  );
  if (leaveConflict) conflicts.push(leaveConflict);

  const overdayConflict = detectOverdayConflict(booking);
  if (overdayConflict) conflicts.push(overdayConflict);

  const overlapConflict = detectOverlapConflict(booking, bookings, rooms, bands);
  if (overlapConflict) conflicts.push(overlapConflict);

  return conflicts;
}

export function detectConflictsForAllBookings(
  context: ConflictDetectionContext,
): Conflict[] {
  const allConflicts: Conflict[] = [];
  
  for (const booking of context.bookings) {
    const conflicts = detectAllConflicts(booking, context);
    allConflicts.push(...conflicts);
  }
  
  return allConflicts;
}

export function getConflictTypeColor(type: ConflictType): string {
  const colors: Record<ConflictType, string> = {
    equipment: 'text-warning-dark bg-warning-light border-warning/30',
    teacher_leave: 'text-conflict-dark bg-conflict-light border-conflict/30',
    overday: 'text-primary-800 bg-primary-50 border-primary-200',
    overlap: 'text-conflict-dark bg-conflict-light border-conflict/30',
  };
  return colors[type];
}

export function getConflictTypeIcon(type: ConflictType): string {
  const icons: Record<ConflictType, string> = {
    equipment: '⚙️',
    teacher_leave: '📅',
    overday: '🌙',
    overlap: '⏰',
  };
  return icons[type];
}
