import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { ReviewLevel, AnnotationType, Annotation, ScoreItem, ReviewNote, HistoryRecord, ValidationError, Layer, ResultUsability, ANNOTATION_COLORS, ANNOTATION_LABELS, STATUS_LABELS, USABILITY_LABELS } from '@puzzle/shared';
import StatusBadge from '../components/StatusBadge';
import UsabilityBadge from '../components/UsabilityBadge';

type TabType = 'annotations' | 'layers' | 'score' | 'conclusion' | 'notes' | 'history';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  const {
    currentTask,
    currentTaskErrors,
    levels,
    history,
    loading,
    fetchTask,
    fetchHistory,
    fetchLevels,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    updateLayer,
    addNote,
    updateNote,
    updateScore,
    syncScore,
    updateConclusion,
    syncConclusion,
    undo,
    redo,
    complete,
    updateLevel,
    exportTask,
    validateTask,
    clearCurrentTask,
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<TabType>('annotations');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({ type: 'note' as AnnotationType, content: '', x: 0, y: 0 });
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [newNote, setNewNote] = useState({ content: '', affectsScoreSheet: false, affectsConclusion: false });
  const [conclusionData, setConclusionData] = useState({ status: 'pending', summary: '', detailedFindings: '', recommendations: '', usability: 'needs_trainer_review' });

  useEffect(() => {
    if (id) {
      fetchTask(id);
      fetchHistory(id);
      fetchLevels();
    }
    return () => clearCurrentTask();
  }, [id, fetchTask, fetchHistory, fetchLevels, clearCurrentTask]);

  useEffect(() => {
    if (currentTask) {
      setSelectedLevelId(currentTask.currentLevelId);
      if (currentTask.conclusion) {
        setConclusionData({
          status: currentTask.conclusion.status,
          summary: currentTask.conclusion.summary,
          detailedFindings: currentTask.conclusion.detailedFindings,
          recommendations: currentTask.conclusion.recommendations,
          usability: currentTask.conclusion.usability,
        });
      }
    }
  }, [currentTask]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !id) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNewAnnotation((prev) => ({ ...prev, x, y }));
    setShowAnnotationModal(true);
  };

  const handleAddAnnotation = async () => {
    if (!id) return;
    const result = await addAnnotation(id, {
      type: newAnnotation.type,
      content: newAnnotation.content,
      position: { x: newAnnotation.x, y: newAnnotation.y },
      author: '当前用户',
    });
    if (result.success) {
      setShowAnnotationModal(false);
      setNewAnnotation({ type: 'note', content: '', x: 0, y: 0 });
    }
  };

  const handleUpdateAnnotation = async () => {
    if (!id || !editingAnnotation) return;
    await updateAnnotation(id, editingAnnotation.id, {
      type: editingAnnotation.type,
      content: editingAnnotation.content,
    });
    setEditingAnnotation(null);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!id) return;
    await deleteAnnotation(id, annotationId);
  };

  const handleAddNote = async () => {
    if (!id || !newNote.content.trim()) return;
    await addNote(id, newNote);
    setNewNote({ content: '', affectsScoreSheet: false, affectsConclusion: false });
  };

  const handleUpdateNote = async (noteId: string, data: Partial<ReviewNote>) => {
    if (!id) return;
    await updateNote(id, noteId, data);
  };

  const handleScoreChange = (itemId: string, score: number, comment: string) => {
    if (!currentTask || !id) return;
    const items = currentTask.scoreSheet.items.map((item: ScoreItem) =>
      item.id === itemId ? { ...item, score, comment } : item
    );
    updateScore(id, { items });
  };

  const handleConclusionChange = (field: string, value: string) => {
    setConclusionData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveConclusion = async () => {
    if (!id) return;
    await updateConclusion(id, conclusionData);
  };

  const handleLevelChange = async (levelId: string) => {
    if (!id) return;
    setSelectedLevelId(levelId);
    await updateLevel(id, levelId);
  };

  const handleComplete = async () => {
    if (!id) return;
    const validation = await validateTask(id);
    if (!validation.isValid || validation.errors.length > 0) {
      navigate(`/tasks/${id}/settlement`);
      return;
    }
    const result = await complete(id);
    if (result.success) {
      navigate(`/tasks/${id}/settlement`);
    } else if (result.errors && result.errors.length > 0) {
      navigate(`/tasks/${id}/settlement`);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!id) return;
    await exportTask(id, {
      format,
      includeAnnotations: true,
      includeScoreSheet: true,
      includeHistory: true,
      includeScreenshots: false,
    });
  };

  const handleUndo = async () => {
    if (!id || !currentTask?.canUndo) return;
    await undo(id);
  };

  const handleRedo = async () => {
    if (!id || !currentTask?.canRedo) return;
    await redo(id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'annotations', label: '标注' },
    { key: 'layers', label: '图层' },
    { key: 'score', label: '评分' },
    { key: 'conclusion', label: '结论' },
    { key: 'notes', label: '备注' },
    { key: 'history', label: '历史' },
  ];

  if (loading && !currentTask) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>任务不存在或已被删除</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          返回任务列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-slate-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{currentTask.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={currentTask.status} />
                {currentTask.usability && <UsabilityBadge type={currentTask.usability as ResultUsability} />}
                <span className="text-sm text-slate-500">负责人: {currentTask.assignee}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!currentTask.canUndo}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="撤销"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!currentTask.canRedo}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="重做"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <select
              value={selectedLevelId}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {levels.map((level: ReviewLevel) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              完成审核
            </button>
            <div className="relative group">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                导出
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-32">
                <button
                  onClick={() => handleExport('pdf')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
                >
                  导出 PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:rounded-b-lg"
                >
                  导出 Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentTaskErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-medium text-red-800 mb-2">验证错误 ({currentTaskErrors.length})</h4>
          <ul className="space-y-2">
            {currentTaskErrors.map((error: ValidationError, idx: number) => (
              <li key={idx} className="text-red-700 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium">{error.field}:</span> {error.message}
                  {error.suggestion && <span className="block text-red-600 text-xs mt-0.5">建议: {error.suggestion}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-slate-500">工具栏：</span>
              {(['correct', 'error', 'warning', 'note'] as AnnotationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewAnnotation((prev) => ({ ...prev, type }))}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    newAnnotation.type === type
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ANNOTATION_LABELS[type]}
                </button>
              ))}
            </div>

            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="canvas-container relative bg-slate-100 rounded-lg overflow-hidden cursor-crosshair"
              style={{ width: '800px', height: '600px', maxWidth: '100%' }}
            >
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                <polygon points="400,100 500,250 300,250" fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" strokeWidth="2" />
                <rect x="150" y="300" width="120" height="120" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" strokeWidth="2" />
                <circle cx="600" cy="380" r="70" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="2" />
                <polygon points="400,400 470,500 330,500" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="2" />
                <rect x="550" y="120" width="100" height="80" fill="#8b5cf6" fillOpacity="0.3" stroke="#8b5cf6" strokeWidth="2" />
                <circle cx="220" cy="180" r="50" fill="#ec4899" fillOpacity="0.3" stroke="#ec4899" strokeWidth="2" />

                {currentTask.annotations.map((annotation: Annotation) => (
                  <g key={annotation.id}>
                    <circle
                      cx={annotation.position.x}
                      cy={annotation.position.y}
                      r="12"
                      fill={ANNOTATION_COLORS[annotation.type]}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAnnotation(annotation);
                      }}
                    />
                    <text
                      x={annotation.position.x}
                      y={annotation.position.y + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {annotation.type === 'correct' ? '✓' : annotation.type === 'error' ? '✕' : annotation.type === 'warning' ? '!' : 'i'}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-white bg-opacity-80 px-2 py-1 rounded">
                点击画布添加标注
              </div>
            </div>
          </div>
        </div>

        <div className="w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'annotations' && (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">标注列表 ({currentTask.annotations.length})</h4>
                {currentTask.annotations.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">暂无标注</p>
                ) : (
                  currentTask.annotations.map((annotation: Annotation) => (
                    <div
                      key={annotation.id}
                      className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ANNOTATION_COLORS[annotation.type] }}
                          ></span>
                          <span className="text-sm font-medium text-slate-700">
                            {ANNOTATION_LABELS[annotation.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingAnnotation(annotation)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{annotation.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {annotation.author} · {formatDate(annotation.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'layers' && (
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700 mb-3">图层管理</h4>
                {currentTask.layers
                  .sort((a: Layer, b: Layer) => a.order - b.order)
                  .map((layer: Layer) => (
                    <div key={layer.id} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateLayer(id!, layer.id, { visible: !layer.visible })}
                            className={`p-1 rounded ${layer.visible ? 'text-slate-600' : 'text-slate-300'}`}
                          >
                            {layer.visible ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => updateLayer(id!, layer.id, { locked: !layer.locked })}
                            className={`p-1 rounded ${layer.locked ? 'text-amber-500' : 'text-slate-400'}`}
                          >
                            {layer.locked ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          <span className="text-sm font-medium text-slate-700">{layer.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {layer.type}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500">不透明度</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layer.opacity * 100}
                          onChange={(e) => updateLayer(id!, layer.id, { opacity: Number(e.target.value) / 100 })}
                          className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-slate-500 w-10 text-right">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'score' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700">评分表</h4>
                    {!currentTask.scoreSheet.synchronizedWithNotes && (
                      <span className="sync-warning text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        待同步
                      </span>
                    )}
                    {currentTask.scoreSheet.synchronizedWithNotes && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        已同步
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm mr-2">
                      <span className="text-slate-500">总分: </span>
                      <span className="font-bold text-blue-600">{currentTask.scoreSheet.totalScore}</span>
                      <span className="text-slate-400"> / {currentTask.scoreSheet.maxTotalScore}</span>
                    </div>
                    {!currentTask.scoreSheet.synchronizedWithNotes && (
                      <button
                        onClick={() => syncScore(id!)}
                        className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                      >
                        标记同步
                      </button>
                    )}
                  </div>
                </div>
                {!currentTask.scoreSheet.synchronizedWithNotes && (
                  <div className="warning-alert text-sm">
                    <p className="font-medium text-amber-800">备注已更新，评分表需要同步</p>
                    <p className="text-amber-700 text-xs mt-1">有新的备注标记为"影响评分"，请检查评分是否需要调整，确认无误后点击"标记同步"</p>
                  </div>
                )}
                {currentTask.scoreSheet.items.map((item: ScoreItem) => (
                  <div key={item.id} className="p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={item.maxScore}
                          value={item.score}
                          onChange={(e) => handleScoreChange(item.id, Number(e.target.value), item.comment)}
                          className="w-16 px-2 py-1 text-sm border border-slate-300 rounded text-center"
                        />
                        <span className="text-xs text-slate-400">/ {item.maxScore}</span>
                      </div>
                    </div>
                    <textarea
                      value={item.comment}
                      onChange={(e) => handleScoreChange(item.id, item.score, e.target.value)}
                      placeholder="评分说明..."
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded resize-none"
                      rows={2}
                    />
                    <div className="mt-1 text-xs text-slate-400">权重: {item.weight}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'conclusion' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-700">审核结论</h4>
                    {currentTask.conclusion && !currentTask.conclusion.synchronizedWithScoreSheet && (
                      <span className="sync-warning text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        待同步
                      </span>
                    )}
                    {currentTask.conclusion && currentTask.conclusion.synchronizedWithScoreSheet && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        已同步
                      </span>
                    )}
                  </div>
                  {currentTask.conclusion && !currentTask.conclusion.synchronizedWithScoreSheet && (
                    <button
                      onClick={() => syncConclusion(id!)}
                      className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                      标记同步
                    </button>
                  )}
                </div>
                {currentTask.conclusion && !currentTask.conclusion.synchronizedWithScoreSheet && (
                  <div className="warning-alert text-sm">
                    <p className="font-medium text-amber-800">评分表已更新，结论需要同步</p>
                    <p className="text-amber-700 text-xs mt-1">评分表有新的修改，请检查结论是否与当前评分一致，确认无误后点击"标记同步"</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                  <select
                    value={conclusionData.status}
                    onChange={(e) => handleConclusionChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">待确认</option>
                    <option value="pass">通过</option>
                    <option value="fail">不通过</option>
                    <option value="needs_confirmation">需确认</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">可用性</label>
                  <select
                    value={conclusionData.usability}
                    onChange={(e) => handleConclusionChange('usability', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="direct_use">可直接使用</option>
                    <option value="needs_trainer_review">需培训师复核</option>
                    <option value="rejected">不可用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">摘要</label>
                  <textarea
                    value={conclusionData.summary}
                    onChange={(e) => handleConclusionChange('summary', e.target.value)}
                    placeholder="简要说明审核结果..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">详细发现</label>
                  <textarea
                    value={conclusionData.detailedFindings}
                    onChange={(e) => handleConclusionChange('detailedFindings', e.target.value)}
                    placeholder="详细描述发现的问题..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">建议</label>
                  <textarea
                    value={conclusionData.recommendations}
                    onChange={(e) => handleConclusionChange('recommendations', e.target.value)}
                    placeholder="改进建议..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                </div>
                <button
                  onClick={handleSaveConclusion}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存结论
                </button>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">备注 ({currentTask.notes.length})</h4>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="添加备注..."
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded resize-none bg-white"
                    rows={2}
                  />
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={newNote.affectsScoreSheet}
                        onChange={(e) => setNewNote((prev) => ({ ...prev, affectsScoreSheet: e.target.checked }))}
                        className="rounded"
                      />
                      影响评分
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={newNote.affectsConclusion}
                        onChange={(e) => setNewNote((prev) => ({ ...prev, affectsConclusion: e.target.checked }))}
                        className="rounded"
                      />
                      影响结论
                    </label>
                  </div>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.content.trim()}
                    className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    添加备注
                  </button>
                </div>
                {currentTask.notes.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">暂无备注</p>
                ) : (
                  currentTask.notes.map((note: ReviewNote) => (
                    <div key={note.id} className="p-3 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-400">{note.author} · {formatDate(note.createdAt)}</span>
                        {note.affectsScoreSheet && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">影响评分</span>
                        )}
                        {note.affectsConclusion && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">影响结论</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">历史记录</h4>
                {history.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">暂无历史记录</p>
                ) : (
                  history.map((record: HistoryRecord) => (
                    <div key={record.id} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{record.action.description}</span>
                        <span className="text-xs text-slate-400">{formatDate(record.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {record.action.type}
                        </span>
                        <span className="text-xs text-slate-500">{record.action.entityType}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAnnotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">添加标注</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">类型</label>
                <div className="flex gap-2">
                  {(['correct', 'error', 'warning', 'note'] as AnnotationType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewAnnotation((prev) => ({ ...prev, type }))}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        newAnnotation.type === type
                          ? 'text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={newAnnotation.type === type ? { backgroundColor: ANNOTATION_COLORS[type] } : {}}
                    >
                      {ANNOTATION_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容</label>
                <textarea
                  value={newAnnotation.content}
                  onChange={(e) => setNewAnnotation((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="请输入标注内容..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="text-xs text-slate-500">
                位置: ({Math.round(newAnnotation.x)}, {Math.round(newAnnotation.y)})
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAnnotationModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddAnnotation}
                disabled={!newAnnotation.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">编辑标注</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">类型</label>
                <div className="flex gap-2">
                  {(['correct', 'error', 'warning', 'note'] as AnnotationType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setEditingAnnotation((prev: Annotation | null) => prev ? { ...prev, type } : null)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        editingAnnotation.type === type
                          ? 'text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      style={editingAnnotation.type === type ? { backgroundColor: ANNOTATION_COLORS[type] } : {}}
                    >
                      {ANNOTATION_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容</label>
                <textarea
                  value={editingAnnotation.content}
                  onChange={(e) => setEditingAnnotation((prev: Annotation | null) => prev ? { ...prev, content: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingAnnotation(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateAnnotation}
                disabled={!editingAnnotation.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
