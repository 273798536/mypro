import { useNavigate } from 'react-router-dom'
import { scenes } from '@/data/scenes'
import { Play, Music, AlertTriangle, Volume2, Zap } from 'lucide-react'

const difficultyConfig: Record<number, { tint: string; label: string; tag: string; tagIcon: React.ReactNode }> = {
  1: { tint: 'border-green-500/30 bg-green-500/5', label: '入门', tag: '✓ 同步训练', tagIcon: <Music className="w-3 h-3" /> },
  2: { tint: 'border-yellow-500/30 bg-yellow-500/5', label: '进阶', tag: '⏱ 延迟进入', tagIcon: <AlertTriangle className="w-3 h-3" /> },
  3: { tint: 'border-orange-500/30 bg-orange-500/5', label: '挑战', tag: '🔊 声部失衡', tagIcon: <Volume2 className="w-3 h-3" /> },
  4: { tint: 'border-red-500/30 bg-red-500/5', label: '困难', tag: '⚡ 队列堵塞', tagIcon: <Zap className="w-3 h-3" /> },
}

export default function SceneSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0d0d1a] px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl text-white mb-3 tracking-wider">
          机器人乐队排练
        </h1>
        <p className="text-gray-400 text-lg">
          选择排练场景，开始你的乐队指挥之旅
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
        {scenes.map((scene) => {
          const config = difficultyConfig[scene.difficulty]
          const accentColor = scene.musicians[0]?.color ?? '#00ff88'

          return (
            <div
              key={scene.id}
              className={`neon-border rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,255,136,0.15)] ${config.tint} relative overflow-hidden`}
              onClick={() => navigate(`/rehearsal/${scene.id}`)}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: accentColor }}
              />

              <div className="pl-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg text-white">
                    {scene.name}
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                    }}
                  >
                    {config.label}
                  </span>
                </div>

                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < scene.difficulty ? 'text-yellow-400' : 'text-gray-600'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  {scene.description}
                </p>

                <div className="flex items-center justify-between">
                  <span
                    className="text-xs px-2 py-1 rounded-md flex items-center gap-1"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                    }}
                  >
                    {config.tagIcon}
                    {config.tag}
                  </span>

                  <button
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      color: '#00ff88',
                      backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.1)'
                    }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    开始排练
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
