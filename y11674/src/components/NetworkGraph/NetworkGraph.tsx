import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNetworkStore } from '../../store/useNetworkStore';
import { useForceLayout } from './useForceLayout';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { StarField } from './StarField';
import { findShortestPath } from '../../utils/pathFinder';

interface SceneProps {
  onPositionUpdate: (positions: Map<string, { x: number; y: number; z: number }>) => void;
}

function Scene({ onPositionUpdate }: SceneProps) {
  const { nodes, edges, selectedNode, selectedPath, pathStartNode, filters, viewParams, setSelectedNode, setPathStartNode, setSelectedPath } = useNetworkStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());
  const { getPosition, setPosition } = useForceLayout(nodes, edges, viewParams.autoLayout, onPositionUpdate);
  
  const handlePositionUpdate = useCallback((positions: Map<string, { x: number; y: number; z: number }>) => {
    setNodePositions(positions);
    onPositionUpdate(positions);
  }, [onPositionUpdate]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (!filters.nodeTypes.includes(node.type)) return false;
      if (!filters.riskLevels.includes(node.riskLevel)) return false;
      if (filters.showBlacklistOnly && !node.isBlacklist) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return node.label.toLowerCase().includes(query) || 
               node.id.toLowerCase().includes(query);
      }
      return true;
    });
  }, [nodes, filters]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);
  
  const filteredEdges = useMemo(() => {
    return edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [edges, visibleNodeIds]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (pathStartNode) {
      if (pathStartNode !== nodeId) {
        const result = findShortestPath(nodes, edges, pathStartNode, nodeId);
        if (result) {
          setSelectedPath(result.path);
          useNetworkStore.getState().addOperationRecord({
            type: 'path_find',
            description: `查找路径: ${nodes.find(n => n.id === pathStartNode)?.label} -> ${nodes.find(n => n.id === nodeId)?.label}`,
            operator: '当前用户',
          });
        }
      }
      setPathStartNode(null);
    } else {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
      setSelectedPath([]);
    }
  }, [selectedNode, pathStartNode, nodes, edges, setSelectedNode, setPathStartNode, setSelectedPath]);

  const handleNodeDragEnd = useCallback((nodeId: string, position: { x: number; y: number; z: number }) => {
    setPosition(nodeId, position.x, position.y, position.z);
  }, [setPosition]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
      
      <StarField count={1500} radius={80} />
      
      {viewParams.showEdges && filteredEdges.map(edge => {
        const sourcePos = nodePositions.get(edge.source) || { x: 0, y: 0, z: 0 };
        const targetPos = nodePositions.get(edge.target) || { x: 0, y: 0, z: 0 };
        const isInPath = selectedPath.length >= 2 && 
          selectedPath.some((nodeId, idx) => 
            idx < selectedPath.length - 1 &&
            ((selectedPath[idx] === edge.source && selectedPath[idx + 1] === edge.target) ||
             (selectedPath[idx] === edge.target && selectedPath[idx + 1] === edge.source))
          );
        
        return (
          <GraphEdge
            key={edge.id}
            edge={edge}
            startPosition={sourcePos}
            endPosition={targetPos}
            isInPath={isInPath}
            isDuplicate={!!edge.isDuplicate}
            animationEnabled={viewParams.animationEnabled}
          />
        );
      })}
      
      {filteredNodes.map(node => {
        const position = nodePositions.get(node.id) || { x: 0, y: 0, z: 0 };
        return (
          <GraphNode
            key={node.id}
            node={node}
            position={position}
            isSelected={selectedNode === node.id}
            isInPath={selectedPath.includes(node.id)}
            showLabel={viewParams.showLabels}
            animationEnabled={viewParams.animationEnabled}
            onClick={handleNodeClick}
            onPointerOver={setHoveredNode}
            onPointerOut={() => setHoveredNode(null)}
            onDragEnd={handleNodeDragEnd}
          />
        );
      })}
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={60}
      />
      
      <Effects>
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Effects>
    </>
  );
}

export function NetworkGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());

  const handlePositionUpdate = useCallback((newPositions: Map<string, { x: number; y: number; z: number }>) => {
    setPositions(newPositions);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 15, 30], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(to bottom, #0a1628, #0f172a, #1e293b)' }}
      >
        <fog attach="fog" args={['#0a1628', 30, 80]} />
        <Scene onPositionUpdate={handlePositionUpdate} />
      </Canvas>
    </div>
  );
}
