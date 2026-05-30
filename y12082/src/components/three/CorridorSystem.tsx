import { useAppStore } from '../../store/useAppStore';
import * as THREE from 'three';

const CorridorSystem = () => {
  const { edges, filters, selectedEdge, setSelectedEdge } = useAppStore();
  
  const getCorridorColor = (status: string) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'closed': return filters.showClosedPaths ? '#ef4444' : '#374151';
      case 'access_issue': return filters.showAccessIssues ? '#f59e0b' : '#374151';
      case 'under_maintenance': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };
  
  const nodes = useAppStore(state => state.nodes);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  return (
    <group>
      {edges.map(edge => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        
        if (!filters.showClosedPaths && edge.status === 'closed') return null;
        if (!filters.showAccessIssues && edge.status === 'access_issue') return null;
        
        const start = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
        const end = new THREE.Vector3(toNode.x, toNode.y, toNode.z);
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const distance = start.distanceTo(end);
        const direction = end.clone().sub(start).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(1, 0, 0),
          direction
        );
        
        const isSelected = selectedEdge === edge.id;
        const color = getCorridorColor(edge.status);
        
        return (
          <group key={edge.id}>
            <mesh
              position={midPoint}
              quaternion={quaternion}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEdge(edge.id);
              }}
            >
              <boxGeometry args={[distance, 0.5, 4]} />
              <meshStandardMaterial 
                color={color} 
                transparent 
                opacity={isSelected ? 0.9 : 0.6}
                emissive={isSelected ? color : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
              />
            </mesh>
            
            <mesh
              position={[midPoint.x, -0.5, midPoint.z]}
              quaternion={quaternion}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[distance, 4]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            
            {edge.status !== 'open' && (
              <mesh position={[midPoint.x, 1.5, midPoint.z]}>
                <boxGeometry args={[2, 1, 0.2]} />
                <meshStandardMaterial 
                  color={edge.status === 'closed' ? '#ef4444' : '#f59e0b'}
                  emissive={edge.status === 'closed' ? '#ef4444' : '#f59e0b'}
                  emissiveIntensity={0.5}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default CorridorSystem;
