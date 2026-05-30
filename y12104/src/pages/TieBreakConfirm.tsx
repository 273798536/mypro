import { useState } from 'react';
import { Scale, Check, X, GripVertical, Clock, User, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function TieBreakConfirm() {
  const {
    pendingTieBreaks,
    currentRule,
    confirmTieBreak,
    getContestantById,
    getScoreByContestantId,
    getSubmissionByContestantId,
  } = useAppStore();

  const [notes, setNotes] = useState<Record<string, string>>({});

  const pendingGroups = pendingTieBreaks.filter((g) => g.status === 'pending');
  const confirmedGroups = pendingTieBreaks.filter((g) => g.status === 'confirmed');

  const handleMoveUp = (groupId: string, index: number) => {
    const group = pendingGroups.find((g) => g.id === groupId);
    if (!group || index === 0) return;
  };

  const handleMoveDown = (groupId: string, index: number) => {
    const group = pendingGroups.find((g) => g.id === groupId);
    if (!group || index === group.contestantIds.length - 1) return;
  };

  const handleConfirm = (groupId: string) => {
    const group = pendingGroups.find((g) => g.id === groupId);
    if (!group) return;
    confirmTieBreak(groupId, group.contestantIds, notes[groupId]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Scale className="w-7 h-7 text-amber-500" />
          同分确认
        </h1>
        <p className="text-slate-500 mt-1">处理同分并列情况，确认最终排名</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">同分处理规则</p>
            <ol className="text-sm text-amber-700 mt-2 list-decimal list-inside space-y-1">
              {currentRule.tieBreakRules.map((rule, index) => (
                <li key={index}>
                  {rule.rule === 'submissionTime'
                    ? '提交时间（早提交优先）'
                    : rule.rule === 'specificCategory'
                    ? `${rule.category}得分`
                    : '人工确认'}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          待确认 ({pendingGroups.length})
        </h2>

        {pendingGroups.length > 0 ? (
          <div className="space-y-4">
            {pendingGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden"
              >
                <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-amber-800">第 {groupIndex + 1} 组同分</span>
                    <span className="ml-3 text-amber-600">总分: {group.score.toFixed(2)}</span>
                    <span className="ml-3 text-sm text-amber-500">
                      {group.contestantIds.length} 位选手
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    {group.contestantIds.map((cid, index) => {
                      const contestant = getContestantById(cid);
                      const submission = getSubmissionByContestantId(cid);
                      const score = getScoreByContestantId(cid);
                      const algoScore = score?.items.find((i) => i.category === '算法题');

                      return (
                        <div
                          key={cid}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-slate-800">{contestant?.name}</p>
                              <p className="text-sm text-slate-500">{contestant?.team}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-slate-500">提交时间</p>
                              <p className="font-medium text-slate-700">
                                {submission
                                  ? format(new Date(submission.submitTime), 'HH:mm:ss', {
                                      locale: zhCN,
                                    })
                                  : '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500">算法题</p>
                              <p className="font-medium text-slate-700">{algoScore?.points || 0}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">确认备注</label>
                    <textarea
                      value={notes[group.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [group.id]: e.target.value })}
                      placeholder="输入确认说明（可选）"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => handleConfirm(group.id)}
                      className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      确认此排名
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">暂无待确认的同分情况</p>
            <p className="text-slate-400 text-sm mt-1">所有同分排名已确认完毕</p>
          </div>
        )}
      </div>

      {confirmedGroups.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            已确认 ({confirmedGroups.length})
          </h2>

          <div className="space-y-4">
            {confirmedGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden"
              >
                <div className="bg-green-50 px-5 py-3 border-b border-green-200 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-green-800">同分组 {groupIndex + 1}</span>
                    <span className="ml-3 text-green-600">总分: {group.score.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-green-600">
                    确认人: {group.confirmedBy} |{' '}
                    {group.confirmedAt &&
                      format(new Date(group.confirmedAt), 'MM-dd HH:mm', { locale: zhCN })}
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2">
                    {group.contestantIds.map((cid, index) => {
                      const contestant = getContestantById(cid);
                      return (
                        <div
                          key={cid}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-800">{contestant?.name}</span>
                          <span className="text-slate-500">{contestant?.team}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
