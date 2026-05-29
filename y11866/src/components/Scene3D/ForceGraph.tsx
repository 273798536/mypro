import { useState, useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WalletNode as WalletNodeType, TransferEdge as TransferEdgeType } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useForceSimulation } from '@/hooks/useForceSimulation';
import { WalletNode } from './WalletNode';
import { TransferEdge } from './TransferEdge';

interface ForceGraphProps {
  nodes: WalletNodeType[];
  edges: TransferEdgeType[];
}

export function ForceGraph({ nodes, edges }: ForceGraphProps) {
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const {
    selectedNodeId,
    selectedEdgeId,
    highlightedNodeIds,
    highlightedEdgeIds,
    showLabels,
    setSelectedNode,
    setSelectedEdge,
    highlightItems,
    clearHighlights,
  } = useAppStore();

  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeIds), [highlightedEdgeIds]);

  const handlePositionsUpdate = useCallback((positions: Map<string, { x: number; y: number; z: number }>) => {
    setNodePositions(new Map(positions));
  }, []);

  const { setNodePosition, releaseNode } = useForceSimulation(nodes, edges, handlePositionsUpdate);

  const getNodePosition = useCallback((nodeId: string) => {
    return nodePositions.get(nodeId) || { x: 0, y: 0, z: 0 };
  }, [nodePositions]);

  const handleNodeDragStart = useCallback((nodeId: string) => {
    setDraggingNodeId(nodeId);
  }, []);

  const handleNodeDrag = useCallback((nodeId: string, point: THREE.Vector3) => {
    setNodePosition(nodeId, point.x, point.y, point.z);
    setNodePositions(prev => {
      const next = new Map(prev);
      next.set(nodeId, { x: point.x, y: point.y, z: point.z });
      return next;
    });
  }, [setNodePosition]);

  const handleNodeDragEnd = useCallback((nodeId: string) => {
    setDraggingNodeId(null);
    releaseNode(nodeId);
  }, [releaseNode]);

  const sortedEdges = useMemo(() => {
    return [...edges].sort((a, b) => {
      if (a.id === selectedEdgeId || b.id === selectedEdgeId) return a.id === selectedEdgeId ? 1 : -1;
      if (highlightedEdgeSet.has(a.id) || highlightedEdgeSet.has(b.id)) return highlightedEdgeSet.has(a.id) ? 1 : -1;
      if (a.riskLevel === 'high' || b.riskLevel === 'high') return a.riskLevel === 'high' ? -1 : 1;
      return b.amount - a.amount;
    });
  }, [edges, selectedEdgeId, highlightedEdgeSet]);

  return (
    <group>
      {sortedEdges.map(edge => {
        const sourcePos = getNodePosition(edge.source);
        const targetPos = getNodePosition(edge.target);

        return (
          <TransferEdge
            key={edge.id}
            edge={edge}
            sourcePosition={sourcePos}
            targetPosition={targetPos}
            isSelected={edge.id === selectedEdgeId}
            isHighlighted={highlightedEdgeSet.has(edge.id) || hoveredEdgeId === edge.id}
            onClick={() => setSelectedEdge(edge.id)}
            onPointerOver={() => {
              setHoveredEdgeId(edge.id);
              highlightItems([edge.source, edge.target], [edge.id]);
            }}
            onPointerOut={() => {
              setHoveredEdgeId(null);
              clearHighlights();
            }}
          />
        );
      })}

      {nodes.map(node => {
        const position = getNodePosition(node.id);
        const isSelected = node.id === selectedNodeId;
        const isHighlighted = highlightedNodeSet.has(node.id) || hoveredNodeId === node.id;

        return (
          <WalletNode
            key={node.id}
            node={node}
            position={position}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            showLabel={showLabels}
            onClick={() => setSelectedNode(node.id)}
            onPointerOver={() => {
              setHoveredNodeId(node.id);
              const relatedEdges = edges.filter(e => e.source === node.id || e.target === node.id).map(e => e.id);
              const relatedNodes = new Set<string>();
              edges.filter(e => e.source === node.id || e.target === node.id).forEach(e => {
                relatedNodes.add(e.source);
                relatedNodes.add(e.target);
              });
              highlightItems(Array.from(relatedNodes), relatedEdges);
            }}
            onPointerOut={() => {
              setHoveredNodeId(null);
              clearHighlights();
            }}
            onDragStart={() => handleNodeDragStart(node.id)}
            onDrag={(e) => handleNodeDrag(node.id, e.point)}
            onDragEnd={() => handleNodeDragEnd(node.id)}
          />
        );
      })}
    </group>
  );
}

export default ForceGraph;
