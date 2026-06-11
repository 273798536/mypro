import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  accent?: string
}

export default function CollapsibleSection({ title, children, defaultOpen = true, accent }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-museum-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-museum-card hover:bg-museum-card/80 transition-colors"
      >
        <span className={`text-sm font-medium ${accent || 'text-museum-text'}`}>{title}</span>
        {open ? <ChevronDown size={16} className="text-museum-textDim" /> : <ChevronRight size={16} className="text-museum-textDim" />}
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  )
}
