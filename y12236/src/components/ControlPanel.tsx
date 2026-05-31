import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Calculator, ArrowLeft, ArrowRight, Minus, Plus, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface EventAlertProps {
  event: {
    id: string;
    type: string;
    severity: string;
    data: Record<string, number | string>;
  };
  onHandle: (response: 'accept' | 'reject' | 'hedge') => void;
}

function EventAlert({ event, onHandle }: EventAlertProps) {
  const typeLabels: Record<string, string> = {
    volatility_storm: '波动率风暴',
    delta_surge: 'Delta突变',
    gamma_gate: 'Gamma门数据',
    margin_warning: '保证金警告',
    compound: '复合事件',
  };

  const severityColors: Record<string, string> = {
    low: 'border-neon-green/50 bg-neon-green/10',
    medium: 'border-neon-yellow/50 bg-neon-yellow/10',
    high: 'border-neon-red/50 bg-neon-red/10',
    critical: 'border-neon-red bg-neon-red/20 animate-pulse',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`p-4 rounded-lg border-2 ${severityColors[event.severity]} mb-2`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-white flex items-center gap-2">
            <ShieldAlert size={18} />
            {typeLabels[event.type] || event.type}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Object.entries(event.data)
              .filter(([key]) => !key.includes('new'))
              .map(([key, value]) => (
                <span key={key} className="mr-3">
                  {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                </span>
              ))}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          event.severity === 'critical' ? 'bg-neon-red text-white' :
          event.severity === 'high' ? 'bg-neon-red/50 text-white' :
          event.severity === 'medium' ? 'bg-neon-yellow/50 text-white' :
          'bg-neon-green/50 text-white'
        }`}>
          {event.severity}
        </span>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onHandle('hedge')}
          className="flex-1 py-2 rounded bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-sm hover:bg-neon-cyan/30 transition-colors"
        >
          对冲应对
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onHandle('accept')}
          className="flex-1 py-2 rounded bg-neon-green/20 border border-neon-green text-neon-green text-sm hover:bg-neon-green/30 transition-colors"
        >
          接受
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onHandle('reject')}
          className="flex-1 py-2 rounded bg-neon-red/20 border border-neon-red text-neon-red text-sm hover:bg-neon-red/30 transition-colors"
        >
          拒绝
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function ControlPanel() {
  const {
    status,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    settleGame,
    setShipDirection,
    adjustPosition,
    events,
    handleEvent,
    ship,
  } = useGameStore();

  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(true);

  const unhandledEvents = events.filter((e) => !e.handled && (!e.actualArrivalTime || Date.now() >= e.actualArrivalTime));

  const handleSettle = () => {
    settleGame();
    navigate('/settlement');
  };

  return (
    <div className="space-y-4">
      <div className="panel-glass p-4">
        <h3 className="font-orbitron text-sm text-neon-cyan mb-3">飞行控制</h3>
        
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={() => setShipDirection('left')}
            onMouseUp={() => setShipDirection('center')}
            onMouseLeave={() => setShipDirection('center')}
            onTouchStart={() => setShipDirection('left')}
            onTouchEnd={() => setShipDirection('center')}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              ship.direction === 'left'
                ? 'bg-neon-cyan/30 border-2 border-neon-cyan shadow-neon-cyan'
                : 'bg-space-700 border-2 border-neon-cyan/50 hover:border-neon-cyan'
            }`}
          >
            <ArrowLeft className="text-neon-cyan" size={24} />
          </motion.button>

          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">方向控制</div>
            <div className="font-mono text-neon-cyan text-sm">
              {ship.direction === 'left' ? '← 左转' : ship.direction === 'right' ? '右转 →' : '直行 ↑'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              速度: {Math.abs(ship.velocity).toFixed(2)}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={() => setShipDirection('right')}
            onMouseUp={() => setShipDirection('center')}
            onMouseLeave={() => setShipDirection('center')}
            onTouchStart={() => setShipDirection('right')}
            onTouchEnd={() => setShipDirection('center')}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              ship.direction === 'right'
                ? 'bg-neon-cyan/30 border-2 border-neon-cyan shadow-neon-cyan'
                : 'bg-space-700 border-2 border-neon-cyan/50 hover:border-neon-cyan'
            }`}
          >
            <ArrowRight className="text-neon-cyan" size={24} />
          </motion.button>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">仓位调整</div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => adjustPosition('down', 10)}
              className="flex-1 py-2 rounded-lg bg-neon-red/20 border border-neon-red/50 text-neon-red flex items-center justify-center gap-2 hover:bg-neon-red/30 transition-colors"
            >
              <Minus size={16} /> 减仓
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => adjustPosition('up', 10)}
              className="flex-1 py-2 rounded-lg bg-neon-green/20 border border-neon-green/50 text-neon-green flex items-center justify-center gap-2 hover:bg-neon-green/30 transition-colors"
            >
              <Plus size={16} /> 加仓
            </motion.button>
          </div>
        </div>
      </div>

      <div className="panel-glass p-4">
        <h3 className="font-orbitron text-sm text-neon-cyan mb-3">游戏控制</h3>
        <div className="grid grid-cols-2 gap-2">
          {status === 'idle' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="col-span-2 btn-neon-green flex items-center justify-center gap-2 py-3"
            >
              <Play size={18} /> 开始飞行
            </motion.button>
          )}

          {status === 'playing' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={pauseGame}
                className="btn-neon-yellow flex items-center justify-center gap-2 py-2"
              >
                <Pause size={16} /> 暂停
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartGame}
                className="btn-neon flex items-center justify-center gap-2 py-2"
              >
                <RotateCcw size={16} /> 重开
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSettle}
                className="col-span-2 btn-neon-red flex items-center justify-center gap-2 py-2"
              >
                <Calculator size={16} /> 结算
              </motion.button>
            </>
          )}

          {status === 'paused' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resumeGame}
                className="btn-neon-green flex items-center justify-center gap-2 py-2"
              >
                <Play size={16} /> 继续
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartGame}
                className="btn-neon flex items-center justify-center gap-2 py-2"
              >
                <RotateCcw size={16} /> 重开
              </motion.button>
            </>
          )}

          {status === 'settled' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settlement')}
                className="btn-neon-green flex items-center justify-center gap-2 py-2"
              >
                <Calculator size={16} /> 结算页
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartGame}
                className="btn-neon flex items-center justify-center gap-2 py-2"
              >
                <RotateCcw size={16} /> 再来一局
              </motion.button>
            </>
          )}
        </div>
      </div>

      {showAlerts && unhandledEvents.length > 0 && status === 'playing' && (
        <div className="panel-glass-red p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-orbitron text-sm text-neon-red flex items-center gap-2">
              <ShieldAlert size={16} />
              待处理事件 ({unhandledEvents.length})
            </h3>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              收起
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unhandledEvents.slice(0, 3).map((event) => (
              <EventAlert
                key={event.id}
                event={event}
                onHandle={(response) => handleEvent(event.id, response)}
              />
            ))}
            {unhandledEvents.length > 3 && (
              <div className="text-center text-xs text-gray-400 py-2">
                还有 {unhandledEvents.length - 3} 个事件待处理...
              </div>
            )}
          </div>
        </div>
      )}

      {!showAlerts && unhandledEvents.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => setShowAlerts(true)}
          className="w-full panel-glass-red p-3 text-neon-red flex items-center justify-center gap-2"
        >
          <ShieldAlert size={16} />
          展开 {unhandledEvents.length} 个待处理事件
        </motion.button>
      )}
    </div>
  );
}
