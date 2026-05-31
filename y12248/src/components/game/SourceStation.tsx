import { Flame, AlertTriangle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { useGameStore } from '../../store/gameStore';
import { useEffect, useState } from 'react';
import type { SourceRequest } from '../../types/order';

interface StoveProps {
  request?: SourceRequest;
  index: number;
  now: number;
  speed: number;
}

function FlameAnimation({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="relative w-8 h-10">
      <motion.div
        animate={{
          scaleY: [1, 1.2, 0.9, 1.1, 1],
          opacity: [0.8, 1, 0.9, 1, 0.8],
        }}
        transition={{
          duration: 0.5 / intensity,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
      >
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <defs>
            <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFD54F" />
              <stop offset="50%" stopColor="#FF7A18" />
              <stop offset="100%" stopColor="#D32F2F" />
            </linearGradient>
          </defs>
          <path
            d="M16 0C10 10 6 18 6 26C6 33 10 40 16 40C22 40 26 33 26 26C26 18 22 10 16 0Z"
            fill="url(#flameGrad)"
          />
          <path
            d="M16 10C13 17 11 22 11 28C11 32 13 35 16 35C19 35 21 32 21 28C21 22 19 17 16 10Z"
            fill="#FFF8E1"
            opacity="0.6"
          />
        </svg>
      </motion.div>
    </div>
  );
}

function Stove({ request, index, now, speed }: StoveProps) {
  if (!request) {
    return (
      <Card variant="default" className="h-28 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#1D1A17] flex items-center justify-center mb-2">
          <Flame className="w-6 h-6 text-gray-700" />
        </div>
        <span className="text-xs text-gray-600">灶台 #{index + 1}</span>
        <span className="text-xs text-gray-700">空闲</span>
      </Card>
    );
  }

  const elapsed = now - request.createdAt;
  const adjustedDuration = request.duration / speed;
  const progress = Math.min(100, (elapsed / adjustedDuration) * 100);
  const remaining = Math.max(0, adjustedDuration - elapsed);
  const intensity = 0.5 + (progress / 100) * 0.5;

  return (
    <Card variant="hot" glow={progress > 50} className="h-28 p-3 flex flex-col">
      <div className="flex items-center gap-2">
        <FlameAnimation intensity={intensity} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-white truncate">
            {request.dishName}
          </div>
          <div className="text-xs text-gray-400">
            订单数: {request.orderIds.length}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[#FF7A18] font-mono">
              {(remaining / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-auto">
        <ProgressBar
          value={progress}
          variant="source"
          showLabel
          className="h-2"
        />
      </div>
    </Card>
  );
}

export function SourceStation() {
  const { sourceRequests, stats, sourceLimit } = useGameStore();
  const [now, setNow] = useState(performance.now());
  const { speed } = useGameStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(performance.now());
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const activeRequests = sourceRequests.filter(r => r.status === 'cooking');
  const isOverloaded = stats.concurrentSource > sourceLimit;

  return (
    <div className="h-full flex flex-col bg-[#252220] rounded-xl border-2 border-[#5D554D] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🍳</span>
            回源灶台
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            限流: {sourceLimit} 并发
          </p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 ${isOverloaded ? 'text-[#D32F2F]' : 'text-[#1565C0]'}`}>
            <Users className="w-4 h-4" />
            <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {stats.concurrentSource}/{sourceLimit}
            </span>
          </div>
          <span className="text-xs text-gray-500">并发回源</span>
        </div>
      </div>

      {isOverloaded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-2 bg-[#D32F2F]/20 border border-[#D32F2F] rounded-lg flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-[#D32F2F] flex-shrink-0" />
          <span className="text-xs text-[#FF6B6B]">
            ⚠️ 回源限流触发！系统压力过大
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-3 flex-1 content-start">
        {Array.from({ length: sourceLimit + 2 }, (_, i) => (
          <Stove
            key={i}
            request={activeRequests[i]}
            index={i}
            now={now}
            speed={speed}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#5D554D] grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[#1565C0]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.sourceRequests}
          </div>
          <div className="text-xs text-gray-500">总回源</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#FFD54F]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.maxConcurrentSource}
          </div>
          <div className="text-xs text-gray-500">峰值并发</div>
        </div>
      </div>
    </div>
  );
}
