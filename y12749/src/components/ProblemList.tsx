import { useState } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { Plus, Trash2, AlertTriangle, Copy } from 'lucide-react';
import type { Problem } from '@/types';

function difficultyTag(d: Problem['difficulty']) {
  if (d === 'easy') return <span className="tag-easy">简单</span>;
  if (d === 'medium') return <span className="tag-medium">中等</span>;
  if (d === 'hard') return <span className="tag-hard">困难</span>;
  return <span className="tag-pending">待判定</span>;
}

export default function ProblemList() {
  const { batch, addProblem, removeProblem, updateProblem, selectedProblemId, setSelectedProblemId } = useBatchStore();
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newScore, setNewScore] = useState('');

  const addRow = () => {
    if (!newCode.trim() || !newTitle.trim()) return;
    addProblem({
      code: newCode.trim(),
      title: newTitle.trim(),
      score: newScore ? Number(newScore) : null,
      difficulty: null,
      tags: [],
      source: 'manual',
    });
    setNewCode('');
    setNewTitle('');
    setNewScore('');
  };

  return (
    <section className="card-base p-5 flex flex-col animate-fade-up" style={{ animationDelay: '80ms' }}>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Copy size={16} className="text-navy-500" />
          <h2 className="font-serif text-base font-semibold text-navy-700">题目清单</h2>
          <span className="text-xs text-navy-400">（同轮复核）</span>
        </div>
        <span className="text-xs text-navy-500">
          共 <b className="text-navy-700">{batch.problems.length}</b> 道，有效{' '}
          <b className="text-teal-600">{batch.problems.filter((p) => !p.isDuplicate).length}</b>，重复{' '}
          <b className="text-red-600">{batch.problems.filter((p) => p.isDuplicate).length}</b>
        </span>
      </header>

      <div className="flex gap-2 mb-3">
        <input
          placeholder="题目编号"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="input-base !py-1.5 text-xs flex-[0_0_120px]"
        />
        <input
          placeholder="题目标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="input-base !py-1.5 text-xs flex-1"
        />
        <input
          placeholder="平均分（可选）"
          value={newScore}
          onChange={(e) => setNewScore(e.target.value)}
          className="input-base !py-1.5 text-xs flex-[0_0_120px]"
        />
        <button onClick={addRow} className="btn-primary !py-1.5 text-xs">
          <Plus size={14} /> 新增
        </button>
      </div>

      <div className="border border-navy-100 rounded overflow-hidden scrollbar-thin overflow-y-auto" style={{ maxHeight: 340 }}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-navy-100 sticky top-0">
            <tr className="text-navy-500">
              <th className="px-3 py-2 text-left font-medium w-10"></th>
              <th className="px-3 py-2 text-left font-medium">编号</th>
              <th className="px-3 py-2 text-left font-medium">标题</th>
              <th className="px-3 py-2 text-center font-medium w-20">分数</th>
              <th className="px-3 py-2 text-center font-medium w-20">难度</th>
              <th className="px-3 py-2 text-left font-medium w-28">来源</th>
              <th className="px-3 py-2 text-center font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {batch.problems.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedProblemId(p.id)}
                className={`border-b border-navy-50 cursor-pointer transition-colors ${
                  p.isDuplicate ? 'bg-duplicate-stripe' : selectedProblemId === p.id ? 'bg-navy-50' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-3 py-2 text-center">
                  {p.isDuplicate && <AlertTriangle size={14} className="text-red-500" />}
                </td>
                <td className="px-3 py-2 font-mono text-navy-700">{p.code}</td>
                <td className="px-3 py-2 text-navy-800">
                  {p.title}
                  {p.isDuplicate && p.duplicateReason && (
                    <div className="text-[10px] text-red-500 mt-0.5">{p.duplicateReason}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    className="w-16 px-1.5 py-0.5 rounded border border-navy-200 text-center focus:outline-none focus:border-navy-400"
                    type="number"
                    value={p.score ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateProblem(p.id, { score: e.target.value ? Number(e.target.value) : null })}
                  />
                </td>
                <td className="px-3 py-2 text-center">{difficultyTag(p.difficulty)}</td>
                <td className="px-3 py-2 text-navy-500">
                  {p.source === 'import' ? '批量导入' : '手动录入'}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProblem(p.id);
                    }}
                    className="text-navy-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
