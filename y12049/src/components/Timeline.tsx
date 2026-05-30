import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { formatTimestamp, getStepSummary, getSourceTypeLabel } from '../utils/tracer'

const Timeline = () => {
  const { steps, currentStepIndex, setCurrentStepIndex } = useGameStore()

  const getStepColor = (index: number) => {
    if (index < currentStepIndex) return 'bg-green-500'
    if (index === currentStepIndex) return 'bg-cyan-400'
    return 'bg-gray-600'
  }

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="font-display text-lg text-cyan-400 mb-4">操作时间线</h3>
      
      {steps.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无操作记录
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
          
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-2">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-10 cursor-pointer group"
                onClick={() => setCurrentStepIndex(index)}
              >
                <div
                  className={`absolute left-2 top-1 w-5 h-5 rounded-full ${getStepColor(index)} 
                    border-2 border-slate-900 transition-all
                    ${index === currentStepIndex ? 'ring-2 ring-cyan-400/50' : ''}`}
                />
                
                <div
                  className={`p-2 rounded-lg transition-all
                    ${index === currentStepIndex
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : 'bg-slate-800/50 hover:bg-slate-700/50'
                    }`}
                >
                  <div className="text-sm text-gray-300">
                    {getStepSummary(step, index)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(step.timestamp)} · {getSourceTypeLabel(step.source)}
                  </div>
                  {step.sourceDetail && (
                    <div className="text-xs text-cyan-400/70 mt-1">
                      {step.sourceDetail}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Timeline
