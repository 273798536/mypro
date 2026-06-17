import { useState, useMemo, useEffect } from 'react';
import { Plus, History, AlertTriangle, CheckCircle, Clock, User, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getUnitDisplayName } from '../utils/unitConverter';
import { checkUnitConsistency } from '../utils/extremeValueDetector';

export function MaintenanceNotesPanel() {
  const {
    objects,
    notes,
    abnormalRecords,
    selectedObjectId,
    selectedNoteId,
    timeRange,
    selectNote,
    addNote,
    calculateReverb,
    confirmAbnormal,
    parameterSets,
    selectedParamSetIds
  } = useAppStore();

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNoteId) {
      setExpandedNoteId(selectedNoteId);
    }
  }, [selectedNoteId]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState({
    content: '',
    rawValue: '',
    recorder: '小林'
  });

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedObjectId) {
      result = notes.filter(n => n.objectId === selectedObjectId);
    }
    result = result.filter(n => {
      const t = new Date(n.timestamp).getTime();
      return t >= timeRange.start && t <= timeRange.end;
    });
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notes, selectedObjectId, timeRange]);

  const selectedObject = objects.find(o => o.id === selectedObjectId);

  const handleAddNote = () => {
    if (!selectedObjectId || !newNote.content || !newNote.rawValue) return;
    
    const note = addNote({
      objectId: selectedObjectId,
      content: newNote.content,
      rawValue: newNote.rawValue,
      unit: '',
      convertedValue: 0,
      recorder: newNote.recorder,
      parentId: undefined
    });

    setNewNote({ content: '', rawValue: '', recorder: '小林' });
    setShowAddForm(false);
  };

  const handleCalculate = (noteId: string) => {
    const paramSetId = selectedParamSetIds[0] || parameterSets[0]?.id;
    if (!paramSetId) return;
    calculateReverb(noteId, paramSetId);
  };

  const getNoteAbnormalRecord = (noteId: string) => {
    return abnormalRecords.find(r => r.noteId === noteId);
  };

  const getNoteParent = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note?.parentId) {
      return notes.find(n => n.id === note.parentId);
    }
    return null;
  };

  const getNoteVersions = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    return notes
      .filter(n => n.objectId === note.objectId)
      .sort((a, b) => a.version - b.version);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAbnormalTypeLabel = (type: string) => {
    switch (type) {
      case 'extreme_value': return '极端值';
      case 'unit_mismatch': return '单位不匹配';
      case 'noise': return '噪声干扰';
      default: return '异常';
    }
  };

  const getAbnormalTypeColor = (type: string) => {
    switch (type) {
      case 'extreme_value': return 'bg-lab-error/20 text-lab-error border-lab-error/50';
      case 'unit_mismatch': return 'bg-lab-warning/20 text-lab-warning border-lab-warning/50';
      case 'noise': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="h-full flex flex-col bg-lab-panel border-r border-lab-border">
      <div className="p-4 border-b border-lab-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">维修备注</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={!selectedObjectId}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedObjectId
                ? 'bg-lab-accent hover:bg-lab-accent-dark text-white'
                : 'bg-lab-border text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={16} />
            新增
          </button>
        </div>
        
        {selectedObject ? (
          <div className="text-sm text-gray-400">
            当前对象: <span className="text-lab-accent font-medium">{selectedObject.name}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">
            请在 3D 场景中点击选择对象
          </div>
        )}
      </div>

      {showAddForm && selectedObjectId && (
        <div className="p-4 border-b border-lab-border bg-lab-bg/50">
          <h3 className="text-sm font-medium text-white mb-3">新增维修备注</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">备注内容</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded-lg text-white text-sm focus:outline-none focus:border-lab-accent resize-none h-20"
                placeholder="请输入维修备注内容..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">测量值（带单位）</label>
              <input
                type="text"
                value={newNote.rawValue}
                onChange={(e) => setNewNote({ ...newNote, rawValue: e.target.value })}
                className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded-lg text-white text-sm focus:outline-none focus:border-lab-accent font-mono"
                placeholder="例如: 2.5 m² 或 1.8 s"
              />
              <p className="text-xs text-gray-500 mt-1">支持单位: s, ms, m², cm², m³, L, °C, % 等</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">记录人</label>
              <input
                type="text"
                value={newNote.recorder}
                onChange={(e) => setNewNote({ ...newNote, recorder: e.target.value })}
                className="w-full px-3 py-2 bg-lab-bg border border-lab-border rounded-lg text-white text-sm focus:outline-none focus:border-lab-accent"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddNote}
                className="flex-1 px-4 py-2 bg-lab-accent hover:bg-lab-accent-dark text-white rounded-lg text-sm font-medium transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-lab-border hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {filteredNotes.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            {selectedObjectId ? '该对象暂无维修备注' : '请选择对象查看备注'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotes.map((note) => {
              const abnormal = getNoteAbnormalRecord(note.id);
              const parent = getNoteParent(note.id);
              const versions = getNoteVersions(note.id);
              const unitConsistency = checkUnitConsistency(note, notes);
              const object = objects.find(o => o.id === note.objectId);

              return (
                <div
                key={note.id}
                className={`rounded-lg border transition-all ${
                  note.id === selectedNoteId
                    ? 'border-lab-accent bg-lab-accent/10 shadow-lg shadow-lab-accent/20'
                    : abnormal && !abnormal.confirmed
                      ? 'border-lab-warning border-glow bg-lab-bg/80'
                      : 'border-lab-border bg-lab-bg/50 hover:border-lab-accent/50'
                }`}
              >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => {
                      const newExpanded = expandedNoteId === note.id ? null : note.id;
                      setExpandedNoteId(newExpanded);
                      if (newExpanded) {
                        selectNote(note.id);
                      } else {
                        selectNote(null);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {object && (
                            <span className="text-xs px-2 py-0.5 bg-lab-border rounded text-gray-300">
                              {object.name}
                            </span>
                          )}
                          {note.version > 1 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                              <History size={10} />
                              v{note.version}
                            </span>
                          )}
                          {abnormal && (
                            <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${getAbnormalTypeColor(abnormal.type)}`}>
                              <AlertTriangle size={10} />
                              {getAbnormalTypeLabel(abnormal.type)}
                              {abnormal.confirmed && <CheckCircle size={10} />}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white line-clamp-2">{note.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(note.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {note.recorder}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-lab-accent">
                            <Tag size={12} />
                            {note.convertedValue.toFixed(4)} {getUnitDisplayName(note.unit)}
                          </span>
                        </div>
                        {!unitConsistency.consistent && unitConsistency.suggestion && (
                          <p className="text-xs text-lab-warning mt-2 flex items-start gap-1">
                            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                            {unitConsistency.suggestion}
                          </p>
                        )}
                      </div>
                      {expandedNoteId === note.id ? (
                        <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {expandedNoteId === note.id && (
                    <div className="px-3 pb-3 border-t border-lab-border/50 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-lab-bg p-2 rounded">
                          <span className="text-gray-500">原始值</span>
                          <p className="text-white font-mono">{note.rawValue}</p>
                        </div>
                        <div className="bg-lab-bg p-2 rounded">
                          <span className="text-gray-500">换算后</span>
                          <p className="text-lab-accent font-mono">
                            {note.convertedValue.toFixed(6)} {getUnitDisplayName(note.unit)}
                          </p>
                        </div>
                      </div>

                      {parent && (
                        <div className="text-xs bg-blue-500/10 border border-blue-500/30 rounded p-2">
                          <span className="text-blue-400">基于版本 v{parent.version}:</span>
                          <p className="text-gray-300 mt-1">{parent.content}</p>
                        </div>
                      )}

                      {versions.length > 1 && (
                        <div>
                          <span className="text-xs text-gray-400">历史版本</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {versions.map((v) => (
                              <span
                                key={v.id}
                                className={`text-xs px-2 py-1 rounded ${
                                  v.id === note.id
                                    ? 'bg-lab-accent text-white'
                                    : 'bg-lab-border text-gray-400'
                                }`}
                              >
                                v{v.version}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {abnormal && (
                        <div className={`border rounded p-3 ${getAbnormalTypeColor(abnormal.type)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} />
                            <span className="font-medium">{getAbnormalTypeLabel(abnormal.type)}检测</span>
                          </div>
                          <p className="text-xs mb-2 opacity-90">{abnormal.reason}</p>
                          <div className="mb-2">
                            <span className="text-xs opacity-70">影响范围:</span>
                            <ul className="text-xs mt-1 space-y-0.5 opacity-90">
                              {abnormal.impactScope.map((scope, i) => (
                                <li key={i}>• {scope}</li>
                              ))}
                            </ul>
                          </div>
                          {!abnormal.confirmed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmAbnormal(abnormal.id, '负责人');
                              }}
                              className="w-full px-3 py-1.5 bg-lab-warning hover:bg-lab-warning-dark text-white rounded text-xs font-medium transition-colors"
                            >
                              确认异常，继续计算
                            </button>
                          )}
                          {abnormal.confirmed && (
                            <div className="flex items-center gap-1 text-xs opacity-90">
                              <CheckCircle size={12} />
                              已由 {abnormal.confirmer} 确认于 {formatDate(abnormal.confirmedAt!)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCalculate(note.id);
                          }}
                          disabled={abnormal && !abnormal.confirmed}
                          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                            abnormal && !abnormal.confirmed
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-lab-accent hover:bg-lab-accent-dark text-white'
                          }`}
                        >
                          执行复算
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
