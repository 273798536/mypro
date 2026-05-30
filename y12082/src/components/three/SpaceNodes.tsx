import { useAppStore } from '../../store/useAppStore';
import { Html } from '@react-three/drei';

const SpaceNodes = () => {
  const { 
    nodes, 
    selectedNode, 
    setSelectedNode, 
    startNode, 
    endNode,
    workOrders,
    filters,
    anomalies,
    setStartNode,
    setEndNode
  } = useAppStore();
  
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'entrance': return '#10b981';
      case 'equipment_room': return '#6366f1';
      case 'pipe_well': return '#8b5cf6';
      case 'junction': return '#f97316';
      case 'stairwell': return '#14b8a6';
      case 'corridor': return '#3b82f6';
      default: return '#64748b';
    }
  };
  
  const getNodeSize = (type: string) => {
    switch (type) {
      case 'equipment_room': return 4;
      case 'pipe_well': return 2;
      case 'entrance': return 3;
      default: return 2.5;
    }
  };
  
  const getNodeHeight = (type: string) => {
    switch (type) {
      case 'equipment_room': return 5;
      case 'pipe_well': return 3;
      default: return 3;
    }
  };
  
  const hasWorkOrder = (nodeId: string) => {
    return workOrders.some(wo => wo.locationId === nodeId && wo.status !== 'completed');
  };
  
  const hasAnomaly = (nodeId: string) => {
    return anomalies.some(a => a.nodeId === nodeId && !a.resolved);
  };
  
  return (
    <group>
      {nodes.map(node => {
        const size = getNodeSize(node.type);
        const height = getNodeHeight(node.type);
        const isSelected = selectedNode === node.id;
        const isStart = startNode === node.id;
        const isEnd = endNode === node.id;
        const hasWO = filters.showWorkOrders && hasWorkOrder(node.id);
        const hasAnom = filters.showAnomalies && hasAnomaly(node.id);
        
        return (
          <group key={node.id} position={[node.x, 0, node.y]}>
            <mesh
              position={[0, height / 2, 0]}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!startNode) {
                  setStartNode(node.id);
                } else if (!endNode && startNode !== node.id) {
                  setEndNode(node.id);
                } else {
                  setStartNode(node.id);
                  setEndNode(null);
                }
              }}
            >
              <boxGeometry args={[size, height, size]} />
              <meshStandardMaterial 
                color={getNodeColor(node.type)}
                transparent
                opacity={isSelected ? 0.95 : 0.7}
                emissive={isSelected ? getNodeColor(node.type) : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
              />
            </mesh>
            
            <mesh
              position={[0, height + 0.1, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[size * 0.6, size * 0.8, 32]} />
              <meshBasicMaterial 
                color={isStart ? '#10b981' : isEnd ? '#ef4444' : '#334155'} 
                transparent 
                opacity={isStart || isEnd ? 0.8 : 0.3}
                side={2}
              />
            </mesh>
            
            {hasWO && (
              <mesh position={[size * 0.6, height + 1, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial 
                  color="#f59e0b" 
                  emissive="#f59e0b" 
                  emissiveIntensity={0.5}
                />
              </mesh>
            )}
            
            {hasAnom && (
              <mesh position={[-size * 0.6, height + 1, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial 
                  color="#ef4444" 
                  emissive="#ef4444" 
                  emissiveIntensity={0.5}
                />
              </mesh>
            )}
            
            {(isSelected || isStart || isEnd) && (
              <Html
                position={[0, height + 2, 0]}
                center
                distanceFactor={15}
              >
                <div 
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg
                    ${isStart ? 'bg-green-600 text-white' : 
                      isEnd ? 'bg-red-600 text-white' : 
                      'bg-slate-800 text-white'}
                  `}
                >
                  {isStart && '起点: '}
                  {isEnd && '终点: '}
                  {node.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default SpaceNodes;
