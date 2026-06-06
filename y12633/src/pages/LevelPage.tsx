import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Edit3,
  Trash2,
  FileText,
  Home,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useInspectionStore } from '../store/inspectionStore';
import type { PointStatus } from '../types';
import {
  statusLabel,
  hitDetectionLabel,
  hitDetectionChipClass,
  calculateInspectionProgress,
  formatDate,
} from '../utils/helpers';

export default function LevelPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const {
    inspection,
    past,
    future,
    boundaryWarningVisible,
    selectedPointId,
    selectPoint,
    addPoint,
    updatePoint,
    updatePointStatus,
    deletePoint,
    undo,
    redo,
    createNewInspection,
    setInspectionTitle,
    triggerBoundaryFail,
    hideBoundaryWarning,
  } = useInspectionStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(inspection.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const selectedPoint = inspection.drainPoints.find(
    (p) => p.id === selectedPointId,
  );
  const progress = calculateInspectionProgress(inspection.drainPoints);

  useEffect(() => {
    if (selectedPoint) {
      setNotesDraft(selectedPoint.notes);
    }
  }, [selectedPoint]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (x < 5 || x > 95 || y < 5 || y > 95) {
      triggerBoundaryFail('点击位置越出了巡检范围边界（5%-95%区域）');
      return;
    }

    addPoint(x, y, `新建点位(${x.toFixed(0)}, ${y.toFixed(0)})`);
  };

  const handlePointClick = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    selectPoint(pointId);
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleReset = () => {
    createNewInspection();
    selectPoint(null);
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      setInspectionTitle(titleDraft.trim());
    } else {
      setTitleDraft(inspection.title);
    }
    setEditingTitle(false);
  };

  const handleSaveNotes = () => {
    if (selectedPoint) {
      updatePoint(selectedPoint.id, { notes: notesDraft });
    }
    setEditingNotes(false);
  };

  const handleChangeStatus = (status: PointStatus) => {
    if (selectedPoint) {
      updatePointStatus(selectedPoint.id, status);
    }
  };

  const handleDeletePoint = () => {
    if (selectedPoint) {
      deletePoint(selectedPoint.id);
    }
  };

  const getPointColor = (status: PointStatus): string => {
    switch (status) {
      case 'inspected':
        return 'bg-green-500 ring-green-200';
      case 'failed':
        return 'bg-red-500 ring-red-200';
      default:
        return 'bg-amber-500 ring-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in">
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <Home className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  className="input-field text-lg font-semibold py-1 w-80"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(inspection.title);
                      setEditingTitle(false);
                    }
                  }}
                />
                <button onClick={handleSaveTitle} className="btn-primary text-sm px-3 py-1">
                  保存
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTitleDraft(inspection.title);
                  setEditingTitle(true);
                }}
                className="flex items-center gap-2 group"
              >
                <h1 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {inspection.title}
                </h1>
                <Edit3 className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 mr-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(inspection.updatedAt)}
            </div>

            <button
              onClick={handleUndo}
              disabled={past.length === 0}
              className="btn-ghost flex items-center gap-1.5"
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">撤销</span>
              {past.length > 0 && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {past.length}
                </span>
              )}
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="btn-ghost flex items-center gap-1.5"
              title="重做 (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden sm:inline">重做</span>
              {future.length > 0 && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {future.length}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">重开关卡</span>
            </button>
            <button
              onClick={() => navigate('/settlement')}
              className="btn-primary flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              结算
            </button>
          </div>
        </div>
      </header>

      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <div className="flex-1 p-6">
          <div className="card p-1 overflow-hidden">
            <div
              ref={mapRef}
              onClick={handleMapClick}
              className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 via-emerald-50 to-amber-50 rounded-lg overflow-hidden cursor-crosshair select-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(22, 93, 255, 0.06) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(22, 93, 255, 0.06) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            >
              <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-primary-300/60 rounded-2xl pointer-events-none">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 rounded-full text-xs text-primary-600 font-medium border border-primary-200 shadow-sm">
                  巡检有效区域（边界内）
                </div>
              </div>

              <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10% 30% Q30% 10%, 50% 25% T90% 20%"
                  stroke="#165DFF"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M5% 70% Q35% 55%, 65% 70% T95% 65%"
                  stroke="#165DFF"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M25% 10% L25% 90%"
                  stroke="#165DFF"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <path
                  d="M70% 5% L70% 95%"
                  stroke="#165DFF"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {inspection.drainPoints.map((point) => (
                <button
                  key={point.id}
                  onClick={(e) => handlePointClick(e, point.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full ring-4 transition-all duration-200 hover:scale-110 ${getPointColor(point.status)} ${
                    selectedPointId === point.id
                      ? 'scale-125 ring-8 shadow-lg z-10 animate-bounce-subtle'
                      : ''
                  }`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={point.address || `点位 (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`}
                >
                  <MapPin className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </button>
              ))}

              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  待巡检
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  已通过
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  需整改
                </span>
              </div>

              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 flex items-center gap-1.5">
                <Plus className="w-3 h-3" />
                点击地图添加雨水口
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => triggerBoundaryFail('手动触发边界失败演示')}
              className="btn-danger text-sm flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              触发边界失败演示
            </button>
            {inspection.boundaryFailTriggered && (
              <span className="chip chip-failed">
                边界失败已触发
              </span>
            )}
            {past.length > 0 && (
              <span className="chip bg-blue-100 text-blue-700">
                撤销已执行
              </span>
            )}
          </div>
        </div>

        <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto hidden md:block">
          {selectedPoint ? (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">点位详情</h3>
                <button
                  onClick={() => selectPoint(null)}
                  className="btn-ghost p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">
                    位置
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedPoint.address || '未命名点位'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    坐标 ({selectedPoint.x.toFixed(1)}, {selectedPoint.y.toFixed(1)})
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    巡检状态
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['pending', 'inspected', 'failed'] as PointStatus[]).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => handleChangeStatus(s)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedPoint.status === s
                              ? s === 'pending'
                                ? 'bg-amber-500 text-white'
                                : s === 'inspected'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {statusLabel[s]}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    命中检测
                  </label>
                  <span
                    className={`chip ${hitDetectionChipClass[selectedPoint.hitDetection || 'pending']}`}
                  >
                    {hitDetectionLabel[selectedPoint.hitDetection || 'pending']}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500">
                      备注
                    </label>
                    {!editingNotes ? (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        编辑
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveNotes}
                        className="text-xs text-primary-600 font-medium hover:text-primary-700"
                      >
                        保存
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <textarea
                      className="input-field text-sm min-h-[80px] resize-y"
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="输入巡检备注..."
                    />
                  ) : (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 min-h-[60px] whitespace-pre-wrap">
                      {selectedPoint.notes || (
                        <span className="text-gray-400 italic">暂无备注</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    创建于 {formatDate(selectedPoint.createdAt)}
                  </p>
                </div>

                <button
                  onClick={handleDeletePoint}
                  className="w-full btn-danger text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  删除该点位
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                未选择点位
              </h3>
              <p className="text-xs text-gray-500 max-w-[180px]">
                点击地图上的标记查看详情，或在空白处添加新点位
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              快速操作
            </h4>
            <div className="space-y-2">
              <button
                onClick={handleUndo}
                disabled={past.length === 0}
                className="w-full btn-ghost text-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Undo2 className="w-4 h-4" />
                  撤销上一步
                </span>
                <span className="text-xs text-gray-400">{past.length}</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={future.length === 0}
                className="w-full btn-ghost text-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Redo2 className="w-4 h-4" />
                  重做
                </span>
                <span className="text-xs text-gray-400">{future.length}</span>
              </button>
              <button
                onClick={handleReset}
                className="w-full btn-ghost text-sm flex items-center gap-2 text-amber-600 hover:bg-amber-50"
              >
                <RefreshCw className="w-4 h-4" />
                重置全部
              </button>
            </div>
          </div>
        </aside>
      </div>

      {boundaryWarningVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse-slow">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  边界失败
                </h3>
                <p className="text-sm text-gray-600">
                  {inspection.boundaryNotes || '标注越出了巡检范围的有效边界'}
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-green-700">
                    已记录为一次边界失败事件
                  </span>
                  ，结算页中将展示该事件用于教学演示与讲解备注。
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  undo();
                  hideBoundaryWarning();
                }}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Undo2 className="w-4 h-4" />
                撤销并关闭
              </button>
              <button
                onClick={hideBoundaryWarning}
                className="btn-primary flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
