import { motion } from 'framer-motion'
import { samples } from '../data/samples'
import { useGameStore } from '../store/gameStore'
import { getDetectionIcon, getDetectionColor } from '../utils/detector'
import { getDetectionTypeLabel } from '../utils/tracer'

const SamplesPage = () => {
  const { loadSample, currentSample, detections, score } = useGameStore()

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-green-500/20 text-green-400',
      area_miss: 'bg-orange-500/20 text-orange-400',
      angle_error: 'bg-yellow-500/20 text-yellow-400',
      overlap: 'bg-red-500/20 text-red-400'
    }
    const labels: Record<string, string> = {
      normal: '正常',
      area_miss: '面积漏算',
      angle_error: '角度误差',
      overlap: '折痕重叠'
    }
    return { style: styles[type] || 'bg-gray-500/20 text-gray-400', label: labels[type] || type }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl text-white mb-2">样例测试</h2>
        <p className="text-gray-400 text-sm">
          加载预置样例，验证分支逻辑是否正确生效
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display text-lg text-cyan-400 mb-4">预置样例列表</h3>
          <div className="space-y-3">
            {samples.map((sample) => {
              const badge = getTypeBadge(sample.type)
              const isSelected = currentSample?.id === sample.id
              
              return (
                <motion.div
                  key={sample.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => loadSample(sample)}
                  className={`glass rounded-xl p-4 cursor-pointer transition-all
                    ${isSelected ? 'ring-2 ring-cyan-500/50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white">{sample.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{sample.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {sample.steps.length} 个步骤 · {sample.expectedDetections.length} 个预期检测
                    </div>
                    <button className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-lg hover:bg-cyan-500/30 transition-colors">
                      加载
                    </button>
                  </div>

                  {sample.expectedDetections.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <div className="text-xs text-gray-500 mb-2">预期检测结果:</div>
                      <div className="space-y-1">
                        {sample.expectedDetections.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span>{getDetectionIcon(d.type)}</span>
                            <span style={{ color: getDetectionColor(d.severity) }}>
                              {getDetectionTypeLabel(d.type)}
                            </span>
                            <span className="text-gray-500">-</span>
                            <span className="text-gray-400">{d.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg text-cyan-400 mb-4">验证结果</h3>
          
          {currentSample ? (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-white font-medium">{currentSample.name}</h4>
                    <p className="text-gray-400 text-sm">当前已加载</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                      {score}分
                    </div>
                    <div className="text-xs text-gray-500">实际得分</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">分支验证状态</div>
                  <div className="flex items-center gap-2">
                    {currentSample.expectedDetections.length === detections.length ? (
                      <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                        ✅ 分支正确触发
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
                        ❌ 分支触发异常
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">预期检测数</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">
                      {currentSample.expectedDetections.length}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs">实际检测数</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">
                      {detections.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <h4 className="text-sm text-gray-400 mb-3">检测结果对比</h4>
                
                <div className="space-y-3">
                  {currentSample.expectedDetections.map((expected, i) => {
                    const actual = detections[i]
                    const match = actual && actual.type === expected.type
                    
                    return (
                      <div key={i} className={`p-3 rounded-lg ${match ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span>{match ? '✅' : '❌'}</span>
                          <span className="font-medium text-sm">
                            {getDetectionTypeLabel(expected.type)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-gray-500">预期:</div>
                            <div className="text-gray-300">{expected.message}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">实际:</div>
                            <div className={match ? 'text-green-400' : 'text-red-400'}>
                              {actual?.message || '未检测到'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <h4 className="text-sm text-gray-400 mb-3">代码溯源</h4>
                <div className="space-y-2">
                  {detections.map((d, i) => (
                    <div key={i} className="text-xs font-mono bg-slate-800/50 rounded p-2 text-cyan-400/70 break-all">
                      {d.source}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">👆</div>
              <div className="text-gray-400">请从左侧选择一个样例加载</div>
              <div className="text-xs text-gray-500 mt-2">
                样例包含正常记录和各种错误场景，用于验证分支逻辑
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default SamplesPage
