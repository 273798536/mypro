import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function Spaceship() {
  const { ship, position } = useGameStore();

  const getShipRotation = () => {
    if (ship.direction === 'left') return -15;
    if (ship.direction === 'right') return 15;
    return 0;
  };

  const getFlameIntensity = () => {
    return Math.min(1, Math.abs(ship.velocity) / 2 + 0.5);
  };

  const flameIntensity = getFlameIntensity();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute bottom-1/4 left-1/2"
        animate={{
          x: `${ship.x}%`,
          y: `${ship.y}px`,
          rotate: getShipRotation(),
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        style={{
          transform: 'translateX(-50%)',
        }}
      >
        <div className="relative">
          <svg
            width="120"
            height="80"
            viewBox="0 0 120 80"
            className="drop-shadow-[0_0_20px_rgba(0,245,255,0.5)]"
          >
            <defs>
              <linearGradient id="shipBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a2d50" />
                <stop offset="50%" stopColor="#2a3d66" />
                <stop offset="100%" stopColor="#0f1f3a" />
              </linearGradient>
              <linearGradient id="shipCockpit" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00a5aa" stopOpacity="0.4" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d="M60 5 L100 40 L95 45 L60 35 L25 45 L20 40 Z"
              fill="url(#shipBody)"
              stroke="#00f5ff"
              strokeWidth="1.5"
              filter="url(#glow)"
            />

            <ellipse
              cx="60"
              cy="25"
              rx="12"
              ry="8"
              fill="url(#shipCockpit)"
              stroke="#00f5ff"
              strokeWidth="1"
            />

            <path
              d="M20 40 L5 55 L25 45 Z"
              fill="#1a2d50"
              stroke="#00f5ff"
              strokeWidth="1"
            />
            <path
              d="M100 40 L115 55 L95 45 Z"
              fill="#1a2d50"
              stroke="#00f5ff"
              strokeWidth="1"
            />

            <line
              x1="45"
              y1="45"
              x2="45"
              y2="55"
              stroke="#00f5ff"
              strokeWidth="2"
            />
            <line
              x1="75"
              y1="45"
              x2="75"
              y2="55"
              stroke="#00f5ff"
              strokeWidth="2"
            />
          </svg>

          <motion.div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2"
            animate={{
              scaleY: [flameIntensity * 0.8, flameIntensity, flameIntensity * 0.8],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 0.15,
              repeat: Infinity,
            }}
          >
            <svg width="60" height="50" viewBox="0 0 60 50">
              <defs>
                <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00f5ff" stopOpacity="1" />
                  <stop offset="30%" stopColor="#00a5aa" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#ffaa00" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ff3366" stopOpacity="0" />
                </linearGradient>
                <filter id="flameBlur">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              <path
                d="M30 0 L45 20 L40 35 L30 50 L20 35 L15 20 Z"
                fill="url(#flameGradient)"
                filter="url(#flameBlur)"
              />
            </svg>
          </motion.div>

          <motion.div
            className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-xs font-mono text-neon-cyan bg-space-900/80 px-2 py-1 rounded border border-neon-cyan/50">
              {position.type === 'call' ? '📈 看涨' : '📉 看跌'} | {position.quantity}张
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
