import { useState } from 'react';
import { Users, Upload, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function DataManagement() {
  const {
    contestants,
    scores,
    submissions,
    updateContestantScore,
    loadSampleData,
    clearAllData,
    getScoreByContestantId,
    getSubmissionByContestantId,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});

  const handleEdit = (contestantId: string) => {
    const score = getScoreByContestantId(contestantId);
    if (score) {
      const newEditScores: Record<string, number> = {};
      score.items.forEach((item) => {
        newEditScores[item.category] = item.points;
      });
      setEditScores(newEditScores);
    }
    setEditingId(contestantId);
  };

  const handleSave = (contestantId: string) => {
    const score = getScoreByContestantId(contestantId);
    if (score) {
      score.items.forEach((item) => {
        const newPoints = editScores[item.category];
        if (newPoints !== undefined && newPoints !== item.points) {
          updateContestantScore(contestantId, item.category, newPoints, '人工修改');
        }
      });
    }
    setEditingId(null);
    setEditScores({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditScores({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            数据管理
          </h1>
          <p className="text-slate-500 mt-1">管理选手信息和成绩数据</p>
        </div>
        <div className="flex gap-3">
          {contestants.length === 0 && (
            <button
              onClick={loadSampleData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              加载样例数据
            </button>
          )}
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清空数据
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">选手列表 ({contestants.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">选手</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">队伍</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">基础题</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">算法题</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">创新题</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">总分</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">提交时间</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {contestants.map((contestant) => {
                const score = getScoreByContestantId(contestant.id);
                const submission = getSubmissionByContestantId(contestant.id);
                const isEditing = editingId === contestant.id;

                return (
                  <tr
                    key={contestant.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{contestant.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{contestant.team}</td>
                    {score?.items.map((item) => (
                      <td key={item.category} className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editScores[item.category] ?? item.points}
                            onChange={(e) =>
                              setEditScores({
                                ...editScores,
                                [item.category]: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded text-center"
                          />
                        ) : (
                          <span className="text-slate-700">{item.points}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {score?.totalScore.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">
                      {submission
                        ? format(new Date(submission.submitTime), 'HH:mm:ss', { locale: zhCN })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleSave(contestant.id)}
                            className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(contestant.id)}
                          className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {contestants.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无选手数据</p>
            <p className="text-sm mt-1">点击"加载样例数据"开始使用</p>
          </div>
        )}
      </div>
    </div>
  );
}
