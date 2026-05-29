import React from 'react';
import { motion } from 'framer-motion';
import { CacheEntry } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { formatTtl } from '../utils/gameUtils';

interface CacheGridProps {
  cache: CacheEntry[];
  gridSize: number;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'valid':
      return 'border-tech-green bg-tech-green/10';
    case 'expired':
      return 'border-tech-orange bg-tech-orange/10';
    case 'dirty':
      return 'border-tech-red bg-tech-red/10';
    default:
      return 'border-gray-600 bg-gray-800/50';
  }
};

const getStatusBadge = (status: string): { text: string; color: string } => {
  switch (status) {
    case 'valid':
      return { text: '有效', color: 'bg-tech-green text-white' };
    case 'expired':
      return { text: '过期', color: 'bg-tech-orange text-white' };
    case 'dirty':
      return { text: '脏数据', color: 'bg-tech-red text-white' };
    default:
      return { text: '空', color: 'bg-gray-600 text-gray-300' };
  }
};

export const CacheGrid: React.FC<CacheGridProps> = ({ cache, gridSize }) => {
  const { selectedCacheId, selectCache, handleRefresh, config } = useGameStore();

  const handleEntryClick = (entry: CacheEntry) => {
    if (entry.status === 'empty') return;
    selectCache(entry.id === selectedCacheId ? null : entry.id);
  };

  const handleRefreshClick = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    handleRefresh(entryId);
  };

  return (
    <div className="bg-tech-blue/50 rounded-xl p-4 border border-tech-cyan/20">
      <h3 className="text-tech-cyan font-bold text-lg mb-4 flex items-center gap-2">
        <span className="text-2xl">💾</span>
        缓存网格
      </h3>
      <div 
        className="grid gap-2"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {cache.map((entry) => {
          const badge = getStatusBadge(entry.status);
          const isSelected = selectedCacheId === entry.id;
          
          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: entry.status !== 'empty' ? 1.02 : 1 }}
              onClick={() => handleEntryClick(entry)}
              className={`
                relative p-3 rounded-lg border-2 transition-all cursor-pointer
                min-h-[100px]
                ${getStatusColor(entry.status)}
                ${isSelected ? 'ring-2 ring-tech-cyan ring-offset-2 ring-offset-tech-dark' : ''}
                ${entry.status === 'empty' ? 'cursor-default' : ''}
              `}
            >
              {entry.status !== 'empty' ? (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>
                      {badge.text}
                    </span>
                    {isSelected && (
                      <button
                        onClick={(e) => handleRefreshClick(e, entry.id)}
                        className="text-xs bg-tech-cyan text-tech-dark px-2 py-0.5 rounded hover:bg-tech-cyan/80 transition-colors"
                      >
                        刷新
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-sm text-white mb-1 truncate" title={entry.key}>
                    {entry.key}
                  </div>
                  <div className="font-mono text-xs text-gray-400 truncate mb-2" title={entry.value}>
                    {entry.value}
                  </div>
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">TTL:</span>
                      <span className={entry.ttl < config.cacheTtl * 0.2 ? 'text-tech-orange' : 'text-tech-green'}>
                        {formatTtl(entry.ttl)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          entry.ttl < config.cacheTtl * 0.2 ? 'bg-tech-orange' : 'bg-tech-green'
                        }`}
                        style={{ width: `${Math.max(0, (entry.ttl / entry.maxTtl) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {entry.status === 'dirty' && entry.dirtySource && (
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                      <span className="text-xs bg-tech-red text-white px-1.5 py-0.5 rounded-full animate-pulse">
                        ⚠️
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  空槽位
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
