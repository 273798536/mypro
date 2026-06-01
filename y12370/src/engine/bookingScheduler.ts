import type {
  Booking,
  Room,
  Band,
  Course,
  DataSource,
  ChangeHistory,
  HeatmapData,
  TimelineBooking,
  BookingStatus,
  ConflictType,
  ActionType,
} from '../types';
import {
  generateId,
  dayjsInstance,
  dateRangesOverlap,
  formatTime,
} from '../utils/dateUtils';
import {
  createImportChainNode,
  createAdjustChainNode,
  addChainNode,
} from './chainTracker';

export function generateBookings(
  rooms: Room[],
  bands: Band[],
  courses: Course[],
  dataSources: DataSource[],
): Booking[] {
  const bookings: Booking[] = [];

  courses.forEach((course, courseIndex) => {
    const band = bands[courseIndex % bands.length];
    const room = rooms[courseIndex % rooms.length];

    const courseDataSource = dataSources.find(ds => ds.id === course.sourceId);
    const bandDataSource = dataSources.find(ds => ds.id === band.sourceId);
    const roomDataSource = dataSources.find(ds => ds.id === room.sourceId);

    const combinedSnapshot = {
      course: { ...course },
      band: { ...band },
      room: { ...room },
      courseDataSource,
      bandDataSource,
      roomDataSource,
    };

    const importChainNode = createImportChainNode(
      courseDataSource || {
        id: 'unknown',
        type: 'course',
        name: 'unknown',
        source: 'unknown',
        version: 'unknown',
        importedAt: dayjsInstance().toISOString(),
        snapshot: null,
        recordCount: 0,
      },
      combinedSnapshot,
    );

    const booking: Booking = {
      id: generateId(),
      roomId: room.id,
      bandId: band.id,
      courseId: course.id,
      startTime: course.startTime,
      endTime: course.endTime,
      status: 'normal',
      dataChain: [importChainNode],
      version: generateId(),
    };

    bookings.push(booking);
  });

  return bookings;
}

export function findAvailableRoom(
  startTime: string,
  endTime: string,
  requiredEquipment: string[],
  rooms: Room[],
  bookings: Booking[],
  excludeBookingId?: string,
): Room[] {
  return rooms.filter(room => {
    const hasEquipment = requiredEquipment.every(eq =>
      room.equipment.includes(eq),
    );
    if (!hasEquipment) return false;

    const hasOverlap = bookings.some(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (booking.roomId !== room.id) return false;
      return dateRangesOverlap(
        booking.startTime,
        booking.endTime,
        startTime,
        endTime,
      );
    });

    return !hasOverlap;
  });
}

export function changeBookingRoom(
  booking: Booking,
  newRoomId: string,
  rooms: Room[],
  operator: string,
  remark: string,
): { booking: Booking; history: ChangeHistory } {
  const oldRoom = rooms.find(r => r.id === booking.roomId);
  const newRoom = rooms.find(r => r.id === newRoomId);

  const beforeValue = {
    roomId: booking.roomId,
    roomName: oldRoom?.name || 'unknown',
  };

  const afterValue = {
    roomId: newRoomId,
    roomName: newRoom?.name || 'unknown',
  };

  const adjustNode = createAdjustChainNode(
    'manual',
    booking.version,
    { before: beforeValue, after: afterValue },
    operator,
    remark,
  );

  const updatedBooking = addChainNode(
    {
      ...booking,
      roomId: newRoomId,
    },
    adjustNode,
  );

  const now = dayjsInstance().toISOString();
  
  const history: ChangeHistory = {
    id: generateId(),
    bookingId: booking.id,
    actionType: 'change_room',
    beforeValue,
    afterValue,
    fromValue: oldRoom?.name,
    toValue: newRoom?.name,
    field: '排练室',
    operator,
    operatedAt: now,
    timestamp: now,
    remark,
  };

  return { booking: updatedBooking, history };
}

export function adjustBookingTime(
  booking: Booking,
  newStartTime: string,
  newEndTime: string,
  operator: string,
  remark: string,
): { booking: Booking; history: ChangeHistory } {
  const beforeValue = {
    startTime: booking.startTime,
    endTime: booking.endTime,
  };

  const afterValue = {
    startTime: newStartTime,
    endTime: newEndTime,
  };

  const adjustNode = createAdjustChainNode(
    'manual',
    booking.version,
    { before: beforeValue, after: afterValue },
    operator,
    remark,
  );

  const updatedBooking = addChainNode(
    {
      ...booking,
      startTime: newStartTime,
      endTime: newEndTime,
    },
    adjustNode,
  );

  const now = dayjsInstance().toISOString();
  const history: ChangeHistory = {
    id: generateId(),
    bookingId: booking.id,
    actionType: 'adjust_time',
    beforeValue,
    afterValue,
    fromValue: `${formatTime(booking.startTime)} ~ ${formatTime(booking.endTime)}`,
    toValue: `${formatTime(newStartTime)} ~ ${formatTime(newEndTime)}`,
    field: '时间',
    operator,
    operatedAt: now,
    timestamp: now,
    remark,
  };

  return { booking: updatedBooking, history };
}

export function resolveConflict(
  booking: Booking,
  solution: string,
  operator: string,
): { booking: Booking; history: ChangeHistory } {
  const beforeValue = {
    status: booking.status,
  };

  const afterValue = {
    status: 'resolved' as const,
  };

  const adjustNode = createAdjustChainNode(
    'conflict-resolution',
    booking.version,
    { solution, before: beforeValue, after: afterValue },
    operator,
    `解决冲突: ${solution}`,
  );

  const updatedBooking = addChainNode(
    {
      ...booking,
      status: 'resolved',
    },
    adjustNode,
  );

  const now = dayjsInstance().toISOString();
  const history: ChangeHistory = {
    id: generateId(),
    bookingId: booking.id,
    actionType: 'resolve_conflict',
    beforeValue,
    afterValue,
    fromValue: booking.status,
    toValue: 'resolved',
    field: '状态',
    operator,
    operatedAt: now,
    timestamp: now,
    remark: solution,
  };

  return { booking: updatedBooking, history };
}

export function createChangeHistory(
  bookingId: string,
  actionType: ActionType,
  beforeValue: unknown,
  afterValue: unknown,
  operator: string,
  remark: string,
  field?: string,
  fromValue?: string,
  toValue?: string,
): ChangeHistory {
  const now = dayjsInstance().toISOString();
  return {
    id: generateId(),
    bookingId,
    actionType,
    beforeValue,
    afterValue,
    field,
    fromValue,
    toValue,
    operator,
    operatedAt: now,
    timestamp: now,
    remark,
  };
}

export function getBookingHeatmapData(
  bookings: Booking[],
  rooms: Room[],
): { roomId: string; roomName: string; hour: number; dayOfWeek: number; count: number }[] {
  const heatmap: { roomId: string; roomName: string; hour: number; dayOfWeek: number; count: number }[] = [];

  rooms.forEach(room => {
    for (let day = 1; day <= 7; day++) {
      for (let hour = 8; hour <= 21; hour++) {
        heatmap.push({
          roomId: room.id,
          roomName: room.name,
          hour,
          dayOfWeek: day,
          count: 0,
        });
      }
    }
  });

  bookings.forEach(booking => {
    const start = dayjsInstance(booking.startTime);
    const end = dayjsInstance(booking.endTime);
    const dayOfWeek = start.isoWeekday();

    const startHour = start.hour();
    const endHour = end.hour();

    for (let hour = startHour; hour < endHour; hour++) {
      const entry = heatmap.find(
        h => h.roomId === booking.roomId && h.hour === hour && h.dayOfWeek === dayOfWeek,
      );
      if (entry) {
        entry.count++;
      }
    }
  });

  return heatmap;
}

export function getTimelineBookings(
  bookings: Booking[],
  rooms: Room[],
  bands: Band[],
  conflicts: { bookingId: string; type: string }[],
): TimelineBooking[] {
  return bookings.map(booking => {
    const room = rooms.find(r => r.id === booking.roomId);
    const band = bands.find(b => b.id === booking.bandId);
    const bookingConflicts = conflicts
      .filter(c => c.bookingId === booking.id)
      .map(c => c.type as ConflictType);

    return {
      id: booking.id,
      bandName: band?.name || '未知乐队',
      roomName: room?.name || '未知房间',
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status as BookingStatus,
      conflicts: bookingConflicts,
    };
  });
}
