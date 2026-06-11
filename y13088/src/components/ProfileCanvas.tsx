import { useStore, getSelectedRecordLights, getSelectedLight } from '@/store/useStore'
import type { LightPoint } from '@/types'

function typeLabel(t: string): string {
  const map: Record<string, string> = { top: '顶部', side: '侧面', bottom: '底部', accent: '重点' }
  return map[t] ?? t
}

export default function ProfileCanvas() {
  const selectedRecordId = useStore(s => s.selectedRecordId)
  const selectedLightId = useStore(s => s.selectedLightId)
  const selectLight = useStore(s => s.selectLight)
  const filteredRecords = useStore(s => s.filteredRecords)
  const store = useStore()

  const record = filteredRecords.find(r => r.id === selectedRecordId)
  const lights = record?.lights ?? []
  const selectedLight = getSelectedLight(store)

  const svgW = 500
  const svgH = 260

  return (
    <div className="relative w-full h-full bg-[#0d0d1a] rounded overflow-hidden">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowAnomaly">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="60" y="20" width="380" height="220" rx="4" fill="url(#caseGrad)" stroke="#3a3a5e" strokeWidth="1.5" />
        <rect x="60" y="20" width="380" height="8" rx="2" fill="#3a3a5e" />

        <rect x="80" y="35" width="340" height="190" rx="2" fill="url(#glassGrad)" stroke="#4a4a6e" strokeWidth="0.5" strokeDasharray="4,3" />

        <line x1="70" y1="120" x2="430" y2="120" stroke="#3a3a5e" strokeWidth="0.5" strokeDasharray="2,4" />
        <line x1="250" y1="30" x2="250" y2="240" stroke="#3a3a5e" strokeWidth="0.5" strokeDasharray="2,4" />

        <text x="445" y="125" fill="#5a5a7e" fontSize="9" fontFamily="monospace">中轴</text>
        <text x="255" y="15" fill="#5a5a7e" fontSize="9" fontFamily="monospace">剖面</text>

        <rect x="160" y="170" width="180" height="50" rx="3" fill="#1e1e30" stroke="#4a4a6e" strokeWidth="0.5" />
        <text x="250" y="200" textAnchor="middle" fill="#6a6a8e" fontSize="11" fontFamily="sans-serif">展品区域</text>

        {lights.map(light => (
          <LightMarker
            key={light.id}
            light={light}
            isSelected={selectedLightId === light.id}
            onClick={() => selectLight(light.id)}
          />
        ))}

        {selectedLight && (
          <g>
            <line
              x1={selectedLight.position.x}
              y1={selectedLight.position.y}
              x2={selectedLight.position.x}
              y2={selectedLight.position.y + 60}
              stroke={selectedLight.isAnomaly ? '#e74c3c' : '#d4a853'}
              strokeWidth="0.8"
              strokeDasharray="3,2"
              opacity="0.6"
            />
            <text
              x={selectedLight.position.x}
              y={selectedLight.position.y + 72}
              textAnchor="middle"
              fill="#d4a853"
              fontSize="8"
              fontFamily="sans-serif"
            >
              {selectedLight.label}
            </text>
          </g>
        )}

        <text x="15" y="35" fill="#5a5a7e" fontSize="8" fontFamily="monospace">顶</text>
        <text x="15" y="235" fill="#5a5a7e" fontSize="8" fontFamily="monospace">底</text>
        <text x="60" y="255" fill="#5a5a7e" fontSize="8" fontFamily="monospace">← 展柜剖面侧视图 →</text>
      </svg>

      <div className="absolute top-2 left-3 text-[10px] text-[#5a5a7e] font-mono">
        {record ? `${record.displayCaseId} · ${record.floor} ${record.unit}` : '未选择展柜'}
      </div>
    </div>
  )
}

function LightMarker({ light, isSelected, onClick }: { light: LightPoint; isSelected: boolean; onClick: () => void }) {
  const cx = light.position.x
  const cy = light.position.y
  const color = light.isAnomaly ? '#e74c3c' : '#d4a853'
  const filterId = light.isAnomaly ? 'glowAnomaly' : 'glow'

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={isSelected ? 10 : 7} fill={color} opacity={0.15} filter={`url(#${filterId})`} />
      <circle cx={cx} cy={cy} r={isSelected ? 5 : 3.5} fill={color} opacity={0.9} />
      <circle cx={cx} cy={cy} r={1.5} fill="#fff" opacity={0.8} />

      {light.isAnomaly && (
        <circle cx={cx} cy={cy} r={isSelected ? 12 : 9} fill="none" stroke="#e74c3c" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6">
          <animate attributeName="r" values="9;12;9" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {isSelected && (
        <circle cx={cx} cy={cy} r="14" fill="none" stroke={color} strokeWidth="1" opacity="0.5">
          <animate attributeName="r" values="10;16;10" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill={color}
        fontSize="7"
        fontFamily="sans-serif"
        opacity={isSelected ? 1 : 0.7}
      >
        {light.label}
      </text>
    </g>
  )
}
