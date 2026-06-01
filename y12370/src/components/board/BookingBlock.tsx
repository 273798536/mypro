import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Users, Clock } from 'lucide-react';
import type { TimelineBooking } from '../../types';
import { formatTime, getTimeSlotPosition } from '../../utils/dateUtils';
import { conflictTypeNames } from '../../data/sampleData';

interface BookingBlockProps {
  booking: TimelineBooking;
  viewStart: string;
  roomId: string;
}

export function BookingBlock({ booking, viewStart, roomId }: BookingBlockProps) {
  const navigate = useNavigate();

  const { left, width } = getTimeSlotPosition(
    booking.startTime,
    booking.endTime,
    viewStart,
  );

  const hasConflict = booking.conflicts.length > 0;
  const isResolved = booking.status === 'resolved';

  const statusColors = {
    normal: 'bg-primary-600 border-primary-700 hover:bg-primary-500',
    conflict: 'bg-conflict border-conflict-dark hover:bg-conflict/90',
    resolved: 'bg-success border-success-dark hover:bg-success/90',
  };

  const blockColors = hasConflict && !isResolved
    ? 'bg-conflict border-conflict-dark conflict-pattern'
    : statusColors[booking.status as keyof typeof statusColors];

  return (
    <div
      className={`
        absolute top-1 bottom-1 rounded-md px-2 py-1 cursor-pointer
        border shadow-sm transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        text-white text-xs overflow-hidden
        ${blockColors}
      `}
      style={{
        left: `${left}%`,
        width: `${Math.max(width, 8)}%`,
      }}
      onClick={() => navigate(`/booking/${booking.id}`)}
      title={`${booking.bandName} - ${formatTime(booking.startTime)} ~ ${formatTime(booking.endTime)}`}
    >
      <div className="flex items-center gap-1 h-full min-h-0">
        {hasConflict && !isResolved && (
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{booking.bandName}</div>
          <div className="flex items-center gap-1 opacity-90 text-[10px]">
            <Clock className="w-2.5 h-2.5" />
            <span>{formatTime(booking.startTime)}</span>
          </div>
        </div>
        {booking.conflicts.length > 0 && (
          <div className="flex flex-col gap-0.5 ml-1">
            {booking.conflicts.slice(0, 2).map((type, idx) => (
              <span
                key={idx}
                className="text-[9px] bg-white/20 px-1 rounded"
                title={conflictTypeNames[type] || type}
              >
                {conflictTypeNames[type]?.substring(0, 2) || type}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
