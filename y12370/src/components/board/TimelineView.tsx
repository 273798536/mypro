import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import type { Booking, Room, Band, Conflict, ViewMode } from '../../types';
import { BookingBlock } from './BookingBlock';
import {
  getWeekDates,
  getDayHours,
  dayjsInstance,
  formatDate,
} from '../../utils/dateUtils';
import { dayNames } from '../../data/sampleData';
import { getTimelineBookings } from '../../engine/bookingScheduler';

interface TimelineViewProps {
  bookings: Booking[];
  rooms: Room[];
  bands: Band[];
  conflicts: Conflict[];
}

export function TimelineView({ bookings, rooms, bands, conflicts }: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(dayjsInstance().format('YYYY-MM-DD'));

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const hours = getDayHours();

  const timelineBookings = useMemo(() => {
    return getTimelineBookings(
      bookings,
      rooms,
      bands,
      conflicts.map(c => ({ bookingId: c.bookingId, type: c.type })),
    );
  }, [bookings, rooms, bands, conflicts]);

  const navigateWeek = (direction: number) => {
    setCurrentDate(
      dayjsInstance(currentDate).add(direction * 7, 'day').format('YYYY-MM-DD'),
    );
  };

  const visibleDates = viewMode === 'week' ? weekDates : [weekDates[0]];

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-primary-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-1.5 rounded hover:bg-primary-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-primary-600" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-primary-800">
                {formatDate(visibleDates[0].toISOString())} ~ {formatDate(visibleDates[visibleDates.length - 1].toISOString())}
              </span>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-1.5 rounded hover:bg-primary-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-primary-600" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-primary-50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
            >
              日
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
            >
              周
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary-600" />
            <span className="text-primary-600">正常</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-conflict conflict-pattern" />
            <span className="text-primary-600">冲突</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-success" />
            <span className="text-primary-600">已解决</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[800px]">
          <div className="flex">
            <div className="w-48 flex-shrink-0 border-r border-primary-100" />
            
            {visibleDates.map((date, dateIdx) => (
              <div
                key={dateIdx}
                className="flex-1 min-w-[150px] border-r border-primary-100 last:border-r-0"
              >
                <div className="h-10 border-b border-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {dayNames[date.isoWeekday() - 1]} {date.format('MM/DD')}
                  </span>
                </div>
                <div className="flex h-8">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="flex-1 border-r border-primary-50 last:border-r-0 text-center"
                    >
                      <span className="text-[10px] text-primary-400">
                        {hour.toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {rooms.map(room => (
            <div key={room.id} className="flex border-b border-primary-50">
              <div className="w-48 flex-shrink-0 p-2 border-r border-primary-100 bg-primary-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-primary-800 truncate">
                      {room.name}
                    </div>
                    <div className="text-[10px] text-primary-500">
                      容量 {room.capacity}人 · {room.equipment.length}种设备
                    </div>
                  </div>
                </div>
              </div>

              {visibleDates.map((date, dateIdx) => {
                const dayStart = date.hour(8).minute(0).toISOString();
                const dayBookings = timelineBookings.filter(
                  b => b.roomName === room.name &&
                    dayjsInstance(b.startTime).isSame(date, 'day'),
                );

                return (
                  <div
                    key={dateIdx}
                    className="flex-1 relative h-16 min-w-[150px] border-r border-primary-50 last:border-r-0"
                  >
                    {hours.map((hour, hourIdx) => (
                      <div
                        key={hourIdx}
                        className="absolute top-0 bottom-0 border-r border-primary-50 last:border-r-0"
                        style={{ left: `${(hourIdx / hours.length) * 100}%`, width: `${100 / hours.length}%` }}
                      />
                    ))}
                    
                    {dayBookings.map(booking => (
                      <BookingBlock
                        key={booking.id}
                        booking={booking}
                        viewStart={dayStart}
                        roomId={room.id}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
