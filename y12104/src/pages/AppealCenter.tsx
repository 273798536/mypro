import { useState } from 'react';
import { AlertTriangle, Check, X, MessageSquare, Clock, UserCheck, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AppealType } from '../types';

export default function AppealCenter() {
  const { appeals, contestants, submitAppeal, reviewAppeal, getContestantById } = useAppStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAppeal, setNewAppeal] = useState({
    contestantId: '',
    type: 'score' as AppealType,
    reason: '',
  });
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});

  const pendingAppeals = appeals.filter((a) => a.status === 'pending');
  const resolvedAppeals = appeals.filter((a) => a.status !== 'pending');

  const handleSubmit = () => {
    if (!newAppeal.contestantId && newAppeal.reason) {
      submitAppeal(newAppeal.contestantId, newAppeal.type, newAppeal.reason);
      setNewAppeal({ contestantId: '', type: 'score', reason: '' });
      setShowCreateForm(false);
    }
  };

  const handleReview = (appealId: string, approved: boolean) => {
    reviewAppeal(appealId, approved, reviewerNotes[appealId]);
    const newNotes = { ...reviewerNotes };
    delete newNotes[appealId];
    setReviewerNotes(newNotes);
  };

  const getTypeLabel = (type: AppealType) => {
    switch (type) {
      case 'score':
        return '成绩申诉';
      case 'rule':
        return '规则申诉';
      case 'tiebreak':
        return '同分申诉';
      default:
        return '其他';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审核';
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已驳回';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-500" />
            申诉中心
          </h1>
          <p className="text-slate-500 mt-1">处理选手申诉，记录审核结果</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增申诉
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">提交新申诉</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">选择选手</label>
              <select
                value={newAppeal.contestantId}
                onChange={(e) => setNewAppeal({ ...newAppeal, contestantId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">请选择选手</option>
                {contestants.map((c) => (
                  <option key={c.id}>{c.name} - {c.team}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">申诉类型</label>
              <select
                value={newAppeal.type}
                onChange={(e) => setNewAppeal({ ...newAppeal, type: e.target.value as AppealType })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="score">成绩申诉</option>
                <option value="rule">规则申诉</option>
                <option value="tiebreak">同分申诉</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">申诉理由</label>
            <textarea
              value={newAppeal.reason}
              onChange={(e) => setNewAppeal({ ...newAppeal, reason: e.target.value })}
              placeholder="请详细描述申诉理由"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              提交申诉
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          待处理 ({pendingAppeals.length})
        </h2>

        {pendingAppeals.length > 0 ? (
          <div className="space-y-4">
            {pendingAppeals.map((appeal) => {
              const contestant = getContestantById(appeal.contestantId);
              return (
                <div
                  key={appeal.id}
                  className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden"
                >
                  <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(appeal.status)}`}>
                        {getStatusLabel(appeal.status)}
                      </span>
                      <span className="text-amber-800 font-medium">
                        {getTypeLabel(appeal.type)}
                      </span>
                    </div>
                    <span className="text-sm text-amber-600">
                      {format(new Date(appeal.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-10 h-10 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800">{contestant?.name}</p>
                          <p className="text-sm text-slate-500">{contestant?.team}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-600">{appeal.reason}</p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">审核意见</label>
                      <textarea
                        value={reviewerNotes[appeal.id] || ''}
                        onChange={(e) =>
                          setReviewerNotes({ ...reviewerNotes, [appeal.id]: e.target.value })
                        }
                        placeholder="输入审核意见（可选）"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleReview(appeal.id, false)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        驳回
                      </button>
                      <button
                        onClick={() => handleReview(appeal.id, true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        批准
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">暂无待处理申诉</p>
            <p className="text-slate-400 text-sm mt-1">所有申诉已处理完毕</p>
          </div>
        )}
      </div>

      {resolvedAppeals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            已处理 ({resolvedAppeals.length})
          </h2>

          <div className="space-y-3">
            {resolvedAppeals.map((appeal) => {
              const contestant = getContestantById(appeal.contestantId);
              return (
                <div
                  key={appeal.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(appeal.status)}`}>
                        {getStatusLabel(appeal.status)}
                      </span>
                      <span className="font-medium text-slate-800">{contestant?.name}</span>
                      <span className="text-slate-500">{getTypeLabel(appeal.type)}</span>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>审核人: {appeal.reviewer}</p>
                      <p>
                        {appeal.resolvedAt &&
                          format(new Date(appeal.resolvedAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                  {appeal.reviewerNotes && (
                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      审核意见: {appeal.reviewerNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
