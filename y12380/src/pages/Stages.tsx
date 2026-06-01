import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Clock } from 'lucide-react';
import { useScheduleStore } from '@/store';

export default function Stages() {
  const stages = useScheduleStore((state) => state.stages);
  const positions = useScheduleStore((state) => state.positions);
  const timeSlots = useScheduleStore((state) => state.timeSlots);
  const activeDate = useScheduleStore((state) => state.activeDate);

  const [selectedStage, setSelectedStage] = useState(stages[0]?.id || '');

  const currentTimeSlots = timeSlots.filter(
    t => t.stageId === selectedStage && t.date === activeDate
  );

  const getPositionsForSlot = (slotId: string) =>
    positions.filter(p => p.timeSlotId === slotId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">岗位舞台管理</h1>
          <p className="text-sm text-slate-500 mt-1">配置舞台、时段和岗位需求</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
          <Plus className="w-4 h-4" />
          添加舞台
        </button>
      </div>

      <div className="flex gap-2">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
              selectedStage === stage.id
                ? 'text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            style={selectedStage === stage.id ? { backgroundColor: stage.color } : {}}
          >
            {stage.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {stages.find(s => s.id === selectedStage)?.name} - 时段配置
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeDate}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Plus className="w-4 h-4" />
            添加时段
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {currentTimeSlots.map((slot) => {
            const slotPositions = getPositionsForSlot(slot.id);
            return (
              <div key={slot.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-800">{slot.label}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {slotPositions.length} 个岗位 · 共需 {slotPositions.reduce((a, p) => a + p.headcount, 0)} 人
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                {slotPositions.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {slotPositions.map((pos) => (
                      <div
                        key={pos.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{pos.name}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs text-slate-500">{pos.headcount} 人</span>
                            </div>
                          </div>
                          <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {pos.requiredSkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
