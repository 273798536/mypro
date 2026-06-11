import { useStore } from '@/store/useStore'
import { X } from 'lucide-react'

export default function HelpCard() {
  const open = useStore(s => s.helpCardOpen)
  const toggle = useStore(s => s.toggleHelpCard)

  if (!open) return null

  return (
    <div className="absolute top-14 right-4 z-20 w-64 bg-[#1a1a2e] border border-[#2a2a3e] rounded shadow-xl shadow-black/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3e]">
        <span className="text-xs font-semibold text-[#d4a853]">三步说明</span>
        <button onClick={toggle} className="text-[#6a6a8e] hover:text-[#c8c8d8]">
          <X size={12} />
        </button>
      </div>
      <div className="px-3 py-2 space-y-2 text-xs text-[#a0a0be] leading-relaxed">
        <div className="flex gap-2">
          <span className="text-[#d4a853] font-mono shrink-0">1.</span>
          <span><strong className="text-[#c8c8d8]">样例在哪</strong> → 点击顶部「加载样例」，自动填入5条巡检记录</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#d4a853] font-mono shrink-0">2.</span>
          <span><strong className="text-[#c8c8d8]">怎么重跑</strong> → 修改筛选条件后点「重跑」，画布和说明同步刷新</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#d4a853] font-mono shrink-0">3.</span>
          <span><strong className="text-[#c8c8d8]">查看CSV明细</strong> → 底部展开CSV面板，点「导出CSV」下载</span>
        </div>
      </div>
    </div>
  )
}
