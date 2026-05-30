import { motion } from 'framer-motion'
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import OrigamiCanvas from '../components/OrigamiCanvas'
import DetectionPanel from '../components/DetectionPanel'
import { getStepSummary, formatTimestamp } from '../utils/tracer'

const ReviewPage = () => {
  const { steps, currentStepIndex, setCurrentStepIndex, detections, score, currentSample } = useGameStore()
  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  const stepDetections = selectedStep !== null 
    ? detections.filter((_, i) => i === selectedStep) 
    : detections

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl text-white mb-2">回看分析</h2>
        <p className="text-gray-400 text-sm">
          回顾每一步操作，查看触发的折叠模拟和错因分析
        </p>
      </div>

      {currentSample && (
        <div className="mb-4 p-4 glass rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-cyan-400 font-medium">{currentSample.name}</h3>
              <p className="text-gray-400 text-sm mt-1">{currentSample.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{score}分</div>
              <div className="text-xs text-gray-500">最终得分</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-lg text-cyan-400 mb-4">步骤详情</h3>
            
            {steps.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无操作记录
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => {
                      setCurrentStepIndex(index)
                      setSelectedStep(index)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all
                      ${currentStepIndex === index
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${index <= currentStepIndex ? 'bg-cyan-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 truncate">
                          {getStepSummary(step, index)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(step.timestamp)}
                        </div>
                      </div>
                    </div>
                    {step.sourceDetail && (
                      <div className="mt-2 text-xs text-cyan-400/70 pl-8">
                        📍 {step.sourceDetail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="h-[400px] mb-4">
            <OrigamiCanvas />
          </div>
          
          <div className="glass rounded-xl p-4">
            <h4 className="text-sm text-gray-400 mb-3">当前步骤触发检测</h4>
            {stepDetections.length > 0 ? (
              <div className="space-y-2">
                {stepDetections.map((d, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg text-sm"
                    style={{ backgroundColor: d.severity === 'error' ? 'rgba(255,107,53,0.15)' : 'rgba(243,156,18,0.15)' }}
                  >
                    <div style={{ color: d.severity === 'error' ? '#ff6b35' : '#f39c12' }}>
                      {d.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      成绩影响: {d.affectedScore}分
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                此步骤未触发检测
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <DetectionPanel />
        </div>
      </div>
    </motion.div>
  )
}

export default ReviewPage
