import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { pointsToSvgPath } from '../utils/geometry'

const OrigamiCanvas = () => {
  const { paper } = useGameStore()
  const { points, foldLines, selectedPointIndex, isFolding } = paper

  return (
    <div className="glass rounded-xl p-4 h-full flex items-center justify-center">
      <svg
        width="400"
        height="400"
        viewBox="0 0 400 400"
        className="bg-slate-900/50 rounded-lg"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0, 212, 170, 0.1)" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="paperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <filter id="paperShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        <rect width="400" height="400" fill="url(#grid)" />
        
        <g transform="translate(0, 0)">
          <motion.path
            d={pointsToSvgPath(points)}
            fill="url(#paperGradient)"
            stroke="#d97706"
            strokeWidth="2"
            filter="url(#paperShadow)"
            animate={{
              scale: isFolding ? 0.98 : 1,
              rotate: isFolding ? -1 : 0
            }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: 'center' }}
          />
          
          {foldLines.map((line, i) => (
            <line
              key={line.id || `line-${i}`}
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,3"
              opacity="0.8"
            />
          ))}
          
          {points.map((point, index) => (
            <g key={`point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selectedPointIndex === index ? 8 : 6}
                fill={selectedPointIndex === index ? '#00d4aa' : '#3b82f6'}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
              />
              <text
                x={point.x}
                y={point.y + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono"
              >
                P{index + 1}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

export default OrigamiCanvas
