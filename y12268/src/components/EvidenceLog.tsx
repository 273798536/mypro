import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { EvidenceEntry } from '@/types/game'
import { EVIDENCE_CATEGORY_LABELS, EVIDENCE_CATEGORY_BG } from '@/engine/evidence'

interface Props {
  entries: EvidenceEntry[]
}

function EntryCard({ entry }: { entry: EvidenceEntry }) {
  const [expanded, setExpanded] = useState(false)
  const bgStyle = EVIDENCE_CATEGORY_BG[entry.category]
  const borderClass = bgStyle.split(' ').find(c => c.startsWith('border-')) ?? 'border-slate-500/30'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className={`rounded-lg border-l-2 bg-[#243447]/50 p-3 ${borderClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-[#243447] px-1.5 py-0.5 text-[10px] text-slate-400">
          第{entry.turnNumber}回合
        </span>
        <span className={`text-xs font-medium ${bgStyle.split(' ').find(c => c.startsWith('text-')) ?? 'text-slate-300'}`}>
          {EVIDENCE_CATEGORY_LABELS[entry.category]}
        </span>
        {entry.consistencyFlag && (
          <AlertTriangle size={14} className="text-amber-400" />
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-300">{entry.description}</p>

      <button
        onClick={() => setExpanded(v => !v)}
        className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        计算详情
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden text-xs text-slate-500"
          >
            {entry.calculationDetail}
          </motion.p>
        )}
      </AnimatePresence>

      {entry.satisfactionSupplement !== null && (
        <p className="mt-1 text-xs text-purple-400">
          满意度补充: {entry.satisfactionSupplement}
        </p>
      )}
    </motion.div>
  )
}

export default function EvidenceLog({ entries }: Props) {
  const sorted = [...entries].reverse()

  return (
    <div className="flex flex-col overflow-y-auto bg-[#1B2838] p-4" style={{ maxHeight: 'calc(100vh - 80px)' }}>
      <h2
        className="mb-3 text-center text-sm tracking-widest text-[#D4A843]"
        style={{ fontFamily: '"Noto Serif SC", serif' }}
      >
        证据日志
      </h2>

      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {sorted.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>
      </div>

      {sorted.length === 0 && (
        <p className="mt-8 text-center text-xs text-slate-600">暂无证据记录</p>
      )}
    </div>
  )
}
