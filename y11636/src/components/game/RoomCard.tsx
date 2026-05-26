import React from 'react';
import { DoorOpen, Clock, User, CheckCircle } from 'lucide-react';
import type { Room, Patient } from '@/types';
import { formatTime } from '@/utils/helpers';

interface RoomCardProps {
  room: Room;
  currentPatient?: Patient;
  isSelected?: boolean;
  onClick?: () => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, currentPatient, isSelected, onClick }) => {
  const isIdle = room.status === 'idle';
  const isOccupied = room.status === 'occupied';
  const progress = room.totalTime > 0 ? ((room.totalTime - room.remainingTime) / room.totalTime) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${isIdle ? 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50' : ''}
        ${isOccupied ? 'bg-blue-50 border-blue-300' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isIdle ? 'bg-gray-200' : 'bg-blue-500'}`}>
            <DoorOpen size={20} className={isIdle ? 'text-gray-600' : 'text-white'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{room.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isIdle ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {isIdle ? '空闲' : '使用中'}
            </span>
          </div>
        </div>
      </div>

      {isOccupied && currentPatient ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">{currentPatient.name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Clock size={14} />
            <span>剩余 {formatTime(room.remainingTime)}</span>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-gray-400">
          <CheckCircle size={32} className="mb-1 opacity-50" />
          <p className="text-sm">等待患者</p>
        </div>
      )}

      {isIdle && (
        <div className="mt-2 text-xs text-center text-blue-500 font-medium">
          点击分配患者
        </div>
      )}
    </div>
  );
};

export default RoomCard;
