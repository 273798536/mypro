import type { DiffItem } from '../../shared/types'

interface DiffPanelProps {
  title: string
  items: DiffItem[]
}

const changeTypeConfig = {
  added: { label: '新增', color: 'text-[#34D399]', bg: 'bg-[#0D2818]', border: 'border-[#10B981]/30' },
  removed: { label: '删除', color: 'text-[#F87171]', bg: 'bg-[#1C0A0A]', border: 'border-[#EF4444]/30' },
  modified: { label: '修改', color: 'text-[#FBBF24]', bg: 'bg-[#1A1708]', border: 'border-[#F59E0B]/30' },
}

export default function DiffPanel({ title, items }: DiffPanelProps) {
  return (
    <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#B0C4D8] text-sm font-medium">{title}</h3>
        <span className="text-[#5A7080] text-xs">{items.length} 项差异</span>
      </div>

      {items.length === 0 ? (
        <p className="text-[#5A7080] text-sm py-6 text-center">无差异</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const cfg = changeTypeConfig[item.changeType]
            return (
              <div key={item.id} className={`${cfg.bg} ${cfg.border} border rounded-lg p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#B0C4D8] text-sm font-medium">{item.field}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#5A7080] text-[10px] uppercase tracking-wider mb-1">前一版</p>
                    <p className={`text-sm font-mono ${item.fromValue === null ? 'text-[#5A7080]' : 'text-[#7B8FA3]'}`}>
                      {item.fromValue ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#5A7080] text-[10px] uppercase tracking-wider mb-1">当前版</p>
                    <p className={`text-sm font-mono ${item.toValue === null ? 'text-[#5A7080]' : 'text-[#E0E7EF] font-medium'}`}>
                      {item.toValue ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
