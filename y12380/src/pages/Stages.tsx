import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Clock, X, Check } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { SKILLS } from '@/types';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/mockData';
import type { Stage, TimeSlot, Position } from '@/types';

const stageColors = [
  '#6366F1', '#F97316', '#10B981', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#64748B'
];

type ModalType = 'stage' | 'timeslot' | 'position' | null;

export default function Stages() {
  const stages = useScheduleStore((state) => state.stages);
  const positions = useScheduleStore((state) => state.positions);
  const timeSlots = useScheduleStore((state) => state.timeSlots);
  const activeDate = useScheduleStore((state) => state.activeDate);
  const addStage = useScheduleStore((state) => state.addStage);
  const updateStage = useScheduleStore((state) => state.updateStage);
  const removeStage = useScheduleStore((state) => state.removeStage);
  const addTimeSlot = useScheduleStore((state) => state.addTimeSlot);
  const updateTimeSlot = useScheduleStore((state) => state.updateTimeSlot);
  const removeTimeSlot = useScheduleStore((state) => state.removeTimeSlot);
  const addPosition = useScheduleStore((state) => state.addPosition);
  const updatePosition = useScheduleStore((state) => state.updatePosition);
  const removePosition = useScheduleStore((state) => state.removePosition);

  const [selectedStage, setSelectedStage] = useState(stages[0]?.id || '');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [stageForm, setStageForm] = useState({ name: '', color: stageColors[0], description: '' });
  const [timeSlotForm, setTimeSlotForm] = useState({ startTime: '10:00', endTime: '12:00' });
  const [positionForm, setPositionForm] = useState({
    name: '',
    requiredSkills: [] as string[],
    headcount: 1,
    description: ''
  });

  const currentTimeSlots = timeSlots.filter(
    t => t.stageId === selectedStage && t.date === activeDate
  );

  const getPositionsForSlot = (slotId: string) =>
    positions.filter(p => p.timeSlotId === slotId);

  const openStageModal = (stage?: Stage) => {
    if (stage) {
      setEditingStage(stage);
      setStageForm({ name: stage.name, color: stage.color, description: stage.description || '' });
    } else {
      setEditingStage(null);
      setStageForm({ name: '', color: stageColors[stages.length % stageColors.length], description: '' });
    }
    setModalType('stage');
  };

  const openTimeSlotModal = (slot?: TimeSlot) => {
    if (slot) {
      setEditingTimeSlot(slot);
      setTimeSlotForm({ startTime: slot.startTime, endTime: slot.endTime });
    } else {
      setEditingTimeSlot(null);
      setTimeSlotForm({ startTime: '10:00', endTime: '12:00' });
    }
    setModalType('timeslot');
  };

  const openPositionModal = (slotId: string, position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setPositionForm({
        name: position.name,
        requiredSkills: [...position.requiredSkills],
        headcount: position.headcount,
        description: position.description || ''
      });
    } else {
      setEditingPosition(null);
      setPositionForm({
        name: '',
        requiredSkills: [],
        headcount: 1,
        description: ''
      });
    }
    setEditingTimeSlot({ id: slotId } as TimeSlot);
    setModalType('position');
  };

  const handleStageSubmit = () => {
    if (!stageForm.name.trim()) return;

    if (editingStage) {
      updateStage(editingStage.id, {
        name: stageForm.name,
        color: stageForm.color,
        description: stageForm.description
      });
    } else {
      const newStage: Stage = {
        id: `stage-${generateId()}`,
        name: stageForm.name,
        color: stageForm.color,
        order: stages.length + 1,
        description: stageForm.description
      };
      addStage(newStage);
      setSelectedStage(newStage.id);
    }
    setModalType(null);
  };

  const handleTimeSlotSubmit = () => {
    if (!selectedStage) return;

    if (editingTimeSlot && editingTimeSlot.id) {
      updateTimeSlot(editingTimeSlot.id, {
        startTime: timeSlotForm.startTime,
        endTime: timeSlotForm.endTime,
        label: `${timeSlotForm.startTime}-${timeSlotForm.endTime}`
      });
    } else {
      const newSlot: TimeSlot = {
        id: `ts-${generateId()}`,
        stageId: selectedStage,
        date: activeDate,
        startTime: timeSlotForm.startTime,
        endTime: timeSlotForm.endTime,
        label: `${timeSlotForm.startTime}-${timeSlotForm.endTime}`
      };
      addTimeSlot(newSlot);
    }
    setModalType(null);
  };

  const handlePositionSubmit = () => {
    if (!positionForm.name.trim() || !editingTimeSlot?.id || !selectedStage) return;

    if (editingPosition) {
      updatePosition(editingPosition.id, {
        name: positionForm.name,
        requiredSkills: positionForm.requiredSkills,
        headcount: positionForm.headcount,
        description: positionForm.description
      });
    } else {
      const newPosition: Position = {
        id: `pos-${generateId()}`,
        name: positionForm.name,
        stageId: selectedStage,
        timeSlotId: editingTimeSlot.id,
        requiredSkills: positionForm.requiredSkills,
        headcount: positionForm.headcount,
        description: positionForm.description
      };
      addPosition(newPosition);
    }
    setModalType(null);
  };

  const handleRemoveStage = (stageId: string) => {
    if (confirm('确定要删除这个舞台吗？相关的时段和岗位也会被删除。')) {
      removeStage(stageId);
      if (selectedStage === stageId) {
        const remaining = stages.filter(s => s.id !== stageId);
        setSelectedStage(remaining[0]?.id || '');
      }
    }
  };

  const handleRemoveTimeSlot = (slotId: string) => {
    if (confirm('确定要删除这个时段吗？相关的岗位也会被删除。')) {
      removeTimeSlot(slotId);
    }
  };

  const handleRemovePosition = (positionId: string) => {
    if (confirm('确定要删除这个岗位吗？')) {
      removePosition(positionId);
    }
  };

  const toggleSkill = (skill: string) => {
    setPositionForm(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.includes(skill)
        ? prev.requiredSkills.filter(s => s !== skill)
        : [...prev.requiredSkills, skill]
    }));
  };

  const currentStageData = stages.find(s => s.id === selectedStage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">岗位舞台管理</h1>
          <p className="text-sm text-slate-500 mt-1">配置舞台、时段和岗位需求</p>
        </div>
        <button
          onClick={() => openStageModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          添加舞台
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-1">
            <button
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
            <button
              onClick={() => openStageModal(stage)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
              title="编辑舞台"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRemoveStage(stage.id)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
              title="删除舞台"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {currentStageData?.name || '请选择舞台'} - 时段配置
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeDate}
            </p>
          </div>
          <button
            onClick={() => openTimeSlotModal()}
            disabled={!selectedStage}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            添加时段
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {currentTimeSlots.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无时段配置</p>
            </div>
          ) : (
            currentTimeSlots.map((slot) => {
              const slotPositions = getPositionsForSlot(slot.id);
              return (
                <div key={slot.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: currentStageData?.color || '#6366F1' }}
                      >
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
                      <button
                        onClick={() => openPositionModal(slot.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加岗位
                      </button>
                      <button
                        onClick={() => openTimeSlotModal(slot)}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleRemoveTimeSlot(slot.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  {slotPositions.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {slotPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-100 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 truncate">{pos.name}</p>
                              <div className="flex items-center gap-1 mt-2">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs text-slate-500">{pos.headcount} 人</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openPositionModal(slot.id, pos)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <button
                                onClick={() => handleRemovePosition(pos.id)}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                              </button>
                            </div>
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
            })
          )}
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {modalType === 'stage' && (editingStage ? '编辑舞台' : '添加舞台')}
                {modalType === 'timeslot' && (editingTimeSlot?.id ? '编辑时段' : '添加时段')}
                {modalType === 'position' && (editingPosition ? '编辑岗位' : '添加岗位')}
              </h2>
              <button
                onClick={() => setModalType(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {modalType === 'stage' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">舞台名称</label>
                    <input
                      type="text"
                      value={stageForm.name}
                      onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                      placeholder="请输入舞台名称"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">主题颜色</label>
                    <div className="flex gap-2 flex-wrap">
                      {stageColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setStageForm({ ...stageForm, color })}
                          className={cn(
                            'w-8 h-8 rounded-full transition-all',
                            stageForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                    <textarea
                      value={stageForm.description}
                      onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                      placeholder="舞台描述（可选）"
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                  </div>
                </>
              )}

              {modalType === 'timeslot' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">开始时间</label>
                      <input
                        type="time"
                        value={timeSlotForm.startTime}
                        onChange={(e) => setTimeSlotForm({ ...timeSlotForm, startTime: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">结束时间</label>
                      <input
                        type="time"
                        value={timeSlotForm.endTime}
                        onChange={(e) => setTimeSlotForm({ ...timeSlotForm, endTime: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">时段预览: <span className="font-medium text-slate-700">{timeSlotForm.startTime}-{timeSlotForm.endTime}</span></p>
                  </div>
                </>
              )}

              {modalType === 'position' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">岗位名称</label>
                    <input
                      type="text"
                      value={positionForm.name}
                      onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                      placeholder="请输入岗位名称"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">需求人数</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={positionForm.headcount}
                      onChange={(e) => setPositionForm({ ...positionForm, headcount: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">所需技能</label>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                            positionForm.requiredSkills.includes(skill)
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">岗位描述</label>
                    <textarea
                      value={positionForm.description}
                      onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                      placeholder="岗位描述（可选）"
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (modalType === 'stage') handleStageSubmit();
                  else if (modalType === 'timeslot') handleTimeSlotSubmit();
                  else if (modalType === 'position') handlePositionSubmit();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  确认
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
