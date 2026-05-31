import { useStore } from '@/store/index'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { key: 'strings', label: '弦乐', color: 'bg-amber-400', border: 'border-amber-400', ring: 'hover:shadow-amber-400/40' },
  { key: 'woodwinds', label: '木管', color: 'bg-sky-300', border: 'border-sky-300', ring: 'hover:shadow-sky-300/40' },
  { key: 'brass', label: '铜管', color: 'bg-orange-400', border: 'border-orange-400', ring: 'hover:shadow-orange-400/40' },
  { key: 'percussion', label: '打击乐', color: 'bg-purple-400', border: 'border-purple-400', ring: 'hover:shadow-purple-400/40' },
] as const

export function FilterBar() {
  const activeSections = useStore((s) => s.activeSections)
  const toggleSection = useStore((s) => s.toggleSection)
  const setAllSections = useStore((s) => s.setAllSections)

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {SECTIONS.map((sec) => {
        const active = activeSections.includes(sec.key)
        return (
          <button
            key={sec.key}
            onClick={() => toggleSection(sec.key)}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 border',
              active
                ? `${sec.border} ${sec.color}/20 text-white shadow-lg ${sec.ring} hover:shadow-lg`
                : 'border-white/20 text-white/40 hover:text-white/70 hover:border-white/40',
            )}
          >
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full transition-all',
                active ? sec.color : `border ${sec.border} bg-transparent`,
              )}
            />
            {sec.label}
          </button>
        )
      })}
      <button
        onClick={setAllSections}
        className="ml-2 rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/60 transition-all duration-200 hover:border-amber-400/60 hover:text-amber-300 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)]"
      >
        全选
      </button>
    </div>
  )
}
