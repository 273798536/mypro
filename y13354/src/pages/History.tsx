import Timeline from '@/components/Timeline';
import OverrideRecord from '@/components/OverrideRecord';
import NoteList from '@/components/NoteList';
import AttachmentGrid from '@/components/AttachmentGrid';
import { GitBranch, StickyNote, Image as ImageIcon, MessageSquare } from 'lucide-react';

export default function History() {
  const tabs = [
    { key: 'snapshots', label: '版本快照', icon: GitBranch },
    { key: 'overrides', label: '人工改判', icon: StickyNote },
    { key: 'notes', label: '备注历史', icon: MessageSquare },
    { key: 'attachments', label: '截图附件', icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-white">历史追踪</h1>
        <p className="mt-1 text-[12px] text-slate-400">
          查看所有版本快照、人工改判记录、备注与附件，便于交接追溯
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-white">版本快照时间线</h2>
          </div>
          <Timeline />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-white">人工改判记录</h2>
            <p className="text-[11px] text-slate-500">（所有改判永久保留，下一班同事可见）</p>
          </div>
          <OverrideRecord />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-white">备注历史</h2>
            <p className="text-[11px] text-slate-500">（特征快照里后续补充的备注均会保留）</p>
          </div>
          <NoteList />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-white">旧版本截图与附件</h2>
          </div>
          <AttachmentGrid />
        </section>
      </div>
    </div>
  );
}
