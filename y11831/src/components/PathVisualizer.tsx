import { MapPin, Navigation } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { pathConnections } from '../data/mockData';

export function PathVisualizer() {
  const { pathNodes, activeDeliveries } = useGameStore();

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'kitchen':
        return 'bg-orange-500';
      case 'table':
        return 'bg-blue-500';
      case 'entrance':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getNodeSize = (type: string) => {
    switch (type) {
      case 'kitchen':
      case 'entrance':
        return 'w-12 h-12';
      case 'table':
        return 'w-10 h-10';
      default:
        return 'w-6 h-6';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <Navigation className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold text-gray-800">餐厅路径图</h2>
      </div>

      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl h-80 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {Object.entries(pathConnections).map(([nodeId, connections]) => {
            const fromNode = pathNodes.find(n => n.id === nodeId);
            if (!fromNode) return null;
            
            return connections.map(connId => {
              const toNode = pathNodes.find(n => n.id === connId);
              if (!toNode) return null;
              
              if (nodeId > connId) return null;
              
              return (
                <line
                  key={`${nodeId}-${connId}`}
                  x1={`${fromNode.x}%`}
                  y1={`${fromNode.y}%`}
                  x2={`${toNode.x}%`}
                  y2={`${toNode.y}%`}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            });
          })}
          
          {activeDeliveries.map(delivery => {
            if (delivery.path.length < 2) return null;
            const pathData = delivery.path.slice(0, delivery.currentIndex + 2);
            if (pathData.length < 2) return null;
            
            const pathString = pathData.map((node, i) => 
              `${i === 0 ? 'M' : 'L'} ${node.x}% ${node.y}%`
            ).join(' ');
            
            return (
              <path
                key={delivery.orderId}
                d={pathString}
                stroke="#f97316"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {pathNodes.map(node => (
          <div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div
              className={`${getNodeSize(node.type)} ${getNodeColor(node.type)} rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform hover:scale-110`}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <span className="mt-1 text-xs font-medium text-gray-600 bg-white/80 px-1.5 py-0.5 rounded whitespace-nowrap">
              {node.label}
            </span>
          </div>
        ))}

        {activeDeliveries.map(delivery => {
          const currentNode = delivery.path[delivery.currentIndex];
          if (!currentNode) return null;
          
          return (
            <div
              key={`delivery-${delivery.orderId}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${currentNode.x}%`, top: `${currentNode.y}%` }}
            >
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg animate-bounce">
                🍽️
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500" />
          <span>厨房</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span>餐桌</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span>入口</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-400" />
          <span>走廊</span>
        </div>
      </div>
    </div>
  );
}
