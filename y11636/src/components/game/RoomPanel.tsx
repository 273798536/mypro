import React, { useState } from 'react';
import { Stethoscope, User, X } from 'lucide-react';
import RoomCard from './RoomCard';
import type { Room, Patient } from '@/types';
import { PRIORITY_CONFIG } from '@/types';
import { useGameStore } from '@/stores/useGameStore';

interface RoomPanelProps {
  rooms: Room[];
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string | null) => void;
}

export const RoomPanel: React.FC<RoomPanelProps> = ({ rooms, patients, selectedPatientId, onSelectPatient }) => {
  const assignPatientToRoom = useGameStore(state => state.assignPatientToRoom);
  const [assignError, setAssignError] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleRoomClick = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (selectedPatientId && room.status === 'idle') {
      const success = assignPatientToRoom(selectedPatientId, roomId);
      if (success) {
        onSelectPatient(null);
        setAssignError(null);
      } else {
        setAssignError('分配失败，请检查患者状态');
        setTimeout(() => setAssignError(null), 2000);
      }
    } else if (selectedPatientId && room.status !== 'idle') {
      setAssignError('该诊室正在使用中，请选择空闲诊室');
      setTimeout(() => setAssignError(null), 2000);
    }
  };

  const handleCancelSelection = () => {
    onSelectPatient(null);
    setAssignError(null);
  };

  const getPatientById = (patientId?: string) => patients.find(p => p.id === patientId);

  const idleRoomsCount = rooms.filter(r => r.status === 'idle').length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">诊室资源</h2>
        </div>
        <span className="text-sm text-gray-500">
          空闲: <span className="font-semibold text-green-600">{idleRoomsCount}</span> / {rooms.length}
        </span>
      </div>

      {selectedPatient && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                已选择患者：{selectedPatient.name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[selectedPatient.currentPriority].bgColor} ${PRIORITY_CONFIG[selectedPatient.currentPriority].color}`}>
                {PRIORITY_CONFIG[selectedPatient.currentPriority].label}
              </span>
            </div>
            <button
              onClick={handleCancelSelection}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="取消选择"
            >
              <X size={16} className="text-blue-600" />
            </button>
          </div>
          <p className="text-xs text-blue-600">
            💡 点击下方空闲诊室进行分配，抢救室优先分配危重患者
          </p>
        </div>
      )}

      {assignError && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{assignError}</p>
        </div>
      )}

      {!selectedPatient && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            👆 请先点击左侧患者卡片左上角的按钮选择患者
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            currentPatient={getPatientById(room.currentPatientId)}
            isSelected={false}
            onClick={() => handleRoomClick(room.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomPanel;
