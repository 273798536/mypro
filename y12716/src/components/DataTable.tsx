import { useState } from 'react';
import { Pencil, Trash2, AlertTriangle, Database, FileText } from 'lucide-react';
import type { Question, DataSource } from '@/types';
import { SOURCE_LABELS, CHAPTER_ORDER } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const sourceColors: Record<DataSource, string> = {
  shared_drive: 'bg-[#2d7b64]/30 text-[#7bc9a7] border-[#2d936c]/40',
  legacy_sheet: 'bg-[#2d5a8f]/30 text-[#8ab8e0] border-[#4a8ec2]/40',
  draft_note: 'bg-[#8b6a2d]/30 text-[#e0c080] border-[#d4a24c]/40',
  manual: 'bg-[#7d3d5a]/30 text-[#e0a0c0] border-[#c07098]/40',
};

export function DataTable() {
  const { questions, updateQuestion, removeQuestion } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Question>>({});
  const [filterSource, setFilterSource] = useState<string>('all');
  const [hasGap, setHasGap] = useState(false);

  const filtered = questions.filter((q) => {
    if (filterSource !== 'all' && q.source !== filterSource) return false;
    if (hasGap) {
      return q.difficulty === null || q.unit === null || q.errorRate === null;
    }
    return true;
  });

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditDraft({ ...q });
  };

  const saveEdit = () => {
    if (editingId) {
      updateQuestion(editingId, editDraft);
      setEditingId(null);
      setEditDraft({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[#d4a24c]" />
          <h3 className="font-serif text-lg font-semibold">题目数据</h3>
          <span className="ml-2 rounded-full bg-[#1e3a5f] px-2 py-0.5 text-xs text-gray-300">
            共 {questions.length} 条
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#d4a24c]"
          >
            <option value="all">全部来源</option>
            <option value="shared_drive">共享盘-学生错题</option>
            <option value="legacy_sheet">旧表-题目清单</option>
            <option value="draft_note">草稿-人工备注</option>
            <option value="manual">手动录入</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasGap}
              onChange={(e) => setHasGap(e.target.checked)}
              className="accent-[#d4a24c]"
            />
            仅看有缺口
          </label>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#173252] text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">题目名称</th>
              <th className="px-3 py-2 text-left font-medium">章节</th>
              <th className="px-3 py-2 text-center font-medium">难度</th>
              <th className="px-3 py-2 text-center font-medium">单位</th>
              <th className="px-3 py-2 text-center font-medium">错题率</th>
              <th className="px-3 py-2 text-left font-medium">依赖</th>
              <th className="px-3 py-2 text-left font-medium">来源</th>
              <th className="px-3 py-2 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q, idx) => {
              const isEditing = editingId === q.id;
              const hasMissing = q.difficulty === null || q.unit === null || q.errorRate === null;
              const rowBg = idx % 2 === 0 ? 'bg-[#0f2138]' : 'bg-[#12283f]';

              return (
                <tr
                  key={q.id}
                  className={`${rowBg} border-t border-[#1a2f4d] transition-colors hover:bg-[#1a2f4d]/80`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[#d4a24c]">{q.id}</span>
                      {hasMissing && (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#c85353] animate-pulse" aria-label="数据有缺口" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 min-w-[180px]">
                    {isEditing ? (
                      <input
                        value={editDraft.name || ''}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-sm text-white focus:outline-none focus:border-[#d4a24c]"
                      />
                    ) : (
                      <span className="text-gray-100">{q.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        value={editDraft.chapter || ''}
                        onChange={(e) => setEditDraft({ ...editDraft, chapter: e.target.value })}
                        className="rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#d4a24c]"
                      >
                        {Object.keys(CHAPTER_ORDER).map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-300">{q.chapter}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={editDraft.difficulty ?? ''}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            difficulty: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-16 rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-[#d4a24c]"
                      />
                    ) : q.difficulty === null ? (
                      <span className="rounded bg-[#c85353]/20 px-2 py-0.5 text-xs text-[#e99090]">缺失</span>
                    ) : (
                      <span
                        className={`font-mono ${
                          q.difficulty >= 4 ? 'text-[#e99090]' : q.difficulty >= 3 ? 'text-[#d4a24c]' : 'text-[#7bc9a7]'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        value={editDraft.unit ?? ''}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, unit: e.target.value === '' ? null : e.target.value })
                        }
                        placeholder="题/分钟"
                        className="w-16 rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-[#d4a24c]"
                      />
                    ) : q.unit === null ? (
                      <span className="rounded bg-[#c85353]/20 px-2 py-0.5 text-xs text-[#e99090]">缺失</span>
                    ) : (
                      <span className="rounded-full bg-[#2d936c]/10 px-2 py-0.5 text-xs text-[#7bc9a7]">{q.unit}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={editDraft.errorRate ?? ''}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            errorRate: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-16 rounded border border-[#2a4a73] bg-[#0f2138] px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-[#d4a24c]"
                      />
                    ) : q.errorRate === null ? (
                      <span className="rounded bg-[#c85353]/20 px-2 py-0.5 text-xs text-[#e99090]">缺失</span>
                    ) : (
                      <span className="font-mono text-xs text-gray-200">
                        {Math.round(q.errorRate * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {q.dependencies.length === 0 ? (
                      <span className="text-xs text-gray-500">无</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {q.dependencies.map((d) => (
                          <span
                            key={d}
                            className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-[#8ab8e0]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${sourceColors[q.source]}`}
                    >
                      <FileText className="h-3 w-3" />
                      {SOURCE_LABELS[q.source]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="rounded bg-[#2d936c] px-2 py-1 text-xs text-white hover:bg-[#35a97e] transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded bg-[#3a3a3a] px-2 py-1 text-xs text-white hover:bg-[#555] transition-colors"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(q)}
                            className="rounded p-1 text-gray-400 hover:bg-[#1e3a5f] hover:text-[#d4a24c] transition-colors"
                            title="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeQuestion(q.id)}
                            className="rounded p-1 text-gray-400 hover:bg-[#c85353]/20 hover:text-[#e99090] transition-colors"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-500 text-sm">暂无数据</div>
        )}
      </div>
    </div>
  );
}
