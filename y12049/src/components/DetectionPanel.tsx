import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { getDetectionIcon, getDetectionColor, getMergeWarning } from '../utils/detector'
import { getDetectionTypeLabel } from '../utils/tracer'

const DetectionPanel = () => {
  const { detections, currentSample } = useGameStore()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const mergeWarning = getMergeWarning(detections)

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-cyan-400">错因分析</h3>
        {detections.length > 0 && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
            {detections.length} 个问题
          </span>
        )}
      </div>

      {currentSample && (
        <div className="mb-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <div className="text-sm text-cyan-400 font-medium">
            当前样例: {currentSample.name}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {currentSample.description}
          </div>
        </div>
      )}

      {mergeWarning && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <span>⚠️</span>
            <span>{mergeWarning}</span>
          </div>
        </div>
      )}

      {detections.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-gray-400">暂无检测到的问题</div>
          <div className="text-xs text-gray-500 mt-2">
            进行折叠操作后，系统将自动检测角度误差、面积漏算和折痕重叠
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
          <AnimatePresence>
            {detections.map((detection, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg overflow-hidden"
                style={{
                  borderLeft: `3px solid ${getDetectionColor(detection.severity)}`,
                  backgroundColor: `${getDetectionColor(detection.severity)}15`
                }}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getDetectionIcon(detection.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm" style={{ color: getDetectionColor(detection.severity) }}>
                          {getDetectionTypeLabel(detection.type)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          detection.severity === 'error' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {detection.severity === 'error' ? '错误' : '警告'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{detection.message}</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-gray-700/50">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-800/50 rounded p-2">
                            <div className="text-gray-500">检测数值</div>
                            <div className="text-cyan-400 font-mono mt-1">{detection.value.toFixed(1)}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded p-2">
                            <div className="text-gray-500">阈值标准</div>
                            <div className="text-gray-300 font-mono mt-1">{detection.threshold}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 bg-slate-800/50 rounded p-2">
                          <div className="text-gray-500 text-xs mb-1">代码来源</div>
                          <div className="text-xs font-mono text-cyan-400/70 break-all">
                            {detection.source}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between bg-slate-800/50 rounded p-2">
                          <span className="text-gray-500 text-xs">对成绩的影响</span>
                          <span className="text-red-400 font-bold text-sm">
                            {detection.affectedScore} 分
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default DetectionPanel
