import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, ScrollText } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { VERSIONS } from '@/data/samples';
import { ERROR_CODES, errorMessage } from '@/lib/contract';
import type { Judge, VersionNote } from '@/types';

const EMPTY: VersionNote = {
  version: '',
  date: '',
  author: '阿宁',
  summary: '',
  changedJudgments: [],
};

export function VersionNotePanel() {
  const open = useReviewStore((s) => s.versionNoteOpen);
  const setOpen = useReviewStore((s) => s.setVersionNoteOpen);
  const version = useReviewStore((s) => s.version);
  const versionNotes = useReviewStore((s) => s.versionNotes);
  const upsert = useReviewStore((s) => s.upsertVersionNote);
  const setError = useReviewStore((s) => s.setError);

  const [draft, setDraft] = useState<VersionNote>(() => {
    const existing = versionNotes.find((n) => n.version === version);
    return existing ? { ...existing } : { ...EMPTY, version: version === 'all' ? '' : version };
  });

  useEffect(() => {
    if (!open) return;
    const existing = versionNotes.find((n) => n.version === version);
    setDraft(existing ? { ...existing } : { ...EMPTY, version: version === 'all' ? '' : version });
  }, [open, version, versionNotes]);

  if (!open) return null;

  const update = (patch: Partial<VersionNote>) => setDraft((d) => ({ ...d, ...patch }));
  const addRow = () =>
    setDraft((d) => ({
      ...d,
      changedJudgments: [...d.changedJudgments, { sampleId: '', from: 'OK', to: 'NG' }],
    }));
  const updateRow = (idx: number, patch: Partial<{ sampleId: string; from: Judge; to: Judge }>) =>
    setDraft((d) => ({
      ...d,
      changedJudgments: d.changedJudgments.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  const removeRow = (idx: number) =>
    setDraft((d) => ({
      ...d,
      changedJudgments: d.changedJudgments.filter((_, i) => i !== idx),
    }));

  const save = () => {
    if (!draft.version.trim()) {
      setError({
        code: ERROR_CODES.VERSION_NOTE_MISSING,
        message: errorMessage(ERROR_CODES.VERSION_NOTE_MISSING, '版本号不可为空'),
      });
      return;
    }
    upsert({
      ...draft,
      version: draft.version.trim(),
      date: draft.date.trim() || new Date().toISOString().slice(0, 10),
    });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl animate-slidein border border-graphite-700 bg-graphite-900 shadow-2xl">
        <header className="flex items-center gap-3 border-b border-graphite-700 p-4">
          <ScrollText size={16} className="text-amberx-400" />
          <h2 className="font-display text-base uppercase tracking-wider">版本说明</h2>
          <span className="font-mono text-[11px] text-zinc-500">评审前补一条备注 · 本版改变了哪些判断</span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-zinc-500 hover:text-zinc-200"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-1">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                版本
              </span>
              <input
                list="version-options"
                className="field w-full"
                value={draft.version}
                onChange={(e) => update({ version: e.target.value })}
                placeholder="v2.4.1"
              />
              <datalist id="version-options">
                {VERSIONS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <label className="col-span-1">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                日期
              </span>
              <input
                className="field w-full"
                value={draft.date}
                onChange={(e) => update({ date: e.target.value })}
                placeholder="2024-09-08"
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                作者
              </span>
              <input
                className="field w-full"
                value={draft.author}
                onChange={(e) => update({ author: e.target.value })}
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              备注
            </span>
            <textarea
              className="field h-20 w-full resize-none"
              value={draft.summary}
              onChange={(e) => update({ summary: e.target.value })}
              placeholder="说清本版改变了哪些判断、为什么"
            />
          </label>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                本版改变的判断
              </h3>
              <button onClick={addRow} className="btn btn-amber !px-2 !py-1 text-xs">
                <Plus size={12} /> 增条
              </button>
            </div>
            {draft.changedJudgments.length === 0 ? (
              <p className="border border-dashed border-graphite-700 px-3 py-3 text-center font-mono text-xs text-zinc-600">
                暂无改变判断记录
              </p>
            ) : (
              <div className="space-y-2">
                {draft.changedJudgments.map((c, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border border-graphite-700 p-2"
                  >
                    <input
                      className="field w-full"
                      placeholder="样本ID，如 S-005"
                      value={c.sampleId}
                      onChange={(e) => updateRow(idx, { sampleId: e.target.value })}
                    />
                    <select
                      className="field"
                      value={c.from}
                      onChange={(e) => updateRow(idx, { from: e.target.value as Judge })}
                    >
                      <option value="OK">OK</option>
                      <option value="NG">NG</option>
                    </select>
                    <span className="font-mono text-zinc-500">→</span>
                    <div className="flex items-center gap-1">
                      <select
                        className="field"
                        value={c.to}
                        onChange={(e) => updateRow(idx, { to: e.target.value as Judge })}
                      >
                        <option value="OK">OK</option>
                        <option value="NG">NG</option>
                      </select>
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-zinc-500 hover:text-fail"
                        aria-label="删除该行"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-graphite-700 p-4">
          <span className="font-mono text-[11px] text-zinc-500">保存到本地（localStorage）</span>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="btn btn-amber" onClick={save}>
              <Save size={14} /> 保存
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
