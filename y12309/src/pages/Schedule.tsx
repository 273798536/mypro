import { useState } from 'react';
import { Calendar, Clock, User, Edit3, Check, X, AlertCircle, FileEdit } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getBuildingName } from '@/utils/graphUtils';
import type { ShiftType } from '@/types';

export default function ScheduleCenter() {
  const { schedules, inspectors, buildings, leaveRecords, selectedDate, setSelectedDate, updateSchedule, changeLogs } = useStore();
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editBuildings, setEditBuildings] = useState<string[]>([]);

  const todaySchedules = schedules.filter(s => s.date === selectedDate);
  const todayLeaves = leaveRecords.filter(l => 
    l.startDate <= selectedDate && l.endDate >= selectedDate
  );

  const getShiftColor = (shift: ShiftType) => {
    const colors = {
      morning: 'bg-blue-100 text-blue-700 border-blue-200',
      afternoon: 'bg-amber-100 text-amber-700 border-amber-200',
      night: 'bg-slate-700 text-white border-slate-600',
    };
    return colors[shift];
  };

  const getShiftLabel = (shift: ShiftType) => {
    const labels = { morning: '早班 08:00-16:00', afternoon: '午班 12:00-20:00', night: '夜班 20:00-08:00' };
    return labels[shift];
  };

  const startEditing = (scheduleId: string, buildingIds: string[]) => {
    setEditingSchedule(scheduleId);
    setEditBuildings([...buildingIds]);
  };

  const saveEditing = () => {
    if (editingSchedule) {
      updateSchedule(editingSchedule, { buildingIds: editBuildings });
      setEditingSchedule(null);
    }
  };

  const toggleBuilding = (buildingId: string) => {
    setEditBuildings(prev => 
      prev.includes(buildingId) 
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  const scheduleChangeLogs = changeLogs.filter(cl => cl.entityType === 'schedule');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">排程中心</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <User size={20} className="text-blue-500" />
            <span className="text-sm text-slate-500">在岗巡检员</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {inspectors.filter(i => i.onDuty).length}/{inspectors.length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-emerald-500" />
            <span className="text-sm text-slate-500">今日排班</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{todaySchedules.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            <span className="text-sm text-slate-500">请假人员</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{todayLeaves.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <FileEdit size={20} className="text-violet-500" />
            <span className="text-sm text-slate-500">人工调整</span>
          </div>
          <div className="text-2xl font-bold text-violet-600 mt-2">
            {todaySchedules.filter(s => s.isModified).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">排班日历</h2>
            <p className="text-sm text-slate-500 mt-1">点击编辑按钮可调整巡检楼栋范围</p>
          </div>
          <div className="divide-y divide-slate-100">
            {todaySchedules.map(schedule => {
              const inspector = inspectors.find(i => i.id === schedule.inspectorId);
              const isEditing = editingSchedule === schedule.id;
              
              return (
                <div key={schedule.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg"
                        style={{ backgroundColor: inspector?.avatarColor }}
                      >
                        {inspector?.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{inspector?.name}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded border', getShiftColor(schedule.shift))}>
                            {getShiftLabel(schedule.shift)}
                          </span>
                          {schedule.isModified && (
                            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                              已调整
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">{inspector?.team} · {inspector?.phone}</div>
                        
                        {isEditing ? (
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-2">选择巡检楼栋：</div>
                            <div className="flex flex-wrap gap-2 max-w-md">
                              {buildings.map(building => (
                                <button
                                  key={building.id}
                                  onClick={() => toggleBuilding(building.id)}
                                  className={cn(
                                    'text-xs px-2 py-1 rounded border transition-colors',
                                    editBuildings.includes(building.id)
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                                  )}
                                >
                                  {building.name}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={saveEditing}
                                className="flex items-center gap-1 text-xs bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600"
                              >
                                <Check size={14} /> 保存
                              </button>
                              <button
                                onClick={() => setEditingSchedule(null)}
                                className="flex items-center gap-1 text-xs bg-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-300"
                              >
                                <X size={14} /> 取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">巡检楼栋：</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {schedule.buildingIds.map(buildingId => (
                                <span key={buildingId} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {getBuildingName(buildingId, buildings)}
                                </span>
                              ))}
                            </div>
                            {schedule.modifiedAt && (
                              <div className="text-xs text-violet-600 mt-2">
                                最后修改: {schedule.modifiedBy} · {schedule.modifiedAt}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(schedule.id, schedule.buildingIds)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑排班"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {todaySchedules.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                当日无排班
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">请假记录</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {leaveRecords.map(leave => {
                const inspector = inspectors.find(i => i.id === leave.inspectorId);
                return (
                  <div key={leave.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: inspector?.avatarColor }}
                        >
                          {inspector?.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{inspector?.name}</div>
                          <div className="text-xs text-slate-500">{leave.startDate} ~ {leave.endDate}</div>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                        leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      )}>
                        {leave.status === 'approved' ? '已批准' : leave.status === 'pending' ? '待审批' : '已拒绝'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {leave.type === 'annual' ? '年假' : leave.type === 'sick' ? '病假' : '事假'}：{leave.reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">改动记录</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {scheduleChangeLogs.map(log => {
                const inspector = inspectors.find(i => schedules.find(s => s.id === log.entityId)?.inspectorId === i.id);
                return (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700">
                          <span className="font-medium">{log.operator}</span> 修改了 {inspector?.name || '排班'} 的 {log.field}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          从 <span className="text-red-500">{log.oldValue}</span> 改为 <span className="text-green-500">{log.newValue}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{log.timestamp}</div>
                        {log.reason && (
                          <div className="text-xs text-violet-600 mt-1">原因：{log.reason}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {scheduleChangeLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  暂无改动记录
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
