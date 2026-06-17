import { ChevronRight, FileText } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';

export function VersionBar() {
  const version = useReviewStore((s) => s.version);
  const notes = useReviewStore((s) => s.versionNotes);
  const setOpen = useReviewStore((s) => s.setVersionNoteOpen);
  const note = version === 'all' ? undefined : notes.find((n) => n.version === version);
  const changed = note?.changedJudgments.length ?? 0;

  return (
    <button
      onClick={() => setOpen(true)}
      className="panel group flex w-full items-center gap-4 border-amberx-500/30 p-3 text-left transition-colors hover:border-amberx-500/60"
    >
      <span className="flex h-9 items-center gap-2 border-r border-graphite-700 pr-4">
        <FileText size={16} className="text-amberx-400" />
        <span className="font-display text-lg leading-none">
          {version === 'all' ? '多版本对比' : version}
        </span>
      </span>
      {note ? (
        <>
          <p className="line-clamp-1 flex-1 text-sm text-zinc-300">{note.summary}</p>
          <span className="font-mono text-[11px] text-zinc-500">
            {note.author} · {note.date}
          </span>
          <span className="chip border-amberx-500/40 text-amberx-400">本版改变判断 {changed}</span>
        </>
      ) : (
        <p className="flex-1 text-sm text-zinc-500">
          {version === 'all'
            ? '多版本对比模式：重复评测按跨版本聚合展示。'
            : '该版本暂无版本说明 —— 点击补充一条'}
        </p>
      )}
      <ChevronRight
        size={16}
        className="text-zinc-500 transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
