import { motion } from 'framer-motion'
import OrigamiCanvas from '../components/OrigamiCanvas'
import ControlPanel from '../components/ControlPanel'
import StatusPanel from '../components/StatusPanel'
import Timeline from '../components/Timeline'
import DetectionPanel from '../components/DetectionPanel'
import { samples } from '../data/samples'
import { useGameStore } from '../store/gameStore'

const GamePage = () => {
  const { loadSample } = useGameStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto p-4"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl text-white mb-2">折纸模拟</h2>
        <p className="text-gray-400 text-sm">
          选择折叠方向和角度，观察纸张变形和检测结果
        </p>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <span className="text-gray-400 text-sm py-2">快速加载样例:</span>
        {samples.slice(0, 2).map((sample) => (
          <button
            key={sample.id}
            onClick={() => loadSample(sample)}
            className={`px-3 py-2 rounded-lg text-sm transition-all
              ${sample.type === 'normal'
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
              }`}
          >
            {sample.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-[450px]">
            <OrigamiCanvas />
          </div>
          <Timeline />
        </div>

        <div className="space-y-4">
          <ControlPanel />
          <StatusPanel />
          <DetectionPanel />
        </div>
      </div>
    </motion.div>
  )
}

export default GamePage
