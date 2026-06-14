import { StickyNote, Link2 } from 'lucide-react'

interface Props {
  supplementaryNote: string
  conclusion: string
  onNoteChange: (note: string) => void
}

export default function SupplementaryNote({ supplementaryNote, conclusion, onNoteChange }: Props) {
  return (
    <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
        <StickyNote className="h-3.5 w-3.5" />
        后补备注与结论
      </h3>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">后补备注</label>
        <textarea
          value={supplementaryNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="填写后补备注，如：上次巡检已记录轻微磨损，本次复测..."
          className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] px-4 py-3 text-sm text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 resize-none transition-colors"
          rows={3}
        />
      </div>

      <div className="rounded-lg border border-[#1B3A5C]/5 bg-[#0F2640]/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-[#2D9B83]" />
          <span className="text-xs font-semibold text-[#1B3A5C]">联动结论</span>
        </div>
        <p className="text-sm leading-relaxed text-[#3A5A7A]">
          {conclusion || '输入测量值并填写备注后，结论将自动生成并关联备注内容。'}
        </p>
      </div>

      {supplementaryNote.trim() && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#2D9B83]/10 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#2D9B83] animate-pulse" />
          <span className="text-xs text-[#2D9B83]">备注已关联至结论</span>
        </div>
      )}
    </div>
  )
}
