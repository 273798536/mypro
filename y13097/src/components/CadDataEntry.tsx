import { useState } from 'react';
import type { Corridor, CollisionObject, Point, ObjectType, LayerType } from '../types';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, Save, X, MapPin } from 'lucide-react';

const OBJECT_TYPE_OPTIONS: { value: ObjectType; label: string }[] = [
  { value: 'building', label: '建筑物' },
  { value: 'tower', label: '塔类' },
  { value: 'mountain', label: '山体' },
  { value: 'power_line', label: '电力线' },
  { value: 'other', label: '其他' },
];

const TYPE_TO_LAYER: Record<ObjectType, LayerType> = {
  building: 'buildings',
  tower: 'towers',
  mountain: 'mountains',
  power_line: 'power_lines',
  other: 'annotations',
};

interface CadDataEntryProps {
  selectedCorridorId: string | null;
  onSelectCorridor: (id: string) => void;
}

export default function CadDataEntry({ selectedCorridorId, onSelectCorridor }: CadDataEntryProps) {
  const { state, dispatch, generateId } = useApp();
  const [activeTab, setActiveTab] = useState<'corridor' | 'object'>('corridor');
  const [editingCorridor, setEditingCorridor] = useState<Corridor | null>(null);
  const [editingObject, setEditingObject] = useState<CollisionObject | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const selectedCorridor = state.corridors.find((c) => c.id === selectedCorridorId);
  const corridorObjects = state.objects.filter(
    (o) => selectedCorridor && o.sourceAttachmentId === selectedCorridor.sourceAttachmentId
  );

  function startAddCorridor() {
    const newCorridor: Corridor = {
      id: generateId('corridor'),
      name: '',
      waypoints: [
        { x: 100, y: 200 },
        { x: 700, y: 200 },
      ],
      width: 60,
      minAltitude: 100,
      maxAltitude: 300,
      sourceAttachmentId: '',
    };
    setEditingCorridor(newCorridor);
    setIsAdding(true);
  }

  function startEditCorridor(corridor: Corridor) {
    setEditingCorridor({ ...corridor });
    setIsAdding(false);
  }

  function saveCorridor() {
    if (!editingCorridor) return;
    if (!editingCorridor.name.trim()) {
      alert('请输入航线名称');
      return;
    }
    if (!editingCorridor.sourceAttachmentId) {
      alert('请选择来源附件（先在材料附件中录入）');
      return;
    }
    if (isAdding) {
      dispatch({ type: 'ADD_CORRIDOR', payload: editingCorridor });
    } else {
      dispatch({ type: 'UPDATE_CORRIDOR', payload: editingCorridor });
    }
    onSelectCorridor(editingCorridor.id);
    setEditingCorridor(null);
    setIsAdding(false);
  }

  function deleteCorridor(corridor: Corridor) {
    if (confirm(`确定删除航线 "${corridor.name}" 吗？`)) {
      dispatch({ type: 'DELETE_CORRIDOR', payload: corridor.id });
    }
  }

  function startAddObject() {
    if (!selectedCorridorId) {
      alert('请先选择一个航线');
      return;
    }
    const corr = state.corridors.find((c) => c.id === selectedCorridorId);
    const newObject: CollisionObject = {
      id: generateId('obj'),
      name: '',
      type: 'building',
      layer: 'buildings',
      position: { x: 400, y: 200 },
      width: 20,
      height: 20,
      altitude: 150,
      sourceAttachmentId: corr?.sourceAttachmentId || '',
      isAbnormal: false,
    };
    setEditingObject(newObject);
    setIsAdding(true);
  }

  function startEditObject(obj: CollisionObject) {
    setEditingObject({ ...obj });
    setIsAdding(false);
  }

  function saveObject() {
    if (!editingObject) return;
    if (!editingObject.name.trim()) {
      alert('请输入对象名称');
      return;
    }
    if (!editingObject.sourceAttachmentId) {
      alert('请选择来源附件');
      return;
    }
    editingObject.layer = TYPE_TO_LAYER[editingObject.type];

    if (isAdding) {
      dispatch({ type: 'ADD_OBJECT', payload: editingObject });
    } else {
      dispatch({ type: 'UPDATE_OBJECT', payload: editingObject });
    }
    setEditingObject(null);
    setIsAdding(false);
  }

  function deleteObject(obj: CollisionObject) {
    if (confirm(`确定删除对象 "${obj.name}" 吗？`)) {
      dispatch({ type: 'DELETE_OBJECT', payload: obj.id });
    }
  }

  function updateWaypoint(index: number, field: 'x' | 'y', value: string) {
    if (!editingCorridor) return;
    const numValue = parseFloat(value) || 0;
    const newWaypoints = [...editingCorridor.waypoints];
    newWaypoints[index] = { ...newWaypoints[index], [field]: numValue };
    setEditingCorridor({ ...editingCorridor, waypoints: newWaypoints });
  }

  function addWaypoint() {
    if (!editingCorridor) return;
    const lastPoint = editingCorridor.waypoints[editingCorridor.waypoints.length - 1];
    const newPoint: Point = { x: lastPoint.x + 100, y: lastPoint.y };
    setEditingCorridor({
      ...editingCorridor,
      waypoints: [...editingCorridor.waypoints, newPoint],
    });
  }

  function removeWaypoint(index: number) {
    if (!editingCorridor || editingCorridor.waypoints.length <= 2) {
      alert('至少需要2个航点');
      return;
    }
    const newWaypoints = editingCorridor.waypoints.filter((_, i) => i !== index);
    setEditingCorridor({ ...editingCorridor, waypoints: newWaypoints });
  }

  return (
    <div className="cad-data-entry">
      <div className="panel-header">
        <MapPin size={18} />
        <h3>CAD图层录入</h3>
      </div>

      <div className="entry-tabs">
        <button
          className={`entry-tab ${activeTab === 'corridor' ? 'active' : ''}`}
          onClick={() => setActiveTab('corridor')}
        >
          航线走廊 ({state.corridors.length})
        </button>
        <button
          className={`entry-tab ${activeTab === 'object' ? 'active' : ''}`}
          onClick={() => setActiveTab('object')}
        >
          障碍物 ({state.objects.length})
        </button>
      </div>

      <div className="entry-content">
        {activeTab === 'corridor' && (
          <div>
            <div className="entry-actions">
              <button className="btn-primary" onClick={startAddCorridor}>
                <Plus size={14} />
                添加航线
              </button>
            </div>

            <div className="corridor-list">
              {state.corridors.map((corr) => (
                <div
                  key={corr.id}
                  className={`corridor-item ${corr.id === selectedCorridorId ? 'selected' : ''}`}
                  onClick={() => onSelectCorridor(corr.id)}
                >
                  <div className="corridor-info">
                    <div className="corridor-name">{corr.name}</div>
                    <div className="corridor-meta">
                      宽度 {corr.width}m · 高度 {corr.minAltitude}-{corr.maxAltitude}m · {corr.waypoints.length}个航点
                    </div>
                  </div>
                  <div className="corridor-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditCorridor(corr);
                      }}
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCorridor(corr);
                      }}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {state.corridors.length === 0 && (
                <div className="empty-entry">
                  <MapPin size={24} color="#ccc" />
                  <p>暂无航线，点击上方按钮添加</p>
                </div>
              )}
            </div>

            {editingCorridor && (
              <div className="edit-form">
                <h4>{isAdding ? '添加航线走廊' : '编辑航线走廊'}</h4>

                <div className="form-group">
                  <label>航线名称 *</label>
                  <input
                    type="text"
                    value={editingCorridor.name}
                    onChange={(e) =>
                      setEditingCorridor({ ...editingCorridor, name: e.target.value })
                    }
                    placeholder="如：东区货运航线 A-1"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>走廊宽度 (m)</label>
                    <input
                      type="number"
                      value={editingCorridor.width}
                      onChange={(e) =>
                        setEditingCorridor({
                          ...editingCorridor,
                          width: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>最低高度 (m)</label>
                    <input
                      type="number"
                      value={editingCorridor.minAltitude}
                      onChange={(e) =>
                        setEditingCorridor({
                          ...editingCorridor,
                          minAltitude: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>最高高度 (m)</label>
                    <input
                      type="number"
                      value={editingCorridor.maxAltitude}
                      onChange={(e) =>
                        setEditingCorridor({
                          ...editingCorridor,
                          maxAltitude: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>来源附件 *</label>
                  <select
                    value={editingCorridor.sourceAttachmentId}
                    onChange={(e) =>
                      setEditingCorridor({
                        ...editingCorridor,
                        sourceAttachmentId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- 请选择附件 --</option>
                    {state.attachments.map((att) => (
                      <option key={att.id} value={att.id}>
                        {att.name}
                      </option>
                    ))}
                  </select>
                  {state.attachments.length === 0 && (
                    <div className="form-hint">请先在「材料附件」中录入附件</div>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    航点坐标
                    <button type="button" className="btn-small" onClick={addWaypoint}>
                      <Plus size={12} /> 添加航点
                    </button>
                  </label>
                  <div className="waypoints-list">
                    {editingCorridor.waypoints.map((wp, idx) => (
                      <div key={idx} className="waypoint-row">
                        <span className="waypoint-index">{idx + 1}</span>
                        <input
                          type="number"
                          placeholder="X"
                          value={wp.x}
                          onChange={(e) => updateWaypoint(idx, 'x', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Y"
                          value={wp.y}
                          onChange={(e) => updateWaypoint(idx, 'y', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-danger-small"
                          onClick={() => removeWaypoint(idx)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={saveCorridor}>
                    <Save size={14} />
                    {isAdding ? '添加' : '保存'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingCorridor(null);
                      setIsAdding(false);
                    }}
                  >
                    <X size={14} />
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'object' && (
          <div>
            <div className="entry-actions">
              <button className="btn-primary" onClick={startAddObject}>
                <Plus size={14} />
                添加障碍物
              </button>
            </div>

            <div className="object-list">
              {(selectedCorridor ? corridorObjects : state.objects).map((obj) => (
                <div key={obj.id} className="object-item">
                  <div className="object-info">
                    <div className="object-name">
                      {obj.name}
                      {obj.isAbnormal && <span className="abnormal-tag">异常</span>}
                    </div>
                    <div className="object-meta">
                      {OBJECT_TYPE_OPTIONS.find((o) => o.value === obj.type)?.label} · 标高 {obj.altitude}m · 位置 ({obj.position.x}, {obj.position.y})
                    </div>
                  </div>
                  <div className="object-actions">
                    <button onClick={() => startEditObject(obj)} title="编辑">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteObject(obj)} title="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {state.objects.length === 0 && (
                <div className="empty-entry">
                  <MapPin size={24} color="#ccc" />
                  <p>暂无障碍物，点击上方按钮添加</p>
                </div>
              )}
            </div>

            {editingObject && (
              <div className="edit-form">
                <h4>{isAdding ? '添加障碍物' : '编辑障碍物'}</h4>

                <div className="form-group">
                  <label>对象名称 *</label>
                  <input
                    type="text"
                    value={editingObject.name}
                    onChange={(e) =>
                      setEditingObject({ ...editingObject, name: e.target.value })
                    }
                    placeholder="如：信号塔 #T-12"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>对象类型</label>
                    <select
                      value={editingObject.type}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          type: e.target.value as ObjectType,
                        })
                      }
                    >
                      {OBJECT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>标高 (m)</label>
                    <input
                      type="number"
                      value={editingObject.altitude}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          altitude: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>位置 X</label>
                    <input
                      type="number"
                      value={editingObject.position.x}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          position: {
                            ...editingObject.position,
                            x: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>位置 Y</label>
                    <input
                      type="number"
                      value={editingObject.position.y}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          position: {
                            ...editingObject.position,
                            y: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>宽度 (m)</label>
                    <input
                      type="number"
                      value={editingObject.width}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          width: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>高度 (m)</label>
                    <input
                      type="number"
                      value={editingObject.height}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>来源附件 *</label>
                  <select
                    value={editingObject.sourceAttachmentId}
                    onChange={(e) =>
                      setEditingObject({
                        ...editingObject,
                        sourceAttachmentId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- 请选择附件 --</option>
                    {state.attachments.map((att) => (
                      <option key={att.id} value={att.id}>
                        {att.name}
                        {att.isLateArrival && ' (晚到)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingObject.isAbnormal}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          isAbnormal: e.target.checked,
                        })
                      }
                    />
                    标记为异常
                  </label>
                  {editingObject.isAbnormal && (
                    <input
                      type="text"
                      placeholder="异常原因说明"
                      value={editingObject.abnormalReason || ''}
                      onChange={(e) =>
                        setEditingObject({
                          ...editingObject,
                          abnormalReason: e.target.value,
                        })
                      }
                    />
                  )}
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={saveObject}>
                    <Save size={14} />
                    {isAdding ? '添加' : '保存'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingObject(null);
                      setIsAdding(false);
                    }}
                  >
                    <X size={14} />
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
