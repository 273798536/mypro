import React, { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import RoomCard from './RoomCard';
import type { Room, Patient } from '@/types';
import { useGameStore } from '@/stores/useGameStore';

interface RoomPanelProps {
  rooms: Room[];
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string | null) => void;
}

export const RoomPanel: React.FC<RoomPanelProps> = ({ rooms, patients, selectedPatientId, onSelectPatient }) => {
  const assignPatientToRoom = useGameStore(state => state.assignPatientToRoom);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const handleRoomClick = (roomId: string) => {
    if (selectedPatientId) {
      const success = assignPatientToRoom(selectedPatientId, roomId);
      if (success) {
        onSelectPatient(null);
        setSelectedRoomId(null);
      }
    } else {
      setSelectedRoomId(roomId);
    }
  };

  const getPatientById = (patientId?: string) => patients.find(p => p.id === patientId);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="text-blue-600" size={20} />
        <h2 className="text-lg font-bold text-gray-800">诊室资源</h2>
      </div>

      {selectedPatientId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
          已选择患者，点击空闲诊室进行分配
        </p>
      </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            currentPatient={getPatientById(room.currentPatientId)}
            isSelected={selectedRoomId === room.id}
            onClick={() => handleRoomClick(room.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomPanel;
