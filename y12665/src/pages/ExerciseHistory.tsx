import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useExerciseStore } from '@/store/useExerciseStore';
import { ChevronRight, RotateCcw, GitCompare, X, CheckCircle } from 'lucide-react';
import type { ExerciseVersion } from '../../shared/types';

function isDifferent(a: unknown, b: unknown): boolean {
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

export default function ExerciseHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentExercise,
    versions,
    loading,
    error,
    fetchExercise,
    fetchVersions,
    rollbackVersion,
  } = useExerciseStore();

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionId1, setCompareVersionId1] = useState<string | null>(null);
  const [compareVersionId2, setCompareVersionId2] = useState<string | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<ExerciseVersion | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExercise(id);
      fetchVersions(id);
    }
  }, [id, fetchExercise, fetchVersions]);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || null;
  const compareV1 = versions.find((v) => v.id === compareVersionId1) || null;
  const compareV2 = versions.find((v) => v.id === compareVersionId2) || null;
  const latestVersion = versions.length > 0 ? versions[0] : null;

  const handleSelectVersion = (vId: string) => {
    if (compareMode) {
      if (!compareVersionId1) {
        setCompareVersionId1(vId);
      } else if (!compareVersionId2 && vId !== compareVersionId1) {
        setCompareVersionId2(vId);
      } else {
        setCompareVersionId1(vId);
        setCompareVersionId2(null);
      }
    } else {
      setSelectedVersionId(vId);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget || !id) return;
    setRollingBack(true);
    try {
      const result = await rollbackVersion(id, rollbackTarget.id);
      if (result) {
        setShowRollbackConfirm(false);
        setRollbackTarget(null);
        await fetchVersions(id);
        await fetchExercise(id);
      }
    } finally {
      setRollingBack(false);
    }
  };

  const renderFieldDiff = (
    label: string,
    oldVal: unknown,
    newVal: unknown,
    changed: boolean,
  ) => (
    <div className={`p-4 rounded-lg ${changed ? 'bg-ice-blue/5 border border-ice-blue/30' : ''}`}>
      <div className="text-xs text-deep-space-400 mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-deep-space-400 text-xs mr-2">旧:</span>
          {changed ? (
            <DiffOldValue>{String(oldVal ?? '（空）')}</DiffOldValue>
          ) : (
            <span className="text-deep-space-200">{String(oldVal ?? '（空）')}</span>
          )}
        </div>
        <div>
          <span className="text-deep-space-400 text-xs mr-2">新:</span>
          {changed ? (
            <DiffNewValue>{String(newVal ?? '（空）')}</DiffNewValue>
          ) : (
            <span className="text-deep-space-200">{String(newVal ?? '（空）')}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderVersionDetail = (version: ExerciseVersion, isLatest: boolean) => {
    const snap = version.snapshot;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold">
            版本 {version.versionNumber}
            {isLatest && (
              <span className="ml-2 text-xs bg-ice-blue/20 text-ice-blue px-2 py-0.5 rounded">
                当前版本
              </span>
            )}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-deep-space-400">修改人：</span>
            <span className="text-white">{version.changedBy}</span>
          </div>
          <div>
            <span className="text-deep-space-400">修改时间：</span>
            <span className="text-white">{new Date(version.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        {version.changeSummary && (
          <div className="bg-deep-space-700 rounded-lg p-4">
            <div className="text-xs text-deep-space-400 mb-1">修改摘要</div>
            <div className="text-white">{version.changeSummary}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-deep-space-700 rounded-lg p-3">
            <div className="text-xs text-deep-space-400 mb-1">名称</div>
            <div className="text-white">{snap.name}</div>
          </div>
          <div className="bg-deep-space-700 rounded-lg p-3">
            <div className="text-xs text-deep-space-400 mb-1">状态</div>
            <div className="text-white">{snap.status}</div>
          </div>
          <div className="bg-deep-space-700 rounded-lg p-3">
            <div className="text-xs text-deep-space-400 mb-1">时间轴</div>
            <div className="text-white font-mono">
              {snap.timelineStartMs}ms - {snap.timelineEndMs}ms
            </div>
          </div>
          <div className="bg-deep-space-700 rounded-lg p-3">
            <div className="text-xs text-deep-space-400 mb-1">关键帧 / 坐标</div>
            <div className="text-white">
              {snap.keyframes.length} 个关键帧 / {snap.coordinates.length} 个坐标
            </div>
          </div>
        </div>
        <div className="bg-deep-space-700 rounded-lg p-3">
          <div className="text-xs text-deep-space-400 mb-1">结论</div>
          <div className="text-white whitespace-pre-wrap text-sm">{snap.conclusion || '（空）'}</div>
        </div>
      </div>
    );
  };

  const renderCompare = () => {
    if (!compareV1 || !compareV2) return null;
    const s1 = compareV1.snapshot;
    const s2 = compareV2.snapshot;
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          版本对比：V{compareV1.versionNumber} ↔ V{compareV2.versionNumber}
        </h3>
        {renderFieldDiff('名称', s1.name, s2.name, isDifferent(s1.name, s2.name))}
        {renderFieldDiff('状态', s1.status, s2.status, isDifferent(s1.status, s2.status))}
        {renderFieldDiff(
          '起始时间',
          `${s1.timelineStartMs}ms`,
          `${s2.timelineStartMs}ms`,
          isDifferent(s1.timelineStartMs, s2.timelineStartMs),
        )}
        {renderFieldDiff(
          '结束时间',
          `${s1.timelineEndMs}ms`,
          `${s2.timelineEndMs}ms`,
          isDifferent(s1.timelineEndMs, s2.timelineEndMs),
        )}
        {renderFieldDiff(
          '关键帧数量',
          s1.keyframes.length,
          s2.keyframes.length,
          isDifferent(s1.keyframes, s2.keyframes),
        )}
        {renderFieldDiff(
          '设备坐标数量',
          s1.coordinates.length,
          s2.coordinates.length,
          isDifferent(s1.coordinates, s2.coordinates),
        )}
        {renderFieldDiff('结论', s1.conclusion || '（空）', s2.conclusion || '（空）', isDifferent(s1.conclusion, s2.conclusion))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-deep-space-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-deep-space-300 mb-6">
          <Link to="/exercises" className="hover:text-ice-blue transition-colors">
            练习记录
          </Link>
          <ChevronRight size={16} />
          <Link to={`/exercises/${id}`} className="hover:text-ice-blue transition-colors">
            {currentExercise?.name || '加载中...'}
          </Link>
          <ChevronRight size={16} />
          <span className="text-ice-blue">历史版本</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">历史版本</h1>
            <p className="text-deep-space-300 mt-2">共 {versions.length} 个版本</p>
          </div>
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareVersionId1(null);
              setCompareVersionId2(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              compareMode
                ? 'bg-ice-blue text-deep-space-900 border-ice-blue'
                : 'bg-deep-space-700 border-deep-space-500 hover:bg-deep-space-600'
            }`}
          >
            <GitCompare size={18} />
            {compareMode ? '退出对比模式' : '版本对比'}
          </button>
        </div>

        {compareMode && (
          <div className="mb-6 p-4 bg-ice-blue/10 border border-ice-blue/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {compareVersionId1 && compareVersionId2
                  ? `已选择 V${compareV1?.versionNumber} 和 V${compareV2?.versionNumber} 进行对比`
                  : compareVersionId1
                  ? `已选择 V${compareV1?.versionNumber}，请选择第二个版本`
                  : '请选择第一个版本'}
              </span>
              <button
                onClick={() => {
                  setCompareVersionId1(null);
                  setCompareVersionId2(null);
                }}
                className="text-xs text-deep-space-300 hover:text-white"
              >
                清除选择
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-reject/20 border border-red-reject/50 rounded-lg text-red-reject">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-deep-space-300">加载中...</div>
              ) : versions.length === 0 ? (
                <div className="p-8 text-center text-deep-space-300">暂无历史版本</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-deep-space-600" />
                  <div className="divide-y divide-deep-space-700">
                    {versions.map((v, idx) => {
                      const isLatest = idx === 0;
                      const isSelected = compareMode
                        ? v.id === compareVersionId1 || v.id === compareVersionId2
                        : v.id === selectedVersionId;
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleSelectVersion(v.id)}
                          className={`w-full text-left p-4 pl-16 relative transition-colors ${
                            isSelected
                              ? isLatest
                                ? 'bg-ice-blue/15'
                                : 'bg-deep-space-700/50'
                              : 'hover:bg-deep-space-700/30'
                          }`}
                        >
                          <div
                            className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 flex items-center justify-center ${
                              isLatest
                                ? 'bg-ice-blue border-ice-blue shadow-glow-ice'
                                : isSelected
                                ? 'bg-deep-space-300 border-deep-space-300'
                                : 'bg-deep-space-700 border-deep-space-500'
                            }`}
                          />
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`font-semibold ${
                                isLatest ? 'text-ice-blue' : 'text-white'
                              }`}
                            >
                              V{v.versionNumber}
                              {isLatest && ' (当前)'}
                            </span>
                            <span className="text-xs text-deep-space-300">
                              {new Date(v.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <div className="text-sm text-deep-space-200 mb-1">{v.changedBy}</div>
                          {v.changeSummary && (
                            <div className="text-xs text-deep-space-400 line-clamp-2">
                              {v.changeSummary}
                            </div>
                          )}
                          {!isLatest && !compareMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRollbackTarget(v);
                                setShowRollbackConfirm(true);
                              }}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-amber-warn hover:text-amber-warn/80 transition-colors"
                            >
                              <RotateCcw size={12} />
                              回滚到此版本
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6 min-h-[500px]">
              {loading ? (
                <div className="text-center text-deep-space-300 py-12">加载中...</div>
              ) : compareMode ? (
                compareV1 && compareV2 ? (
                  renderCompare()
                ) : (
                  <div className="text-center text-deep-space-300 py-12">
                    请在左侧选择两个版本进行对比
                  </div>
                )
              ) : selectedVersion ? (
                renderVersionDetail(selectedVersion, selectedVersion.id === latestVersion?.id)
              ) : (
                <div className="text-center text-deep-space-300 py-12">请选择一个版本查看详情</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRollbackConfirm && rollbackTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-deep-space-800 border border-deep-space-500 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-warn/20 flex items-center justify-center">
                <RotateCcw className="text-amber-warn" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">确认回滚</h3>
                <p className="text-sm text-deep-space-300">即将回滚到 V{rollbackTarget.versionNumber}</p>
              </div>
            </div>
            <div className="bg-deep-space-700 rounded-lg p-4 mb-6 text-sm">
              <p className="text-deep-space-200">
                回滚后将创建一个新版本，内容与 V{rollbackTarget.versionNumber} 一致。
                当前版本不会丢失，仍可在历史记录中查看。
              </p>
              {rollbackTarget.changeSummary && (
                <p className="text-deep-space-400 mt-2 text-xs">
                  目标版本摘要：{rollbackTarget.changeSummary}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRollbackConfirm(false);
                  setRollbackTarget(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-deep-space-700 border border-deep-space-500 rounded-lg hover:bg-deep-space-600 transition-colors"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={handleRollback}
                disabled={rollingBack}
                className="flex items-center gap-2 px-4 py-2 bg-amber-warn text-deep-space-900 rounded-lg hover:bg-amber-warn/90 transition-colors font-medium disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {rollingBack ? '回滚中...' : '确认回滚'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
