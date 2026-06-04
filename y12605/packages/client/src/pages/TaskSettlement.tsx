import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { Annotation, ScoreItem, ValidationError, ReviewNote, ResultUsability, ANNOTATION_COLORS, ANNOTATION_LABELS, CONCLUSION_STATUS_LABELS } from '@puzzle/shared';
import StatusBadge from '../components/StatusBadge';
import UsabilityBadge from '../components/UsabilityBadge';

export default function TaskSettlement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentTask, currentTaskErrors, loading, fetchTask, fetchHistory, exportTask, reopen, clearCurrentTask } = useTaskStore();

  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask(id);
      fetchHistory(id);
    }
    return () => clearCurrentTask();
  }, [id, fetchTask, fetchHistory, clearCurrentTask]);

  const handleExport = async (format: 'pdf' | 'excel' | 'both') => {
    if (!id) return;
    await exportTask(id, {
      format,
      includeAnnotations: true,
      includeScoreSheet: true,
      includeHistory: true,
      includeScreenshots: false,
    });
  };

  const handleReopen = async () => {
    if (!id) return;
    await reopen(id);
    setShowReopenConfirm(false);
    navigate(`/tasks/${id}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getAnnotationStats = () => {
    if (!currentTask) return { correct: 0, error: 0, warning: 0, note: 0, total: 0 };
    const stats: { correct: number; error: number; warning: number; note: number; total: number; [key: string]: number } = { correct: 0, error: 0, warning: 0, note: 0, total: currentTask.annotations.length };
    currentTask.annotations.forEach((a: Annotation) => {
      stats[a.type]++;
    });
    return stats;
  };

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

  const annotationStats = getAnnotationStats();
  const usability = currentTask.usability || currentTask.conclusion?.usability || 'needs_trainer_review';
  const scorePercentage = currentTask.scoreSheet.maxTotalScore > 0
    ? Math.round((currentTask.scoreSheet.totalScore / currentTask.scoreSheet.maxTotalScore) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-500 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">审核结算报告</h2>
            <p className="text-slate-500 mt-1">任务编号: {currentTask.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            导出 PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出 Excel
          </button>
          <button
            onClick={() => setShowReopenConfirm(true)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重开任务
          </button>
        </div>
      </div>

      {usability === 'direct_use' && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-800">可直接使用</h3>
              <p className="text-green-700 mt-1">该审核结果符合所有要求，无需额外复核，可直接投入使用。</p>
            </div>
          </div>
        </div>
      )}

      {usability === 'needs_trainer_review' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-amber-800">需培训师复核</h3>
              <p className="text-amber-700 mt-1">该审核结果存在待处理问题，需要培训师进行进一步复核确认。</p>
            </div>
          </div>
        </div>
      )}

      {usability === 'rejected' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-800">不可用</h3>
              <p className="text-red-700 mt-1">该审核结果未通过，需要重新进行审核。</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">任务基本信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">任务标题</span>
              <span className="font-medium text-slate-800">{currentTask.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">状态</span>
              <StatusBadge status={currentTask.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">可用性</span>
              <UsabilityBadge type={usability as ResultUsability} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">负责人</span>
              <span className="text-slate-800">{currentTask.assignee}</span>
            </div>
            {currentTask.reviewer && (
              <div className="flex justify-between">
                <span className="text-slate-500">审核人</span>
                <span className="text-slate-800">{currentTask.reviewer}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">创建时间</span>
              <span className="text-slate-600 text-sm">{formatDate(currentTask.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">更新时间</span>
              <span className="text-slate-600 text-sm">{formatDate(currentTask.updatedAt)}</span>
            </div>
            {currentTask.completedAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">完成时间</span>
                <span className="text-slate-600 text-sm">{formatDate(currentTask.completedAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">评分总览</h3>
          <div className="text-center mb-6">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={scorePercentage >= 80 ? '#22c55e' : scorePercentage >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(scorePercentage / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{scorePercentage}%</span>
                <span className="text-xs text-slate-500">得分率</span>
              </div>
            </div>
            <div className="mt-4 text-lg">
              <span className="font-bold text-blue-600">{currentTask.scoreSheet.totalScore}</span>
              <span className="text-slate-400"> / {currentTask.scoreSheet.maxTotalScore}</span>
            </div>
          </div>
          <div className="space-y-2">
            {currentTask.scoreSheet.items.map((item: ScoreItem) => (
              <div key={item.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.name}</span>
                  <span className="font-medium">{item.score} / {item.maxScore}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">标注统计</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: ANNOTATION_COLORS.correct }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-700">{annotationStats.correct}</div>
            <div className="text-sm text-green-600">{ANNOTATION_LABELS.correct}</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: ANNOTATION_COLORS.error }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-red-700">{annotationStats.error}</div>
            <div className="text-sm text-red-600">{ANNOTATION_LABELS.error}</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: ANNOTATION_COLORS.warning }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-amber-700">{annotationStats.warning}</div>
            <div className="text-sm text-amber-600">{ANNOTATION_LABELS.warning}</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: ANNOTATION_COLORS.note }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-blue-700">{annotationStats.note}</div>
            <div className="text-sm text-blue-600">{ANNOTATION_LABELS.note}</div>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">
          总计 {annotationStats.total} 个标注
        </div>
      </div>

      {currentTask.conclusion && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">审核结论</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500">结论状态</span>
              <span className="font-medium text-slate-800">
                {CONCLUSION_STATUS_LABELS[currentTask.conclusion.status] || currentTask.conclusion.status}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500">可用性</span>
              <UsabilityBadge type={currentTask.conclusion.usability} />
            </div>
          </div>
          {currentTask.conclusion.summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-1">摘要</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{currentTask.conclusion.summary}</p>
            </div>
          )}
          {currentTask.conclusion.detailedFindings && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-1">详细发现</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{currentTask.conclusion.detailedFindings}</p>
            </div>
          )}
          {currentTask.conclusion.recommendations && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-1">建议</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{currentTask.conclusion.recommendations}</p>
            </div>
          )}
        </div>
      )}

      {(currentTaskErrors.length > 0 || annotationStats.error > 0 || annotationStats.warning > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            待处理问题 ({currentTaskErrors.length + annotationStats.error + annotationStats.warning})
          </h3>
          <div className="space-y-3">
            {currentTaskErrors.map((error: ValidationError, idx: number) => (
              <div key={`err-${idx}`} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-red-800">
                      <span className="text-sm bg-red-200 text-red-800 px-2 py-0.5 rounded mr-2">验证错误</span>
                      {error.field}
                    </div>
                    <p className="text-red-700 text-sm mt-1">{error.message}</p>
                    {error.suggestion && (
                      <p className="text-red-600 text-sm mt-1">
                        <span className="font-medium">建议：</span>{error.suggestion}
                      </p>
                    )}
                    {error.missingMaterials && error.missingMaterials.length > 0 && (
                      <p className="text-red-600 text-sm mt-1">
                        <span className="font-medium">缺失素材：</span>{error.missingMaterials.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {currentTask.annotations
              .filter((a: Annotation) => a.type === 'error' || a.type === 'warning')
              .map((annotation: Annotation) => (
                <div
                  key={annotation.id}
                  className={`p-4 rounded-lg border ${
                    annotation.type === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: ANNOTATION_COLORS[annotation.type] }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={annotation.type === 'error' ? 'M6 18L18 6M6 6l12 12' : 'M12 9v2m0 4h.01'}
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${annotation.type === 'error' ? 'text-red-800' : 'text-amber-800'}`}>
                        <span
                          className={`text-sm px-2 py-0.5 rounded mr-2 ${
                            annotation.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {ANNOTATION_LABELS[annotation.type]}
                        </span>
                        位置: ({Math.round(annotation.position.x)}, {Math.round(annotation.position.y)})
                      </div>
                      <p className={`text-sm mt-1 ${annotation.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                        {annotation.content}
                      </p>
                      <p className={`text-xs mt-1 ${annotation.type === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                        {annotation.author} · {formatDate(annotation.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {currentTask.notes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">备注记录 ({currentTask.notes.length})</h3>
          <div className="space-y-3">
            {currentTask.notes.map((note: ReviewNote) => (
              <div key={note.id} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700">{note.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-500">
                    {note.author} · {formatDate(note.createdAt)}
                  </span>
                  {note.affectsScoreSheet && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">影响评分</span>
                  )}
                  {note.affectsConclusion && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">影响结论</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showReopenConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">确认重开任务</h3>
            <p className="text-slate-600 mb-4">
              重开任务将重置任务状态为进行中，您可以继续进行审核工作。当前的审核记录将会被保留。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReopenConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReopen}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                确认重开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
