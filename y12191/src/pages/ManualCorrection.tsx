import { useState, useMemo } from 'react';
import { 
  Edit3, 
  Save, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Users,
  MapPin,
  Clock,
  ArrowLeftRight
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { classifyCheckResults } from '../engine/scheduleEngine';
import { SampleTypeBadge, AssignmentStatusBadge, PhaseBadge } from '../components/StatusBadge';
import type { Position } from '../types';

export function ManualCorrection() {
  const { 
    positions, 
    volunteers,
    checkResults, 
    snapshots,
    updatePosition,
    isLoading
  } = useScheduleStore();
  
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Position>>({});
  const [showComparison, setShowComparison] = useState(false);
  
  const phase1Snapshot = useMemo(() => 
    snapshots.find(s => s.phase === 'phase1'),
    [snapshots]
  );
  
  const phase2Snapshot = useMemo(() => 
    snapshots.find(s => s.phase === 'phase2'),
    [snapshots]
  );
  
  const correctedSnapshot = useMemo(() => 
    snapshots.find(s => s.phase === 'corrected'),
    [snapshots]
  );
  
  const classified = useMemo(() => classifyCheckResults(checkResults), [checkResults]);
  
  const handleEditPosition = (position: Position) => {
    setEditingPosition(position.id);
    setEditForm({
      name: position.name,
      requiredSkills: [...position.requiredSkills],
      requiredTraining: [...position.requiredTraining],
      capacity: position.capacity,
      timeSlot: position.timeSlot,
      notes: position.notes
    });
  };
  
  const handleSavePosition = async () => {
    if (!editingPosition) return;
    
    await updatePosition(editingPosition, editForm);
    setEditingPosition(null);
    setShowComparison(true);
  };
  
  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditForm({});
  };
  
  const toggleSkill = (skill: string) => {
    const currentSkills = editForm.requiredSkills || [];
    if (currentSkills.includes(skill as any)) {
      setEditForm({
        ...editForm,
        requiredSkills: currentSkills.filter(s => s !== skill)
      });
    } else {
      setEditForm({
        ...editForm,
        requiredSkills: [...currentSkills, skill as any]
      });
    }
  };
  
  const toggleTraining = (training: string) => {
    const currentTraining = editForm.requiredTraining || [];
    if (currentTraining.includes(training as any)) {
      setEditForm({
        ...editForm,
        requiredTraining: currentTraining.filter(t => t !== training)
      });
    } else {
      setEditForm({
        ...editForm,
        requiredTraining: [...currentTraining, training as any]
      });
    }
  };
  
  const allSkills = ['检票', '引导', '安检', '票务', '后台', '应急'];
  const allTrainings = ['消防培训', '应急处理', '服务礼仪', '票务系统', '安检规范'];
  const allTimeSlots = ['18:00-20:00', '19:00-21:00', '20:00-22:00', '全天'];
  
  const compareSnapshots = (s1: any, s2: any) => {
    if (!s1 || !s2) return [];
    
    const changes: { field: string; before: any; after: any }[] = [];
    
    s1.positions.forEach((p1: Position) => {
      const p2 = s2.positions.find((p: Position) => p.id === p1.id);
      if (!p2) return;
      
      if (p1.capacity !== p2.capacity) {
        changes.push({ field: `${p1.name} - 容量`, before: p1.capacity, after: p2.capacity });
      }
      if (JSON.stringify(p1.requiredSkills) !== JSON.stringify(p2.requiredSkills)) {
        changes.push({ field: `${p1.name} - 技能要求`, before: p1.requiredSkills.join(', '), after: p2.requiredSkills.join(', ') });
      }
      if (JSON.stringify(p1.requiredTraining) !== JSON.stringify(p2.requiredTraining)) {
        changes.push({ field: `${p1.name} - 培训要求`, before: p1.requiredTraining.join(', '), after: p2.requiredTraining.join(', ') });
      }
    });
    
    const s1Classified = classifyCheckResults(s1.checkResults);
    const s2Classified = classifyCheckResults(s2.checkResults);
    
    changes.push({ 
      field: '正常样本数', 
      before: s1Classified.normal.length, 
      after: s2Classified.normal.length 
    });
    changes.push({ 
      field: '边界样本数', 
      before: s1Classified.boundary.length, 
      after: s2Classified.boundary.length 
    });
    changes.push({ 
      field: '异常样本数', 
      before: s1Classified.bad.length, 
      after: s2Classified.bad.length 
    });
    
    return changes;
  };
  
  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Edit3 className="w-12 h-12 text-navy-400 mx-auto mb-4" />
          <p className="text-navy-600 mb-2">暂无数据</p>
          <p className="text-sm text-navy-500">请先在「数据导入」页面导入数据</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            手动修正
          </h1>
          <p className="text-navy-500 mt-1">
            调整入口岗位要求，系统自动重新计算并对比结果
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase2Snapshot && correctedSnapshot && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`btn ${showComparison ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {showComparison ? '隐藏对比' : '显示对比'}
            </button>
          )}
        </div>
      </div>
      
      {showComparison && phase2Snapshot && correctedSnapshot && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-navy-600" />
            修正前后对比
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PhaseBadge phase="phase2" />
                  <span className="text-sm text-navy-500">修正前</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-forest-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-forest-600">
                      {classifyCheckResults(phase2Snapshot.checkResults).normal.length}
                    </p>
                    <p className="text-xs text-forest-700">正常</p>
                  </div>
                  <div className="bg-amber-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {classifyCheckResults(phase2Snapshot.checkResults).boundary.length}
                    </p>
                    <p className="text-xs text-amber-700">边界</p>
                  </div>
                  <div className="bg-wine-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-wine-600">
                      {classifyCheckResults(phase2Snapshot.checkResults).bad.length}
                    </p>
                    <p className="text-xs text-wine-700">异常</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <PhaseBadge phase="corrected" />
                  <span className="text-sm text-navy-500">修正后</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-forest-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-forest-600">
                      {classifyCheckResults(correctedSnapshot.checkResults).normal.length}
                    </p>
                    <p className="text-xs text-forest-700">正常</p>
                  </div>
                  <div className="bg-amber-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {classifyCheckResults(correctedSnapshot.checkResults).boundary.length}
                    </p>
                    <p className="text-xs text-amber-700">边界</p>
                  </div>
                  <div className="bg-wine-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-wine-600">
                      {classifyCheckResults(correctedSnapshot.checkResults).bad.length}
                    </p>
                    <p className="text-xs text-wine-700">异常</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-navy-700 mb-2">具体变化:</p>
              {compareSnapshots(phase2Snapshot, correctedSnapshot).map((change, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-navy-50 rounded">
                  <span className="text-sm text-navy-600">{change.field}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-wine-600">{change.before}</span>
                    <ChevronRight className="w-4 h-4 text-navy-400" />
                    <span className="text-sm text-forest-600 font-medium">{change.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          入口岗位列表
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {positions.map((position) => {
              const isEditing = editingPosition === position.id;
              const assignedCount = checkResults.filter(
                r => r.position.id === position.id && r.assignment.status === 'assigned'
              ).length;
              
              return (
                <div 
                  key={position.id} 
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isEditing ? 'border-navy-500 ring-2 ring-navy-100' : 'border-navy-200'
                  }`}
                >
                  <div className="p-4 bg-navy-50 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-navy-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="input w-64"
                            />
                          ) : (
                            position.name
                          )}
                        </h3>
                        <span className="badge bg-navy-100 text-navy-700">
                          {assignedCount}/{position.capacity} 人
                        </span>
                        <span className="badge bg-navy-100 text-navy-700">
                          <Clock className="w-3 h-3 mr-1" />
                          {isEditing ? (
                            <select
                              value={editForm.timeSlot || position.timeSlot}
                              onChange={(e) => setEditForm({ ...editForm, timeSlot: e.target.value as any })}
                              className="bg-transparent border-none text-sm"
                            >
                              {allTimeSlots.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          ) : (
                            position.timeSlot
                          )}
                        </span>
                      </div>
                      {position.notes && (
                        <p className="text-sm text-navy-500">{position.notes}</p>
                      )}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => handleEditPosition(position)}
                        className="btn btn-secondary flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-navy-700 mb-2">技能要求</p>
                      <div className="flex flex-wrap gap-2">
                        {allSkills.map((skill) => {
                          const isSelected = isEditing
                            ? (editForm.requiredSkills || []).includes(skill as any)
                            : position.requiredSkills.includes(skill as any);
                          
                          return (
                            <button
                              key={skill}
                              onClick={() => isEditing && toggleSkill(skill)}
                              disabled={!isEditing}
                              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                                isSelected
                                  ? 'bg-navy-800 text-white'
                                  : isEditing
                                    ? 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                                    : 'bg-navy-50 text-navy-400'
                              }`}
                            >
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-navy-700 mb-2">培训要求</p>
                      <div className="flex flex-wrap gap-2">
                        {allTrainings.map((training) => {
                          const isSelected = isEditing
                            ? (editForm.requiredTraining || []).includes(training as any)
                            : position.requiredTraining.includes(training as any);
                          
                          return (
                            <button
                              key={training}
                              onClick={() => isEditing && toggleTraining(training)}
                              disabled={!isEditing}
                              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                                isSelected
                                  ? 'bg-wine-600 text-white'
                                  : isEditing
                                    ? 'bg-wine-50 text-wine-600 hover:bg-wine-100'
                                    : 'bg-navy-50 text-navy-400'
                              }`}
                            >
                              {training}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-navy-700 mb-2">岗位容量</p>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={editForm.capacity || position.capacity}
                          onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) })}
                          className="input w-24"
                        />
                      ) : (
                        <span className="text-lg font-bold text-navy-700">{position.capacity}</span>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="p-4 bg-navy-50 border-t border-navy-200 flex items-center justify-end gap-3">
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSavePosition}
                        disabled={isLoading}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        保存并重新计算
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          当前检查结果
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-forest-50 rounded p-4 text-center">
              <CheckCircle className="w-8 h-8 text-forest-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-forest-600">{classified.normal.length}</p>
              <p className="text-sm text-forest-700">正常样本</p>
            </div>
            <div className="bg-amber-50 rounded p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-600">{classified.boundary.length}</p>
              <p className="text-sm text-amber-700">边界样本</p>
            </div>
            <div className="bg-wine-50 rounded p-4 text-center">
              <XCircle className="w-8 h-8 text-wine-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-wine-600">{classified.bad.length}</p>
              <p className="text-sm text-wine-700">异常样本</p>
            </div>
          </div>
          
          {classified.bad.length > 0 && (
            <div>
              <p className="text-sm font-medium text-navy-700 mb-3">需要处理的异常项:</p>
              <div className="space-y-2">
                {classified.bad.slice(0, 5).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-wine-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy-800">{result.volunteer.name}</span>
                      <span className="text-navy-500">→</span>
                      <span className="text-navy-600">{result.position.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AssignmentStatusBadge status={result.assignment.status} />
                      <SampleTypeBadge type={result.sampleType} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
