import { MessageSquare, User, Clock } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';

export default function NoteList() {
  const { currentSnapshot } = useGatekeeperStore();
  const notes = currentSnapshot?.notes ?? [];

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 text-[13px] text-slate-500">当前快照暂无备注</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <p className="text-[13px] leading-relaxed text-slate-200">{note.content}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {note.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {note.createdAt}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
