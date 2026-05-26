import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3-force';
import type { WalletNode, TransactionEdge } from '../types';

interface ForceNode extends d3.SimulationNodeDatum {
  id: string;
  importance: number;
  isExchange: boolean;
  isSuspicious: boolean;
}

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  value: number;
}

export const useForceLayout = (
  nodes: WalletNode[],
  edges: TransactionEdge[],
  dimensions: { width: number; height: number }
) => {
  const simulationRef = useRef<d3.Simulation<ForceNode, ForceLink> | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  const isAnimatingRef = useRef(true);

  const getNodePosition = useCallback((nodeId: string) => {
    return nodePositionsRef.current.get(nodeId) || { x: 0, y: 0, z: 0 };
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;

    const forceNodes: ForceNode[] = nodes.map(n => ({
      id: n.id,
      importance: n.importance,
      isExchange: n.isExchange,
      isSuspicious: n.isSuspicious,
    }));

    const nodeMap = new Map(forceNodes.map(n => [n.id, n]));

    const forceLinks: ForceLink[] = edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        value: Math.log(e.amount + 1) * 0.5,
      }));

    const simulation = d3.forceSimulation<ForceNode>(forceNodes)
      .force('link', d3.forceLink<ForceNode, ForceLink>(forceLinks)
        .id(d => d.id)
        .distance(d => Math.max(50, 150 - d.value * 20))
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody<ForceNode>()
        .strength(d => (d.isExchange ? -800 : d.isSuspicious ? -500 : -200))
      )
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<ForceNode>().radius(d => (d.isExchange ? 40 : 20)))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      forceNodes.forEach(node => {
        const z = (Math.random() - 0.5) * 100 * node.importance;
        nodePositionsRef.current.set(node.id, {
          x: node.x || 0,
          y: node.y || 0,
          z: z,
        });
      });
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges]);

  useEffect(() => {
    if (!simulationRef.current) return;

    if (isAnimatingRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, [nodes, edges]);

  const stopSimulation = useCallback(() => {
    isAnimatingRef.current = false;
    simulationRef.current?.stop();
  }, []);

  const restartSimulation = useCallback(() => {
    isAnimatingRef.current = true;
    simulationRef.current?.alpha(0.3).restart();
  }, []);

  return {
    getNodePosition,
    stopSimulation,
    restartSimulation,
  };
};
