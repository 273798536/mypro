import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

export function EventLog() {
  const { eventLog } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [eventLog]);

  const getLogColor = (message: string) => {
    if (message.includes('✅')) return 'text-[#81C784]';
    if (message.includes('🍳')) return 'text-[#64B5F6]';
    if (message.includes('⚠️')) return 'text-[#FFD54F]';
    if (message.includes('💥')) return 'text-[#D32F2F]';
    if (message.includes('😡')) return 'text-[#FF6B6B]';
    if (message.includes('🔥')) return 'text-[#FF9800]';
    return 'text-gray-400';
  };

  return (
    <div className="h-28 bg-[#1D1A17] border-t-2 border-[#5D554D]">
      <div className="px-4 py-2 border-b border-[#3D3833] flex items-center gap-2">
        <span className="text-sm">📜</span>
        <span className="text-xs font-bold text-gray-400">事件日志</span>
      </div>
      <div
        ref={containerRef}
        className="h-[calc(100%-36px)] overflow-y-auto px-4 py-2 font-mono text-xs space-y-1 scrollbar-thin"
      >
        {eventLog.length === 0 ? (
          <div className="text-gray-600 text-center py-4">暂无事件...</div>
        ) : (
          eventLog.map((log, index) => (
            <div key={index} className={getLogColor(log)}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
