import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, User, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { FeedbackForm } from '../components/FeedbackForm';
import { cn } from '../lib/utils';
import { ChangeLog, QualityIssue } from '../types';

export function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';

  const { getFeedbackById, getChangeLogsByFeedbackId, seatAreas, trackSegments } = useFeedbackStore();

  const [showEditForm, setShowEditForm] = useState(isEditMode);

  const feedback = getFeedbackById(id || '');
  const changeLogs = getChangeLogsByFeedbackId(id || '');

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">反馈不存在</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-amber-600 hover:text-amber-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  const areaName = seatAreas.find(a => a.id === feedback.seatAreaId)?.name || '未填写';
  const segmentName = trackSegments.find(s => s.id === feedback.segmentId)?.name || '未关联';

  const getSourceLabel = (source: ChangeLog['source']) => {
    switch (source) {
      case 'user_edit': return '用户编辑';
      case 'auto_correct': return '系统自动修正';
      case 'batch_import': return '批量导入';
      default: return source;
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      seatAreaId: '座位区域',
      segmentId: '曲目段落',
      content: '反馈内容',
      note: '备注',
    };
    return labels[field] || field;
  };

  const getIssueIcon = (issue: QualityIssue) => {
    if (issue.severity === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">反馈详情</h1>
          <p className="text-slate-500 mt-1">反馈 ID: {feedback.id}</p>
        </div>
        <button
          onClick={() => setShowEditForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
        >
          <Edit className="w-5 h-5" />
          编辑反馈
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-500">反馈内容</label>
                <p className="mt-1 text-slate-800">{feedback.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">座位区域</label>
                  <p className="mt-1 text-slate-800 font-medium">{areaName}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">曲目段落</label>
                  <p className="mt-1 text-slate-800 font-medium">{segmentName}</p>
                </div>
              </div>
              {feedback.note && (
                <div>
                  <label className="text-sm text-slate-500">备注</label>
                  <p className="mt-1 text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{feedback.note}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-sm text-slate-500">创建时间</label>
                  <p className="mt-1 text-slate-800">{formatDate(feedback.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">更新时间</label>
                  <p className="mt-1 text-slate-800">{formatDate(feedback.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">变更历史</h2>
            {changeLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">暂无变更记录</p>
            ) : (
              <div className="space-y-4">
                {changeLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className={cn(
                      'relative pl-8 pb-6',
                      index < changeLogs.length - 1 && 'border-l-2 border-slate-200'
                    )}
                    style={{ marginLeft: '11px' }}
                  >
                    <div className="absolute -left-3 top-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {getFieldLabel(log.fieldName)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(log.timestamp)}</span>
                      </div>
                      <div className="space-y-1">
                        {log.oldValue && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">变更前:</span>
                            <span className="text-sm text-red-600 line-through">{log.oldValue}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">变更后:</span>
                          <span className="text-sm text-green-600 font-medium">{log.newValue || '(空)'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-200">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          {log.operator}
                        </div>
                        <span className="text-xs text-slate-500">
                          来源: {getSourceLabel(log.source)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">数据质量</h2>
            {feedback.qualityIssues.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">数据完整</p>
                <p className="text-sm text-slate-500 mt-1">所有字段已完整填写</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedback.qualityIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-lg p-4',
                      issue.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue)}
                      <div className="flex-1">
                        <p className={cn(
                          'font-medium',
                          issue.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                        )}>
                          {issue.message}
                        </p>
                        <div className="flex items-start gap-1 mt-2">
                          <Lightbulb className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            issue.severity === 'error' ? 'text-red-500' : 'text-yellow-600'
                          )} />
                          <p className={cn(
                            'text-sm',
                            issue.severity === 'error' ? 'text-red-600' : 'text-yellow-700'
                          )}>
                            建议: {issue.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">快捷操作</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowEditForm(true)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
              >
                编辑反馈信息
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
              >
                查看数据分析
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEditForm && (
        <FeedbackForm
          feedback={feedback}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}
