import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getFoldLineFromPoints } from '../utils/geometry'

const ControlPanel = () => {
  const { paper, performFold, reset, undo, redo } = useGameStore()
  const [foldDirection, setFoldDirection] = useState<'horizontal' | 'vertical' | 'custom'>('horizontal')
  const [customAngle, setCustomAngle] = useState(90)

  const handleFold = () => {
    const centerX = 200
    const centerY = 200
    
    let foldLine
    
    if (foldDirection === 'horizontal') {
      foldLine = getFoldLineFromPoints(
        { x: 50, y: centerY },
        { x: 350, y: centerY }
      )
    } else if (foldDirection === 'vertical') {
      foldLine = getFoldLineFromPoints(
        { x: centerX, y: 50 },
        { x: centerX, y: 350 }
      )
    } else {
      const rad = (customAngle - 90) * (Math.PI / 180)
      const length = 150
      foldLine = getFoldLineFromPoints(
        { x: centerX - Math.cos(rad) * length, y: centerY - Math.sin(rad) * length },
        { x: centerX + Math.cos(rad) * length, y: centerY + Math.sin(rad) * length }
      )
    }
    
    performFold(foldLine, 'up')
  }

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="font-display text-lg text-cyan-400 mb-4">控制面板</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">折叠方向</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'horizontal', label: '水平', icon: '↔️' },
              { value: 'vertical', label: '垂直', icon: '↕️' },
              { value: 'custom', label: '自定义', icon: '🔄' }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFoldDirection(opt.value as any)}
                className={`p-2 rounded-lg text-sm transition-all
                  ${foldDirection === opt.value
                    ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                  }`}
              >
                <span className="block text-lg">{opt.icon}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {foldDirection === 'custom' && (
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              折叠角度: {customAngle}°
            </label>
            <input
              type="range"
              min="0"
              max="180"
              value={customAngle}
              onChange={(e) => setCustomAngle(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        <button
          onClick={handleFold}
          disabled={paper.isFolding}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 
            text-white font-bold rounded-lg transition-all
            hover:from-cyan-400 hover:to-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paper.isFolding ? '折叠中...' : '执行折叠'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={undo}
            className="flex-1 py-2 bg-slate-700 text-gray-300 rounded-lg
              hover:bg-slate-600 transition-all text-sm"
          >
            ↩️ 撤销
          </button>
          <button
            onClick={redo}
            className="flex-1 py-2 bg-slate-700 text-gray-300 rounded-lg
              hover:bg-slate-600 transition-all text-sm"
          >
            ↪️ 重做
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2 bg-red-900/50 text-red-400 rounded-lg
              hover:bg-red-800/50 transition-all text-sm"
          >
            🔄 重置
          </button>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
