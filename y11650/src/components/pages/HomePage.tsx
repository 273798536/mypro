import { useNavigate } from 'react-router-dom'
import { LEVELS } from '../../data/levels'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cafeteria-bg flex flex-col">
      <header className="bg-gradient-to-r from-primary to-primary-dark text-white py-6 px-4 shadow-lg">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-display text-4xl mb-2">🍱 校园食堂备餐 Rush</h1>
          <p className="text-orange-100 text-sm">训练新人按年级、过敏原和取餐窗口正确备餐</p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
          <h2 className="font-display text-xl text-gray-700 mb-3">📖 操作指引</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-cafeteria-border shadow-sm">
              <div className="text-2xl mb-1">1️⃣ 选订单</div>
              <p className="text-xs text-gray-500">点击左侧订单队列中的订单，注意⚠️过敏原标签</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-cafeteria-border shadow-sm">
              <div className="text-2xl mb-1">2️⃣ 备餐</div>
              <p className="text-xs text-gray-500">选中订单后点击备餐台空位开始备餐，等待进度完成</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-cafeteria-border shadow-sm">
              <div className="text-2xl mb-1">3️⃣ 送餐</div>
              <p className="text-xs text-gray-500">备餐完成后取餐，点击对应年级窗口送出。避免错配！</p>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl text-gray-700 mb-3">🎮 选择关卡</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVELS.map(level => (
            <div
              key={level.id}
              className="bg-white rounded-xl border border-cafeteria-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/game/${level.id}`)}
            >
              <div
                className="h-2"
                style={{
                  background: `linear-gradient(90deg, #FF8C42 ${level.difficulty * 20}%, #eee ${level.difficulty * 20}%)`
                }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg text-gray-800 group-hover:text-primary transition-colors">
                    {level.name}
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {level.difficulty}⭐
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-3">{level.description}</p>

                <div className="flex gap-3 text-[10px] text-gray-400">
                  <span>⏱️ {level.duration}秒</span>
                  <span>🏪 {level.windowConfigs.length}窗口</span>
                  <span>🍳 {level.prepSlotCount}备餐位</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">目标: {level.targetScore}分</span>
                  <span className="text-xs bg-primary text-white px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    开始挑战 →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-gray-100 py-3 text-center text-xs text-gray-400 border-t">
        校园食堂备餐 Rush — 食堂新人训练系统 v1.0
      </footer>
    </div>
  )
}
