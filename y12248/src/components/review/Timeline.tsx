import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Zap, Flame, Users, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { useGameStore } from '../../store/gameStore';
import type { Evidence } from '../../types/evidence';

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  order_created: { label: '订单创建', color: '#64B5F6', icon: '📋' },
  cache_check: { label: '缓存检查', color: '#81C784', icon: '✅' },
  source_start: { label: '回源开始', color: '#FF9800', icon: '🔥' },
  source_complete: { label: '回源完成', color: '#1565C0', icon: '🍳' },
  serve: { label: '出餐完成', color: '#4CAF50', icon: '🍽️' },
  dirty_spread: { label: '脏数据扩散', color: '#D32F2F', icon: '⚠️' },
  cache_breakdown: { label: '缓存击穿', color: '#9C27B0', icon: '💥' },
  expired_misread: { label: '过期误读', color: '#FF5722', icon: '📖' },
  timeout: { label: '顾客超时', color: '#F44336', icon: '😡' },
};

export function Timeline() {
  const navigate = useNavigate();
  const { evidence } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  const sortedEvidence = useMemo(() => {
    return [...evidence].sort((a, b) => a.timestamp - b.timestamp);
  }, [evidence]);

  const formatGameTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectedEvent = selectedIndex !== null ? sortedEvidence[selectedIndex] : null;

  const problemEvents = useMemo(() => {
    return sortedEvidence.filter(e => 
      ['dirty_spread', 'cache_breakdown', 'expired_misread', 'timeout'].includes(e.eventType)
    );
  }, [sortedEvidence]);

  const jumpToNextProblem = () => {
    if (!selectedEvent) {
      const firstProblem = problemEvents[0];
      if (firstProblem) {
        setSelectedIndex(sortedEvidence.indexOf(firstProblem));
      }
      return;
    }
    
    const nextProblem = problemEvents.find(p => p.timestamp > selectedEvent.timestamp);
    if (nextProblem) {
      setSelectedIndex(sortedEvidence.indexOf(nextProblem));
    }
  };

  const jumpToPrevProblem = () => {
    if (!selectedEvent) return;
    
    const prevProblem = [...problemEvents].reverse().find(p => p.timestamp < selectedEvent.timestamp);
    if (prevProblem) {
      setSelectedIndex(sortedEvidence.indexOf(prevProblem));
    }
  };

  return (
    <div className="min-h-screen bg-[#2D2A26] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              📜 复盘分析
            </h1>
            <p className="text-gray-400">完整事件时间线，点击事件查看详细证据</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/')}>
              ← 返回游戏
            </Button>
          </div>
        </div>

        {sortedEvidence.length === 0 ? (
          <Card variant="default" className="p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">暂无事件记录</h3>
            <p className="text-gray-400 mb-6">先玩一局游戏，然后再来查看复盘</p>
            <Button variant="primary" onClick={() => navigate('/')}>
              开始游戏
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={jumpToPrevProblem}
                  disabled={!problemEvents.length}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一问题
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={jumpToNextProblem}
                  disabled={!problemEvents.length}
                >
                  下一问题
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-8 w-px bg-[#5D554D]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">发现问题:</span>
                <span className="text-lg font-bold text-[#D32F2F]">{problemEvents.length}</span>
              </div>
              <div className="h-8 w-px bg-[#5D554D]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">总事件:</span>
                <span className="text-lg font-bold text-white">{sortedEvidence.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card variant="default" className="p-4 h-[600px] flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#FF7A18]" />
                    事件时间线
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    <AnimatePresence>
                      {sortedEvidence.map((event, index) => {
                        const typeInfo = EVENT_TYPE_LABELS[event.eventType] || {
                          label: event.eventType,
                          color: '#999',
                          icon: '📌',
                        };
                        const isProblem = ['dirty_spread', 'cache_breakdown', 'expired_misread', 'timeout'].includes(event.eventType);
                        
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => setSelectedIndex(index)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                              selectedIndex === index
                                ? 'border-[#FF7A18] bg-[#FF7A18]/10'
                                : isProblem
                                ? 'border-[#D32F2F]/50 bg-[#D32F2F]/5 hover:bg-[#D32F2F]/10'
                                : 'border-transparent bg-[#1D1A17] hover:bg-[#3D3833]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{typeInfo.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-white truncate">
                                    {typeInfo.label}
                                  </span>
                                  {event.scoreChange !== 0 && (
                                    <span className={`text-xs font-bold ${
                                      event.scoreChange > 0 ? 'text-[#81C784]' : 'text-[#D32F2F]'
                                    }`}>
                                      {event.scoreChange > 0 ? '+' : ''}{event.scoreChange}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {formatGameTime(event.gameTime)}
                                  </span>
                                  <span className="text-xs text-gray-400 truncate">
                                    {event.details?.dishName || event.decision}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isProblem && (
                              <div className="mt-2 pt-2 border-t border-[#3D3833]">
                                <span className="text-xs text-[#FF6B6B]">
                                  ⚠️ {event.decision}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card variant="default" className="p-6 h-[600px] overflow-y-auto">
                  {selectedEvent ? (
                    <EvidenceDetail event={selectedEvent} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                      <div className="text-6xl mb-4">👆</div>
                      <p className="text-lg">点击左侧时间线中的事件</p>
                      <p className="text-sm">查看详细证据链</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EvidenceDetail({ event }: { event: Evidence }) {
  const typeInfo = EVENT_TYPE_LABELS[event.eventType] || {
    label: event.eventType,
    color: '#999',
    icon: '📌',
  };

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={event.id}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{typeInfo.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{typeInfo.label}</h2>
              <p className="text-gray-400">{event.decision}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              游戏时间: {Math.floor(event.gameTime / 1000)}s
            </span>
            <span className="text-gray-500">
              系统时间: {formatTime(event.timestamp)}
            </span>
            {event.scoreChange !== 0 && (
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                event.scoreChange > 0 
                  ? 'bg-[#81C784]/20 text-[#81C784]' 
                  : 'bg-[#D32F2F]/20 text-[#D32F2F]'
              }`}>
                {event.scoreChange > 0 ? '+' : ''}{event.scoreChange} 分
              </span>
            )}
          </div>
        </div>
      </div>

      {event.orderId && (
        <div className="mb-6 p-4 bg-[#1D1A17] rounded-xl border border-[#3D3833]">
          <h3 className="text-sm font-bold text-gray-400 mb-3">📋 关联订单</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500">订单ID</span>
              <p className="text-white font-mono text-sm">{event.orderId}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">菜品</span>
              <p className="text-white">{event.details?.dishName || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">菜品ID</span>
              <p className="text-white font-mono text-sm">{event.details?.dishId || '-'}</p>
            </div>
            {event.patienceSnapshot !== undefined && (
              <div>
                <span className="text-xs text-gray-500">顾客耐心</span>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={event.patienceSnapshot}
                    variant="patience"
                    className="flex-1"
                  />
                  <span className="text-white text-sm">{Math.round(event.patienceSnapshot)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 mb-3">🔥 缓存快照</h3>
        <div className="grid grid-cols-2 gap-3">
          {event.cacheSnapshot.length === 0 ? (
            <p className="text-gray-500 col-span-2">缓存为空</p>
          ) : (
            event.cacheSnapshot.map((entry, index) => (
              <div
                key={entry.dishId}
                className={`p-3 rounded-lg border ${
                  entry.isDirty
                    ? 'bg-[#D32F2F]/10 border-[#D32F2F]/50'
                    : 'bg-[#1D1A17] border-[#3D3833]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{entry.dishName}</span>
                  {entry.isDirty && (
                    <span className="text-xs bg-[#D32F2F] text-white px-2 py-0.5 rounded">脏</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>版本: {entry.version}</div>
                  <div>访问: {entry.accessCount}次</div>
                  <div>TTL: {(entry.ttl / 1000).toFixed(1)}s</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 mb-3">📝 详细信息</h3>
        <div className="p-4 bg-[#1D1A17] rounded-xl border border-[#3D3833]">
          <pre className="text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        </div>
      </div>
    </motion.div>
  );
}
