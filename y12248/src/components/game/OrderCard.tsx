import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import type { Order } from '../../types/order';
import { PRIORITY_CONFIG } from '../../types/order';

interface OrderCardProps {
  order: Order;
  now: number;
}

export function OrderCard({ order, now }: OrderCardProps) {
  const config = PRIORITY_CONFIG[order.priority];
  const elapsed = now - order.createdAt;
  const remaining = Math.max(0, order.expectedAt - now);
  const remainingSeconds = Math.ceil(remaining / 1000);

  const getVariant = () => {
    if (order.status === 'completed') return 'success';
    if (order.status === 'failed') return 'danger';
    if (order.cacheCheck?.result === 'expired') return 'warning';
    if (order.cacheCheck?.result === 'hit') return 'hot';
    if (order.patience < 30) return 'danger';
    if (order.patience < 60) return 'warning';
    return 'default';
  };

  const getGlow = () => {
    if (order.status === 'completed') return false;
    if (order.cacheCheck?.result === 'hit') return true;
    if (order.patience < 30) return true;
    return false;
  };

  const getStatusIcon = () => {
    switch (order.cacheCheck?.result) {
      case 'hit':
        return <CheckCircle className="w-4 h-4 text-[#81C784]" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-[#FFD54F] animate-pulse" />;
      case 'miss':
        return <XCircle className="w-4 h-4 text-[#D32F2F]" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (order.cacheCheck?.result) {
      case 'hit':
        return '缓存命中';
      case 'expired':
        return '已过期';
      case 'miss':
        return '回源中';
      default:
        return '等待处理';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        layout
      >
        <Card
          variant={getVariant()}
          glow={getGlow()}
          className={`p-4 ${
            order.cacheCheck?.result === 'expired' ? 'animate-[shake_0.5s_ease-in-out]' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{order.dishName}</span>
                {getStatusIcon()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded-full"
                  style={{ backgroundColor: config.color + '33', color: config.color }}
                >
                  {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTime(elapsed)} / {formatTime(order.expectedAt - order.createdAt)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className={`font-mono font-bold ${
                  remainingSeconds < 10 ? 'text-[#D32F2F]' : 
                  remainingSeconds < 30 ? 'text-[#FFD54F]' : 'text-gray-300'
                }`}>
                  {remainingSeconds}s
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{getStatusText()}</div>
            </div>
          </div>

          <ProgressBar
            value={order.patience}
            variant="patience"
            showLabel
            className="h-3"
          />
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              耐心值: {Math.round(order.patience)}%
            </span>
            {order.cacheCheck && (
              <span className="text-xs text-gray-500">
                v{order.cacheCheck.cacheVersion}
              </span>
            )}
          </div>

          {order.servedWithDirty && (
            <div className="mt-2 p-2 bg-[#D32F2F]/20 rounded-md border border-[#D32F2F]/50">
              <span className="text-xs text-[#FF6B6B]">⚠️ 脏数据出餐，证据已留存</span>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
