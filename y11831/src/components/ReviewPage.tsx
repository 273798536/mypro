import { ArrowLeft, Search, Clock, ChefHat, Database, Navigation, Users, ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Order, TraceEvent } from '../types/game';

interface ReviewPageProps {
  onBack: () => void;
  onRestart: () => void;
}

export function ReviewPage({ onBack, onRestart }: ReviewPageProps) {
  const { orders, traceLinks, chefs, getOrderTrace } = useGameStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const selectedTrace = selectedOrderId ? getOrderTrace(selectedOrderId) : null;

  const getEventIcon = (type: TraceEvent['type']) => {
    switch (type) {
      case 'arrive':
        return <Users className="w-4 h-4" />;
      case 'queue':
        return <Clock className="w-4 h-4" />;
      case 'assign':
      case 'start':
        return <ChefHat className="w-4 h-4" />;
      case 'cache_hit':
      case 'cache_miss':
        return <Database className="w-4 h-4" />;
      case 'complete':
      case 'deliver':
        return <Navigation className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: TraceEvent['type']) => {
    switch (type) {
      case 'arrive':
        return 'bg-blue-100 text-blue-600';
      case 'queue':
        return 'bg-gray-100 text-gray-600';
      case 'assign':
      case 'start':
        return 'bg-orange-100 text-orange-600';
      case 'cache_hit':
        return 'bg-green-100 text-green-600';
      case 'cache_miss':
        return 'bg-yellow-100 text-yellow-600';
      case 'complete':
      case 'deliver':
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <h1 className="text-3xl font-bold text-gray-800">游戏复盘</h1>
          </div>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">订单列表</h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索订单号或顾客名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedOrderId === order.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          {order.id} - {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          桌号: {order.tableNumber} | ¥{order.totalPrice}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedOrder && selectedTrace ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                      订单 {selectedOrder.id} 追踪
                    </h2>
                    <div className="text-gray-600">
                      顾客: {selectedOrder.customerName} | 桌号: {selectedOrder.tableNumber}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedOrder.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : selectedOrder.status === 'starved'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {selectedOrder.status === 'completed'
                      ? '已完成'
                      : selectedOrder.status === 'starved'
                      ? '已饥饿'
                      : selectedOrder.status}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">订单详情</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">到达时间</div>
                      <div className="font-bold text-gray-800">{selectedOrder.arriveTime}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">开始时间</div>
                      <div className="font-bold text-gray-800">{selectedOrder.startTime ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">结束时间</div>
                      <div className="font-bold text-gray-800">{selectedOrder.endTime ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">等待时间</div>
                      <div className="font-bold text-gray-800">{selectedOrder.waitTime?.toFixed(1) ?? '-'}s</div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">订单项</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-700">{item.menuName}</span>
                        <span className="text-gray-600">x{item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-300">
                      <span className="font-medium text-gray-800">总计</span>
                      <span className="font-bold text-amber-600">¥{selectedOrder.totalPrice}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.assignedChefId && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">处理厨师</h3>
                    {(() => {
                      const chef = chefs.find((c) => c.id === selectedOrder.assignedChefId);
                      return chef ? (
                        <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-4">
                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                            <ChefHat className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{chef.name}</div>
                            <div className="text-sm text-gray-600">
                              效率: {chef.efficiency}x | 等级: {'⭐'.repeat(chef.skillLevel)}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">事件时间线</h3>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {selectedTrace.events.map((event, index) => (
                        <div key={index} className="relative pl-10">
                          <div
                            className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(
                              event.type
                            )}`}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-800">{event.description}</span>
                              <span className="text-xs text-gray-500">t={event.timestamp}</span>
                            </div>
                            {event.relatedEntityId && (
                              <div className="text-xs text-gray-500">
                                关联ID: {event.relatedEntityId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">选择订单查看详情</h3>
                <p className="text-gray-400">
                  点击左侧订单列表中的任意订单，查看完整的处理链路追踪
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">算法分析报告</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">队列策略分析</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• FIFO: 公平但可能让短订单等待</p>
                <p>• SJF: 总等待时间最短但可能导致饥饿</p>
                <p>• 优先级: VIP优先但可能不公平</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-800">缓存策略分析</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• LRU: 适合访问模式稳定的场景</p>
                <p>• LFU: 适合热点菜品明显的场景</p>
                <p>• FIFO: 实现简单但可能误删热门</p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-800">路径算法分析</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Dijkstra: 保证最短但计算慢</p>
                <p>• A*: 启发式搜索，效率更高</p>
                <p>• 贪心: 最快但可能绕远</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
