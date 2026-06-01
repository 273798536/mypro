import { useState } from 'react';
import { MapPin, Clock, Users, AlertTriangle, CheckCircle, X } from 'lucide-react';
import type { Room, Booking } from '../../types';
import { dayjsInstance, formatTime } from '../../utils/dateUtils';

interface RoomChangeFormProps {
  booking: Booking;
  rooms: Room[];
  onSubmit: (newRoomId: string, newStartTime?: string, newEndTime?: string) => void;
  onCancel: () => void;
}

export function RoomChangeForm({
  booking,
  rooms,
  onSubmit,
  onCancel,
}: RoomChangeFormProps) {
  const [newRoomId, setNewRoomId] = useState('');
  const [newStartTime, setNewStartTime] = useState(booking.startTime);
  const [newEndTime, setNewEndTime] = useState(booking.endTime);

  const availableRooms = rooms.filter(room => room.id !== booking.roomId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId) return;
    onSubmit(newRoomId, newStartTime, newEndTime);
  };

  const startTime = dayjsInstance(booking.startTime);
  const endTime = dayjsInstance(booking.endTime);
  const duration = endTime.diff(startTime, 'hour', true);

  return (
    <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-serif text-lg font-semibold text-primary-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          调整预约
        </h4>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-primary-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-primary-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-primary-100 mb-4">
          <h5 className="text-sm font-medium text-primary-700 mb-3">当前预约</h5>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-1 text-primary-500 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                排练室
              </div>
              <div className="font-medium text-primary-800">
                {rooms.find(r => r.id === booking.roomId)?.name}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-primary-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                时间
              </div>
              <div className="font-medium text-primary-800">
                {formatTime(booking.startTime)} ~ {formatTime(booking.endTime)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-primary-500 mb-1">
                <Users className="w-3.5 h-3.5" />
                时长
              </div>
              <div className="font-medium text-primary-800">
                {duration} 小时
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            选择新排练室 <span className="text-conflict">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {availableRooms.map(room => (
              <label
                key={room.id}
                className={`
                  relative p-4 border-2 rounded-xl cursor-pointer transition-all
                  ${newRoomId === room.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300 bg-white'
                  }
                `}
              >
                <input
                  type="radio"
                  name="roomId"
                  value={room.id}
                  checked={newRoomId === room.id}
                  onChange={e => setNewRoomId(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-primary-800">{room.name}</div>
                    <div className="text-xs text-primary-500 mt-0.5">
                      容量 {room.capacity}人
                    </div>
                  </div>
                  {newRoomId === room.id && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {room.equipment.map((eq, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              开始时间
            </label>
            <input
              type="datetime-local"
              value={dayjsInstance(newStartTime).format('YYYY-MM-DDTHH:mm')}
              onChange={e => setNewStartTime(dayjsInstance(e.target.value).toISOString())}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">
              结束时间
            </label>
            <input
              type="datetime-local"
              value={dayjsInstance(newEndTime).format('YYYY-MM-DDTHH:mm')}
              onChange={e => setNewEndTime(dayjsInstance(e.target.value).toISOString())}
              className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
            />
          </div>
        </div>

        <div className="bg-warning-light/50 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-dark mt-0.5 flex-shrink-0" />
          <div className="text-xs text-warning-dark">
            <p className="font-medium">提示</p>
            <p className="mt-0.5">
              调整后系统会自动创建换房历史记录，并重新检测冲突。
              预约的数据链路会保留完整变更记录。
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!newRoomId}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            确认调整
          </button>
        </div>
      </form>
    </div>
  );
}
