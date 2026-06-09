import { useState } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { BookOpen, Plus, Search } from 'lucide-react';

export default function HistoricalAnswerPanel() {
  const { batch, addHistoricalAnswer } = useBatchStore();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('');

  const filtered = batch.problems
    .filter((p) => !p.isDuplicate)
    .filter((p) => !query || p.code.toLowerCase().includes(query.toLowerCase()) || p.title.includes(query));

  const submit = () => {
    if (!selectedId || !answer.trim()) return;
    addHistoricalAnswer({
      problemId: selectedId,
      answer: answer.trim(),
      source: source.trim() || '未标注来源',
    });
    setAnswer('');
    setSource('');
  };

  return (
    <section className="card-base p-5 animate-fade-up">
      <header className="flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-navy-500" />
        <h2 className="font-serif text-base font-semibold text-navy-700">历史答案补录</h2>
        <span className="text-xs text-navy-400">（补录后关联结论将自动刷新）</span>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-base">搜索题目</label>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入编号或标题关键字"
              className="input-base !pl-8 !py-1.5 text-xs"
            />
          </div>
          <div
            className="border border-navy-100 rounded scrollbar-thin overflow-y-auto"
            style={{ maxHeight: 180 }}
          >
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-1.5 text-xs border-b border-navy-50 transition-colors ${
                  selectedId === p.id ? 'bg-navy-600 text-white' : 'hover:bg-slate-50 text-navy-700'
                }`}
              >
                <span className="font-mono mr-2">{p.code}</span>
                {p.title}
                {batch.historicalAnswers.filter((h) => h.problemId === p.id).length > 0 && (
                  <span
                    className={`ml-2 text-[10px] ${
                      selectedId === p.id ? 'text-white/70' : 'text-teal-600'
                    }`}
                  >
                    已补 {batch.historicalAnswers.filter((h) => h.problemId === p.id).length} 条
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-navy-400">无匹配题目</div>
            )}
          </div>
        </div>

        <div>
          <label className="label-base">答案内容</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="填写参考答案或评分要点"
            rows={4}
            className="input-base text-xs resize-none"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="label-base">来源</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="例：命题组手册、官网答案"
                className="input-base !py-1.5 text-xs"
              />
            </div>
            <div className="flex items-end">
              <button onClick={submit} className="btn-primary w-full !py-1.5 text-xs">
                <Plus size={13} /> 补录并刷新结论
              </button>
            </div>
          </div>
          {selectedId && batch.historicalAnswers.filter((h) => h.problemId === selectedId).length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] text-navy-500 mb-1">已补录答案：</div>
              <ul className="space-y-1">
                {batch.historicalAnswers
                  .filter((h) => h.problemId === selectedId)
                  .map((h) => (
                    <li key={h.id} className="p-2 rounded bg-slate-50 border border-navy-100 text-[11px] text-navy-700">
                      <div>{h.answer}</div>
                      <div className="text-navy-400 mt-0.5">
                        来源：{h.source} · {new Date(h.recordedAt).toLocaleString('zh-CN')}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
