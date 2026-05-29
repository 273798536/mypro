import { useGameStore } from '../store/gameStore';
import { AlertTriangle, CheckCircle, ChevronRight, Skull, Package } from 'lucide-react';
import { motion } from 'framer-motion';

export function ConfirmationModal() {
  const { pendingConfirmations, confirmEvent, skipAllConfirmations } = useGameStore();

  if (pendingConfirmations.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'medium':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    }
  };

  const getSeverityIcon = (severity: string, type: string) => {
    if (type.includes('collision')) return <Skull className="w-5 h-5" />;
    if (type.includes('meteor')) return <AlertTriangle className="w-5 h-5" />;
    if (type.includes('ore')) return <Package className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-lg w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">需要人工确认</h2>
            <p className="text-slate-400 text-sm">
              系统检测到 {pendingConfirmations.length} 项需要确认的内容
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
          {pendingConfirmations.map((item, index) => (
            <motion.div
              key={item.eventId}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${getSeverityColor(item.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(item.severity, item.type)}
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">
                    {item.type === 'meteor_warning' && '陨石事件预警'}
                    {item.type === 'collision_risk' && '碰撞风险警告'}
                    {item.type === 'ore_overload' && '矿石过载提示'}
                  </div>
                  <p className="text-sm text-slate-300">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => confirmEvent(item.eventId)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>确认并继续</span>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={skipAllConfirmations}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors"
          >
            <span>跳过全部，直接开始</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
