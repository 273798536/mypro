import { Clock, Flame, AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { useGameStore } from '../../store/gameStore';
import { useEffect, useState } from 'react';
import type { CacheEntry } from '../../types/cache';

interface CacheSlotProps {
  entry?: CacheEntry;
  index: number;
  now: number;
}

function CacheSlot({ entry, index, now }: CacheSlotProps) {
  if (!entry) {
    return (
      <Card
        variant="default"
        className="h-24 flex items-center justify-center border-dashed"
      >
        <span className="text-gray-600 text-sm">空槽位 #{index + 1}</span>
      </Card>
    );
  }

  const remainingTTL = Math.max(0, entry.expiresAt - now);
  const ttlPercentage = (remainingTTL / entry.ttl) * 100;
  const isExpired = remainingTTL <= 0;
  const isHot = entry.accessCount > 3;
  const isAlmostExpired = ttlPercentage < 30 && !isExpired;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card
        variant={isExpired ? 'danger' : isHot ? 'hot' : isAlmostExpired ? 'warning' : 'default'}
        glow={isHot || isExpired}
        className="h-24 p-3 flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1">
              {isHot && <Flame className="w-4 h-4 text-[#FF7A18]" />}
              {isExpired && <AlertTriangle className="w-4 h-4 text-[#D32F2F] animate-pulse" />}
              {isAlmostExpired && !isExpired && <Clock className="w-4 h-4 text-[#FFD54F]" />}
              <span className={`font-bold text-sm ${
                isExpired ? 'text-[#D32F2F] line-through' : 'text-white'
              }`}>
                {entry.dishName}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              v{entry.version} · 访问 {entry.accessCount}次
            </div>
          </div>
          {entry.isDirty && (
            <span className="px-1.5 py-0.5 text-xs bg-[#D32F2F]/30 text-[#FF6B6B] rounded">
              脏
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">TTL</span>
            <span className={`font-mono ${
              isExpired ? 'text-[#D32F2F]' : isAlmostExpired ? 'text-[#FFD54F]' : 'text-gray-300'
            }`}>
              {isExpired ? '已过期' : `${(remainingTTL / 1000).toFixed(1)}s`}
            </span>
          </div>
          <ProgressBar
            value={ttlPercentage}
            variant={isExpired ? 'default' : 'ttl'}
            className="h-1.5"
          />
        </div>
      </Card>
    </motion.div>
  );
}

export function CacheMenu() {
  const { cacheEntries, cacheStrategy, stats } = useGameStore();
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(performance.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const slots = Array.from({ length: 6 }, (_, i) => cacheEntries[i]);
  const hitRate = stats.cacheHits + stats.cacheMisses > 0
    ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col bg-[#252220] rounded-xl border-2 border-[#5D554D] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🔥</span>
            缓存菜单
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            策略: {cacheStrategy} · 容量: 6
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-[#81C784]" />
            <span className="text-xl font-bold text-[#81C784]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {hitRate}%
            </span>
          </div>
          <span className="text-xs text-gray-500">命中率</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 content-start">
        {slots.map((entry, index) => (
          <CacheSlot key={entry?.dishId || `empty-${index}`} entry={entry} index={index} now={now} />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#5D554D] grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[#81C784]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.cacheHits}
          </div>
          <div className="text-xs text-gray-500">命中</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#D32F2F]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.cacheMisses}
          </div>
          <div className="text-xs text-gray-500">未命中</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#FFD54F]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {stats.cacheExpired}
          </div>
          <div className="text-xs text-gray-500">过期</div>
        </div>
      </div>
    </div>
  );
}
