import { useGameStore } from '../store/gameStore';
import { RailwayNode } from '../types';
import { format } from 'date-fns';

const RailwayView = () => {
  const { railwayNodes, currentNodeIndex, setCurrentNode } = useGameStore();

  const getNodeIcon = (type: RailwayNode['type']) => {
    switch (type) {
      case 'bond_start': return '🚉';
      case 'coupon_station': return '💰';
      case 'put_junction': return '🔀';
      case 'default_trap': return '⚠️';
      case 'destination': return '🏁';
      default: return '⚪';
    }
  };

  const getNodeColor = (status: RailwayNode['status']) => {
    switch (status) {
      case 'completed': return 'bg-rail-success border-rail-success glow-success';
      case 'active': return 'bg-rail-info border-rail-info glow-info animate-pulse';
      case 'failed': return 'bg-rail-danger border-rail-danger glow-danger';
      case 'skipped': return 'bg-gray-500 border-gray-500';
      default: return 'bg-gray-600 border-gray-600';
    }
  };

  const getLineColor = (index: number) => {
    const prevNode = railwayNodes[index - 1];
    if (!prevNode) return 'bg-gray-600';
    if (prevNode.status === 'completed') return 'bg-rail-success';
    if (prevNode.status === 'failed') return 'bg-rail-danger';
    return 'bg-gray-600';
  };

  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="flex items-center min-w-max">
        {railwayNodes.map((node, index) => (
          <div key={node.id} className="flex items-center">
            {index > 0 && (
              <div className={`w-16 h-1 ${getLineColor(index)} mx-2`}></div>
            )}
            
            <div
              onClick={() => setCurrentNode(index)}
              className={`relative cursor-pointer group`}
            >
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all ${getNodeColor(node.status)}`}>
                {getNodeIcon(node.type)}
              </div>
              
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <p className="text-xs text-gray-400 text-center max-w-20 truncate">
                  {node.name}
                </p>
              </div>

              {node.status === 'active' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-2xl animate-bounce">🚂</span>
                </div>
              )}

              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-rail-accent rounded-lg px-3 py-2 text-xs whitespace-nowrap border border-gray-600">
                  <p className="text-white font-medium">{node.name}</p>
                  {node.couponId && (
                    <p className="text-gray-300">
                      {node.type === 'coupon_station' && '点击查看详情'}
                    </p>
                  )}
                  <p className="text-gray-400 mt-1">
                    状态: {node.status === 'completed' ? '已完成' : 
                           node.status === 'active' ? '进行中' : 
                           node.status === 'failed' ? '失败' : 
                           node.status === 'skipped' ? '已跳过' : '待处理'}
                  </p>
                  {node.processedAt && (
                    <p className="text-gray-400">
                      处理时间: {format(node.processedAt, 'MM-dd HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12"></div>
    </div>
  );
};

export default RailwayView;
