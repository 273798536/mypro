import { useStore } from '@/store/index'
import { User, Volume2, MapPin, FileText, ChevronRight, Box } from 'lucide-react'
import { useState, useEffect } from 'react'

const SECTION_ZH: Record<string, string> = {
  strings: '弦乐',
  woodwinds: '木管',
  brass: '铜管',
  percussion: '打击乐',
}

function PositionInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => {
    setRaw(String(value))
  }, [value])

  function handleBlur() {
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(n)
    else setRaw(String(value))
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[#d4a855] text-xs w-3">{label}</span>
      <input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        className="w-16 bg-[#0f1525] border border-[#1e2a42] rounded px-2 py-0.5 text-white text-xs outline-none focus:border-[#d4a855] transition-colors"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />
    </div>
  )
}

function MusicianPanel() {
  const musician = useStore((s) =>
    s.musicians.find((m) => m.id === s.selectedMusicianId)
  )
  const updatePosition = useStore((s) => s.updateMusicianPosition)
  const updateSP = useStore((s) => s.updateMusicianSoundPressure)
  const updateNote = useStore((s) => s.updateMusicianReportNote)
  const setMusicians = useStore((s) => s.setMusicians)
  const allMusicians = useStore((s) => s.musicians)

  if (!musician) return null

  function handleRadiationAngleChange(val: number) {
    const updated = allMusicians.map((m) =>
      m.id === musician.id ? { ...m, radiationAngle: val } : m
    )
    setMusicians(updated)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-[#d4a855]" />
        <h2 className="text-white text-base font-semibold">{musician.name}</h2>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#d4a855] text-sm">声部</span>
        <span className="text-white text-sm">
          {SECTION_ZH[musician.section] ?? musician.section}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#d4a855] text-sm">乐器</span>
        <span className="text-white text-sm">{musician.instrument}</span>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-4 h-4 text-[#d4a855]" />
          <span className="text-[#d4a855] text-sm font-medium">位置</span>
        </div>
        <div className="flex gap-3">
          <PositionInput
            label="X"
            value={musician.position.x}
            onChange={(v) =>
              updatePosition(musician.id, { ...musician.position, x: v })
            }
          />
          <PositionInput
            label="Y"
            value={musician.position.y}
            onChange={(v) =>
              updatePosition(musician.id, { ...musician.position, y: v })
            }
          />
          <PositionInput
            label="Z"
            value={musician.position.z}
            onChange={(v) =>
              updatePosition(musician.id, { ...musician.position, z: v })
            }
          />
        </div>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Volume2 className="w-4 h-4 text-[#d4a855]" />
          <span className="text-[#d4a855] text-sm font-medium">声压级</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={60}
            max={110}
            value={musician.soundPressure}
            onChange={(e) => updateSP(musician.id, Number(e.target.value))}
            className="flex-1 accent-[#d4a855] h-1.5 cursor-pointer"
          />
          <span
            className="text-white text-sm w-12 text-right"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {musician.soundPressure} dB
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ChevronRight className="w-4 h-4 text-[#d4a855]" />
          <span className="text-[#d4a855] text-sm font-medium">辐射角度</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={30}
            max={180}
            value={musician.radiationAngle}
            onChange={(e) => handleRadiationAngleChange(Number(e.target.value))}
            className="flex-1 accent-[#d4a855] h-1.5 cursor-pointer"
          />
          <span
            className="text-white text-sm w-10 text-right"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {musician.radiationAngle}°
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-4 h-4 text-[#d4a855]" />
          <span className="text-[#d4a855] text-sm font-medium">报告说明</span>
        </div>
        <textarea
          value={musician.reportNote}
          onChange={(e) => updateNote(musician.id, e.target.value)}
          rows={3}
          className="w-full bg-[#0a0e1a] border border-[#1e2a42] rounded px-2 py-1.5 text-white text-sm outline-none focus:border-[#d4a855] resize-none transition-colors"
        />
      </div>
    </div>
  )
}

function MaterialPanel() {
  const material = useStore((s) =>
    s.materials.find((m) => m.id === s.selectedMaterialId)
  )

  if (!material) return null

  const freqEntries = Object.entries(material.absorptionCoefficients).sort(
    ([a], [b]) => Number(a) - Number(b)
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Box className="w-5 h-5 text-[#5b9bd5]" />
        <h2 className="text-white text-base font-semibold">{material.name}</h2>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <span className="text-[#d4a855] text-sm font-medium block mb-2">位置</span>
        <div
          className="text-white text-sm"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          ({material.position.x}, {material.position.y}, {material.position.z})
        </div>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <span className="text-[#d4a855] text-sm font-medium block mb-2">尺寸</span>
        <div
          className="text-white text-sm"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {material.size.width} × {material.size.height} × {material.size.depth}
        </div>
      </div>

      <div className="rounded-lg bg-[#0f1525] border border-[#1e2a42] p-3">
        <span className="text-[#d4a855] text-sm font-medium block mb-3">吸声系数</span>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2a42]">
              <th className="text-[#d4a855] text-left py-1.5 font-medium">频率 (Hz)</th>
              <th className="text-[#d4a855] text-right py-1.5 font-medium">系数 (α)</th>
            </tr>
          </thead>
          <tbody>
            {freqEntries.map(([freq, coeff]) => {
              const isMissing = material.missingFrequencies.includes(freq)
              return (
                <tr key={freq} className="border-b border-[#1e2a42]/50">
                  <td
                    className={`py-1.5 ${isMissing ? 'text-red-400 font-semibold' : 'text-white'}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {freq}
                    {isMissing && ' ⚠'}
                  </td>
                  <td
                    className={`py-1.5 text-right ${isMissing ? 'text-red-400 font-semibold' : 'text-white'}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {coeff.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {material.missingFrequencies.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#1e2a42]/50">
            <span className="text-red-400 text-xs">
              缺失频段：{material.missingFrequencies.join('、')} Hz
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function SidebarPanel() {
  const selectedMusicianId = useStore((s) => s.selectedMusicianId)
  const selectedMaterialId = useStore((s) => s.selectedMaterialId)

  return (
    <div className="w-[30%] h-full bg-[#0a0e1a] border-l border-[#1e2a42] overflow-y-auto">
      {selectedMusicianId && <MusicianPanel />}
      {!selectedMusicianId && selectedMaterialId && <MaterialPanel />}
      {!selectedMusicianId && !selectedMaterialId && (
        <div className="flex items-center justify-center h-full p-6">
          <p className="text-[#5a6580] text-sm text-center leading-relaxed">
            点击3D场景中的乐手或材料查看详情
          </p>
        </div>
      )}
    </div>
  )
}
