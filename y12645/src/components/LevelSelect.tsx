import React from 'react'
import { useStore } from '../store/useStore'

const LevelSelect: React.FC = () => {
  const { levels, setCurrentLevel } = useStore()

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case 'easy': return '简单'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return '未知'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">农机作业轨迹纠偏培训系统</h1>
          <p className="text-slate-600">
            安全培训师复核版 · 关卡数量少但覆盖边界失败、撤销重做、来源追溯与结算
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => (
            <div
              key={level.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-slate-200"
              onClick={() => setCurrentLevel(level)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">{level.name}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{level.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(level.difficulty)}`}>
                  {getDifficultyText(level.difficulty)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {level.hasBoundaryFailure && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    边界失败练习
                  </span>
                )}
                {level.hasUndoRedo && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    撤销/重开
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  含来源追溯结算
                </span>
              </div>

              {level.objectives.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-medium text-slate-500 mb-2">训练目标</div>
                  <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                    {level.objectives.slice(0, 4).map(obj => (
                      <li key={obj.id}>{obj.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  轨迹点 {(level.trajectoryPoints || level.trajectoryData).length} ·
                  区域 {level.correctionZones.length}
                </span>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  开始训练 →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-3">使用流程</h3>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>选择关卡，查看底图坐标与截图素材说明</li>
              <li>在轨迹图上点击异常点，选择异常类型并添加标注</li>
              <li>对标注区域逐一确认或驳回（撤销误判）</li>
              <li>使用「撤销 / 重做 / 重开」修正操作</li>
              <li>完成后进入结算页，一眼分清可直接使用 vs 需培训师复核</li>
              <li>导出 JSON，文件 summary.status 与页面结论保持一致</li>
            </ol>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-3">异常类型与来源说明</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: '#ef4444' }} />
                <div>
                  <span className="font-medium text-slate-700">边界违规</span>
                  <span className="text-slate-500"> — 轨迹点坐标超出田块边界，可追溯原始行号和截图</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: '#8b5cf6' }} />
                <div>
                  <span className="font-medium text-slate-700">GPS 漂移</span>
                  <span className="text-slate-500"> — 信号不稳定导致的异常偏移</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: '#f59e0b' }} />
                <div>
                  <span className="font-medium text-slate-700">重复点</span>
                  <span className="text-slate-500"> — 数据记录异常产生的重复坐标</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: '#06b6d4' }} />
                <div>
                  <span className="font-medium text-slate-700">速度异常</span>
                  <span className="text-slate-500"> — 相邻点间距异常导致的瞬间跳跃</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelSelect
