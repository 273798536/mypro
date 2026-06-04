import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Package, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'

export default function EquipmentPanel() {
  const equipment = useGameStore((s) => s.equipment)
  const addEquipment = useGameStore((s) => s.addEquipment)
  const removeEquipment = useGameStore((s) => s.removeEquipment)

  const [collapsed, setCollapsed] = useState(false)
  const [name, setName] = useState('')
  const [spec, setSpec] = useState('')
  const [flashing, setFlashing] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const prevCountRef = useRef(equipment.length)

  useEffect(() => {
    if (equipment.length > prevCountRef.current) {
      setFlashing(true)
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setFlashing(false), 600)
    }
    prevCountRef.current = equipment.length
  }, [equipment.length])

  const handleAdd = () => {
    const trimmedName = name.trim()
    const trimmedSpec = spec.trim()
    if (!trimmedName) return
    addEquipment(trimmedName, trimmedSpec)
    setName('')
    setSpec('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-white shadow-md transition-shadow',
        flashing && 'animate-flash-border'
      )}
    >
      <style>{`
        @keyframes flash-border {
          0% { box-shadow: 0 0 0 2px #ED8936, 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          100% { box-shadow: 0 0 0 0px transparent, 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        }
        .animate-flash-border {
          animation: flash-border 0.6s ease-out;
        }
      `}</style>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800">
          <Package className="h-4 w-4 text-gray-500" />
          设备清单
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-600">
            {equipment.length}
          </span>
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {equipment.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              尚未补录设备
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {equipment.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.name}
                    </p>
                    {item.spec && (
                      <p className="truncate text-xs text-gray-400">
                        {item.spec}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEquipment(item.id)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-gray-200 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="设备名称"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-300 focus:border-orange-400"
            />
            <input
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="规格"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-300 focus:border-orange-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              补录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
