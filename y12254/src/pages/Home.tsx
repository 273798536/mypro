import { useNavigate } from 'react-router-dom'
import { LEVELS } from '@/utils/levels'
import { useState } from 'react'
import { BookOpen, Star, ArrowRight, X } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [showRules, setShowRules] = useState(false)

  const difficultyStars = (level: typeof LEVELS[0]) => {
    const count = level.anomalies.length === 0 ? (level.initialWindowCount === 1 ? 1 : 2) : 3
    return Array.from({ length: 3 }, (_, i) => (
      <Star key={i} size={14} className={i < count ? 'text-yellow-400 fill-yellow-400' : 'text-milk-200'} />
    ))
  }

  return (
    <div className="min-h-screen bg-milk-50">
      <header className="bg-gradient-to-r from-milk-700 via-milk-600 to-milk-400 text-white py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="font-display text-4xl mb-2">🧋 排队论奶茶店</h1>
          <p className="text-milk-200 text-sm">
            通过模拟奶茶店排队，直观理解排队论核心参数 λ（到达率）、μ（服务率）、c（窗口数）对系统性能的影响
          </p>
          <button
            onClick={() => setShowRules(true)}
            className="mt-3 text-sm bg-white/20 px-4 py-1.5 rounded-full hover:bg-white/30 transition-all flex items-center gap-1"
          >
            <BookOpen size={14} /> 游戏规则
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl py-8 px-4">
        <h2 className="font-display text-2xl text-milk-700 mb-6">选择关卡</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LEVELS.map((level) => (
            <div
              key={level.id}
              className="card-hover group"
              onClick={() => navigate(`/game/${level.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs bg-milk-100 text-milk-600 px-2 py-0.5 rounded-full font-mono">
                  {level.model}
                </span>
                <div className="flex gap-0.5">{difficultyStars(level)}</div>
              </div>

              <h3 className="font-display text-lg text-milk-700 mb-1">{level.name}</h3>
              <p className="text-xs text-milk-500 mb-3 line-clamp-2">{level.description}</p>

              <div className="space-y-1 text-xs text-milk-400 mb-4">
                <div className="flex justify-between">
                  <span>到达率 λ</span>
                  <span className="font-mono">{level.arrivalRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>服务率 μ</span>
                  <span className="font-mono">{level.serviceRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>初始窗口 c</span>
                  <span className="font-mono">{level.initialWindowCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>顾客数</span>
                  <span className="font-mono">{level.totalCustomers}</span>
                </div>
              </div>

              <button className="btn-primary w-full text-sm flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
                开始模拟 <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </main>

      {showRules && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-milk-700">📋 游戏规则</h2>
              <button onClick={() => setShowRules(false)} className="text-milk-400 hover:text-milk-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-milk-600">
              <div>
                <h3 className="font-bold text-milk-700 mb-1">🧋 顾客卡</h3>
                <p>每位顾客持有一张顾客卡，包含预约号、到达时间和制作时长。制作时长可能异常（紫色标记），需要关注。</p>
              </div>
              <div>
                <h3 className="font-bold text-milk-700 mb-1">🏪 服务窗口</h3>
                <p>窗口有三种状态：空闲（绿色）、服务中（橙色）、停用（红色）。可以新增窗口或恢复停用窗口。</p>
              </div>
              <div>
                <h3 className="font-bold text-milk-700 mb-1">⚠️ 失败条件</h3>
                <p>等待时间或队列长度超过阈值时模拟失败。系统会提示触发原因、卡点位置和下一步建议。</p>
              </div>
              <div>
                <h3 className="font-bold text-milk-700 mb-1">🔍 异常事件</h3>
                <p>高级关卡会出现预约爽约、窗口故障和制作时长异常。事件日志中可查看触发源。</p>
              </div>
              <div>
                <h3 className="font-bold text-milk-700 mb-1">📊 复盘报告</h3>
                <p>模拟结束后可回放、查看等待分布、导出报告。报告包含窗口结论和顾客卡-窗口-报告关联链，方便复核。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
