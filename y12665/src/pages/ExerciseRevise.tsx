import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useExerciseStore } from '@/store/useExerciseStore';
import { ChevronRight, Plus, Trash2, Save, X } from 'lucide-react';
import type { Exercise, Keyframe, DeviceCoordinate } from '../../shared/types';

function generateId(): string {
  return crypto.randomUUID();
}

function isDifferent<T>(a: T, b: T): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function DiffOldValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="line-through text-red-reject bg-red-reject/10 px-1 rounded">
      {children}
    </span>
  );
}

function DiffNewValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="underline decoration-green-pass decoration-2 text-green-pass bg-green-pass/10 px-1 rounded">
      {children}
    </span>
  );
}

export default function ExerciseRevise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentExercise, loading, error, fetchExercise, updateExercise } = useExerciseStore();

  const [name, setName] = useState('');
  const [status, setStatus] = useState<Exercise['status']>('draft');
  const [timelineStartMs, setTimelineStartMs] = useState(0);
  const [timelineEndMs, setTimelineEndMs] = useState(0);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [coordinates, setCoordinates] = useState<DeviceCoordinate[]>([]);
  const [conclusion, setConclusion] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchExercise(id);
  }, [id, fetchExercise]);

  useEffect(() => {
    if (currentExercise) {
      setName(currentExercise.name);
      setStatus(currentExercise.status);
      setTimelineStartMs(currentExercise.timelineStartMs);
      setTimelineEndMs(currentExercise.timelineEndMs);
      setKeyframes(JSON.parse(JSON.stringify(currentExercise.keyframes)));
      setCoordinates(JSON.parse(JSON.stringify(currentExercise.coordinates)));
      setConclusion(currentExercise.conclusion);
    }
  }, [currentExercise]);

  if (loading || !currentExercise) {
    return (
      <div className="min-h-screen bg-deep-space-900 flex items-center justify-center text-deep-space-300">
        加载中...
      </div>
    );
  }

  const ex = currentExercise;

  const nameChanged = isDifferent(name, ex.name);
  const statusChanged = isDifferent(status, ex.status);
  const timelineStartChanged = isDifferent(timelineStartMs, ex.timelineStartMs);
  const timelineEndChanged = isDifferent(timelineEndMs, ex.timelineEndMs);
  const keyframesChanged = isDifferent(keyframes, ex.keyframes);
  const coordinatesChanged = isDifferent(coordinates, ex.coordinates);
  const conclusionChanged = isDifferent(conclusion, ex.conclusion);

  const handleAddKeyframe = () => {
    setKeyframes([
      ...keyframes,
      { id: generateId(), timestampMs: 0, label: '新关键帧', params: {} },
    ]);
  };

  const handleRemoveKeyframe = (kfId: string) => {
    setKeyframes(keyframes.filter((k) => k.id !== kfId));
  };

  const handleUpdateKeyframe = (kfId: string, updates: Partial<Keyframe>) => {
    setKeyframes(
      keyframes.map((k) => (k.id === kfId ? { ...k, ...updates } : k)),
    );
  };

  const handleAddCoordinate = () => {
    setCoordinates([
      ...coordinates,
      { id: generateId(), label: '新坐标', x: 0, y: 0, z: 0, sourceRef: '' },
    ]);
  };

  const handleRemoveCoordinate = (coordId: string) => {
    setCoordinates(coordinates.filter((c) => c.id !== coordId));
  };

  const handleUpdateCoordinate = (coordId: string, updates: Partial<DeviceCoordinate>) => {
    setCoordinates(
      coordinates.map((c) => (c.id === coordId ? { ...c, ...updates } : c)),
    );
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const result = await updateExercise(id, {
        name,
        status,
        timelineStartMs,
        timelineEndMs,
        keyframes,
        coordinates,
        conclusion,
      });
      if (result) {
        navigate(`/exercises/${id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const FieldRow = ({
    label,
    changed,
    oldValue,
    children,
  }: {
    label: string;
    changed: boolean;
    oldValue: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div className={`grid grid-cols-2 gap-6 p-4 rounded-lg ${changed ? 'bg-ice-blue/5 border border-ice-blue/30' : ''}`}>
      <div>
        <div className="text-xs text-deep-space-400 mb-1">{label}（原值）</div>
        <div className="text-deep-space-200">
          {changed ? <DiffOldValue>{oldValue}</DiffOldValue> : oldValue}
        </div>
      </div>
      <div>
        <div className="text-xs text-deep-space-400 mb-1">{label}（新值）</div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-deep-space-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-deep-space-300 mb-6">
          <Link to="/exercises" className="hover:text-ice-blue transition-colors">
            练习记录
          </Link>
          <ChevronRight size={16} />
          <Link to={`/exercises/${id}`} className="hover:text-ice-blue transition-colors">
            {ex.name}
          </Link>
          <ChevronRight size={16} />
          <span className="text-ice-blue">修正记录</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">修正记录</h1>
            <p className="text-deep-space-300 mt-2">修改字段后提交，系统将创建新版本</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-reject/20 border border-red-reject/50 rounded-lg text-red-reject">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <FieldRow label="名称" changed={nameChanged} oldValue={ex.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 bg-deep-space-800 border rounded-lg focus:outline-none focus:ring-1 ${
                nameChanged
                  ? 'border-green-pass/50 focus:border-green-pass focus:ring-green-pass/50 text-green-pass'
                  : 'border-deep-space-600 focus:border-ice-blue focus:ring-ice-blue/50 text-white'
              }`}
            />
          </FieldRow>

          <FieldRow label="状态" changed={statusChanged} oldValue={ex.status}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Exercise['status'])}
              className={`w-full px-4 py-2 bg-deep-space-800 border rounded-lg focus:outline-none focus:ring-1 ${
                statusChanged
                  ? 'border-green-pass/50 focus:border-green-pass focus:ring-green-pass/50 text-green-pass'
                  : 'border-deep-space-600 focus:border-ice-blue focus:ring-ice-blue/50 text-white'
              }`}
            >
              <option value="draft">草稿</option>
              <option value="reviewing">审核中</option>
              <option value="confirmed">已确认</option>
              <option value="archived">已归档</option>
            </select>
          </FieldRow>

          <div className={`p-4 rounded-lg ${timelineStartChanged || timelineEndChanged ? 'bg-ice-blue/5 border border-ice-blue/30' : ''}`}>
            <div className="grid grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-deep-space-400 mb-1">起始时间（原值）</div>
                  <div className="text-deep-space-200 font-mono">
                    {timelineStartChanged ? <DiffOldValue>{ex.timelineStartMs}ms</DiffOldValue> : `${ex.timelineStartMs}ms`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-deep-space-400 mb-1">结束时间（原值）</div>
                  <div className="text-deep-space-200 font-mono">
                    {timelineEndChanged ? <DiffOldValue>{ex.timelineEndMs}ms</DiffOldValue> : `${ex.timelineEndMs}ms`}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-deep-space-400 mb-1">起始时间（新值）</div>
                  <input
                    type="number"
                    value={timelineStartMs}
                    onChange={(e) => setTimelineStartMs(Number(e.target.value))}
                    className={`w-full px-4 py-2 bg-deep-space-800 border rounded-lg focus:outline-none focus:ring-1 font-mono ${
                      timelineStartChanged
                        ? 'border-green-pass/50 focus:border-green-pass focus:ring-green-pass/50 text-green-pass'
                        : 'border-deep-space-600 focus:border-ice-blue focus:ring-ice-blue/50 text-white'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-xs text-deep-space-400 mb-1">结束时间（新值）</div>
                  <input
                    type="number"
                    value={timelineEndMs}
                    onChange={(e) => setTimelineEndMs(Number(e.target.value))}
                    className={`w-full px-4 py-2 bg-deep-space-800 border rounded-lg focus:outline-none focus:ring-1 font-mono ${
                      timelineEndChanged
                        ? 'border-green-pass/50 focus:border-green-pass focus:ring-green-pass/50 text-green-pass'
                        : 'border-deep-space-600 focus:border-ice-blue focus:ring-ice-blue/50 text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${keyframesChanged ? 'bg-ice-blue/5 border border-ice-blue/30' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">
                关键帧
                {keyframesChanged && (
                  <span className="ml-2 text-xs bg-green-pass/20 text-green-pass px-2 py-0.5 rounded">已修改</span>
                )}
              </div>
              <button
                onClick={handleAddKeyframe}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-deep-space-700 border border-deep-space-500 rounded hover:bg-deep-space-600 transition-colors"
              >
                <Plus size={14} />
                添加
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs text-deep-space-400 mb-2">原值（共 {ex.keyframes.length} 个）</div>
                {ex.keyframes.length === 0 ? (
                  <div className="text-deep-space-400 text-sm py-2">无</div>
                ) : (
                  ex.keyframes.map((kf) => (
                    <div key={kf.id} className="bg-deep-space-800 rounded p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-ice-blue">{kf.timestampMs}ms</span>
                        <span>{kf.label}</span>
                      </div>
                      <div className="text-xs text-deep-space-300">
                        {Object.entries(kf.params).map(([k, v]) => (
                          <span key={k} className="mr-2">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-deep-space-400 mb-2">新值（共 {keyframes.length} 个）</div>
                {keyframes.length === 0 ? (
                  <div className="text-deep-space-400 text-sm py-2">无</div>
                ) : (
                  keyframes.map((kf) => (
                    <div key={kf.id} className="bg-deep-space-700 border border-deep-space-500 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          value={kf.timestampMs}
                          onChange={(e) =>
                            handleUpdateKeyframe(kf.id, { timestampMs: Number(e.target.value) })
                          }
                          className="w-24 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded font-mono text-sm"
                        />
                        <input
                          type="text"
                          value={kf.label}
                          onChange={(e) => handleUpdateKeyframe(kf.id, { label: e.target.value })}
                          className="flex-1 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoveKeyframe(kf.id)}
                          className="p-1 text-red-reject hover:bg-red-reject/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-deep-space-300">
                        {Object.keys(kf.params).length === 0
                          ? '无参数'
                          : Object.entries(kf.params).map(([k, v]) => (
                              <span key={k} className="mr-2">
                                {k}: {v}
                              </span>
                            ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${coordinatesChanged ? 'bg-ice-blue/5 border border-ice-blue/30' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">
                设备坐标
                {coordinatesChanged && (
                  <span className="ml-2 text-xs bg-green-pass/20 text-green-pass px-2 py-0.5 rounded">已修改</span>
                )}
              </div>
              <button
                onClick={handleAddCoordinate}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-deep-space-700 border border-deep-space-500 rounded hover:bg-deep-space-600 transition-colors"
              >
                <Plus size={14} />
                添加
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs text-deep-space-400 mb-2">原值（共 {ex.coordinates.length} 个）</div>
                {ex.coordinates.length === 0 ? (
                  <div className="text-deep-space-400 text-sm py-2">无</div>
                ) : (
                  ex.coordinates.map((coord) => (
                    <div key={coord.id} className="bg-deep-space-800 rounded p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span>{coord.label}</span>
                        {coord.sourceRef && <span className="text-xs text-deep-space-300">{coord.sourceRef}</span>}
                      </div>
                      <div className="font-mono text-xs text-ice-blue">
                        X:{coord.x} Y:{coord.y} Z:{coord.z}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs text-deep-space-400 mb-2">新值（共 {coordinates.length} 个）</div>
                {coordinates.length === 0 ? (
                  <div className="text-deep-space-400 text-sm py-2">无</div>
                ) : (
                  coordinates.map((coord) => (
                    <div key={coord.id} className="bg-deep-space-700 border border-deep-space-500 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={coord.label}
                          onChange={(e) => handleUpdateCoordinate(coord.id, { label: e.target.value })}
                          className="flex-1 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoveCoordinate(coord.id)}
                          className="p-1 text-red-reject hover:bg-red-reject/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="X"
                          value={coord.x}
                          onChange={(e) => handleUpdateCoordinate(coord.id, { x: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded font-mono text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Y"
                          value={coord.y}
                          onChange={(e) => handleUpdateCoordinate(coord.id, { y: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded font-mono text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Z"
                          value={coord.z}
                          onChange={(e) => handleUpdateCoordinate(coord.id, { z: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded font-mono text-sm"
                        />
                        <input
                          type="text"
                          placeholder="源引用"
                          value={coord.sourceRef}
                          onChange={(e) => handleUpdateCoordinate(coord.id, { sourceRef: e.target.value })}
                          className="flex-1 px-2 py-1 bg-deep-space-800 border border-deep-space-600 rounded text-xs"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <FieldRow label="结论" changed={conclusionChanged} oldValue={ex.conclusion || '（空）'}>
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 bg-deep-space-800 border rounded-lg focus:outline-none focus:ring-1 resize-none ${
                conclusionChanged
                  ? 'border-green-pass/50 focus:border-green-pass focus:ring-green-pass/50 text-green-pass'
                  : 'border-deep-space-600 focus:border-ice-blue focus:ring-ice-blue/50 text-white'
              }`}
            />
          </FieldRow>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">修改摘要</label>
          <textarea
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            rows={2}
            placeholder="请简要描述本次修改内容..."
            className="w-full px-4 py-2 bg-deep-space-800 border border-deep-space-600 rounded-lg focus:outline-none focus:border-ice-blue focus:ring-1 focus:ring-ice-blue/50 text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-4 pb-8">
          <button
            onClick={() => navigate(`/exercises/${id}`)}
            className="flex items-center gap-2 px-6 py-2 bg-deep-space-700 border border-deep-space-500 rounded-lg hover:bg-deep-space-600 transition-colors"
          >
            <X size={18} />
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-ice-blue text-deep-space-900 rounded-lg hover:bg-ice-blue-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {submitting ? '提交中...' : '提交修正'}
          </button>
        </div>
      </div>
    </div>
  );
}
