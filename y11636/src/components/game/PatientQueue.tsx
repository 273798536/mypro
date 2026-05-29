import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Users } from 'lucide-react';
import PatientCard from './PatientCard';
import type { Patient } from '@/types';
import { useGameStore } from '@/stores/useGameStore';

interface PatientQueueProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string | null) => void;
}

export const PatientQueue: React.FC<PatientQueueProps> = ({ patients, selectedPatientId, onSelectPatient }) => {
  const reorderPatients = useGameStore(state => state.reorderPatients);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = patients.findIndex(p => p.id === active.id);
      const newIndex = patients.findIndex(p => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPatients(oldIndex, newIndex);
      }
    }
  };

  const waitingPatients = patients.filter(p => p.status === 'waiting');

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">候诊队列</h2>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
          {waitingPatients.length} 人等待
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {waitingPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users size={48} className="mb-2 opacity-50" />
            <p>暂无候诊患者</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={waitingPatients.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {waitingPatients.map((patient, index) => (
                  <div key={patient.id} className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                      {index + 1}
                    </div>
                    <PatientCard
                      patient={patient}
                      isSelected={selectedPatientId === patient.id}
                      onSelect={() => {
                        if (selectedPatientId === patient.id) {
                          onSelectPatient(null);
                        } else {
                          onSelectPatient(patient.id);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          <p>💡 提示：拖拽卡片可调整队列顺序</p>
          <p>点击卡片可分配到空闲诊室</p>
        </div>
      </div>
    </div>
  );
};

export default PatientQueue;
