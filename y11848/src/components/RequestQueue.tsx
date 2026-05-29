import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Request } from '../types/game';
import { useGameStore } from '../store/gameStore';

interface RequestQueueProps {
  requests: Request[];
}

const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'read':
      return '📖';
    case 'write':
      return '✏️';
    case 'delete':
      return '🗑️';
    default:
      return '❓';
  }
};

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'read':
      return '读取';
    case 'write':
      return '写入';
    case 'delete':
      return '删除';
    default:
      return '未知';
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'read':
      return 'border-blue-500 bg-blue-500/10';
    case 'write':
      return 'border-tech-green bg-tech-green/10';
    case 'delete':
      return 'border-tech-red bg-tech-red/10';
    default:
      return 'border-gray-500 bg-gray-500/10';
  }
};

export const RequestQueue: React.FC<RequestQueueProps> = ({ requests }) => {
  const { selectedRequestId, selectRequest, processRequest } = useGameStore();

  const handleRequestClick = (request: Request) => {
    selectRequest(request.id === selectedRequestId ? null : request.id);
  };

  const handleProcessClick = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    processRequest(requestId);
  };

  return (
    <div className="bg-tech-blue/50 rounded-xl p-4 border border-tech-cyan/20 h-full flex flex-col">
      <h3 className="text-tech-cyan font-bold text-lg mb-4 flex items-center gap-2">
        <span className="text-2xl">📨</span>
        请求队列
        <span className="text-sm bg-tech-cyan/20 text-tech-cyan px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence>
          {requests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-500 text-center py-8"
            >
              暂无请求
            </motion.div>
          ) : (
            requests.map((request) => {
              const isSelected = selectedRequestId === request.id;
              const age = Date.now() - request.createdAt;
              const timeoutProgress = Math.min(100, (age / request.timeout) * 100);
              const isUrgent = timeoutProgress > 70;
              
              return (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleRequestClick(request)}
                  className={`
                    relative p-3 rounded-lg border-l-4 cursor-pointer transition-all
                    ${getTypeColor(request.type)}
                    ${isSelected ? 'ring-2 ring-tech-cyan bg-tech-cyan/10' : ''}
                    ${isUrgent ? 'animate-pulse' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTypeIcon(request.type)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">
                            {getTypeLabel(request.type)}
                          </span>
                          {request.isHotKey && (
                            <span className="text-xs bg-tech-purple text-white px-1.5 py-0.5 rounded-full">
                              🔥 热点
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-gray-400 mt-1">
                          {request.key}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <button
                        onClick={(e) => handleProcessClick(e, request.id)}
                        className="text-xs bg-tech-cyan text-tech-dark px-3 py-1 rounded hover:bg-tech-cyan/80 transition-colors font-medium"
                      >
                        处理
                      </button>
                    )}
                  </div>
                  {request.expectedValue && (
                    <div className="font-mono text-xs text-gray-500 mt-2 truncate">
                      值: {request.expectedValue}
                    </div>
                  )}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>超时倒计时</span>
                      <span className={isUrgent ? 'text-tech-red' : ''}>
                        {Math.max(0, Math.ceil((request.timeout - age) / 1000))}s
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all ${
                          isUrgent ? 'bg-tech-red' : 'bg-tech-cyan'
                        }`}
                        style={{ width: `${timeoutProgress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
