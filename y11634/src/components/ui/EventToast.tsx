import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { AlertTriangle, Zap, Truck, AlertCircle } from 'lucide-react'

const EventToast = () => {
  const { events } = useGameStore()

  const unresolvedEvents = events.filter((e) => !e.resolved).slice(-3)

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meteor':
      case 'collision':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'energy_low':
        return <Zap className="w-5 h-5 text-yellow-400" />
      case 'delivery':
        return <Truck className="w-5 h-5 text-green-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-cyan-400" />
    }
  }

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'meteor':
      case 'collision':
        return 'bg-red-900/80 border-red-500/50'
      case 'energy_low':
        return 'bg-yellow-900/80 border-yellow-500/50'
      case 'delivery':
        return 'bg-green-900/80 border-green-500/50'
      default:
        return 'bg-cyan-900/80 border-cyan-500/50'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {unresolvedEvents.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg backdrop-blur-sm border shadow-lg max-w-sm ${getEventStyle(event.type)}`}
          >
            {getEventIcon(event.type)}
            <div>
              <p className="text-white text-sm font-medium">{event.message}</p>
              <p className="text-white/60 text-xs">
                {new Date(event.time * 1000).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default EventToast
