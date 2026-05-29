import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3-force-3d';
import type { WalletNode, TransferEdge } from '@/types';
import { FORCE_CONFIG } from '@/utils/forceLayout';

interface SimulationNode extends WalletNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface SimulationLink {
  source: string | SimulationNode;
  target: string | SimulationNode;
  value: number;
}

export function useForceSimulation(
  nodes: WalletNode[],
  edges: TransferEdge[],
  onUpdate: (positions: Map<string, { x: number; y: number; z: number }>) => void
) {
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (nodes.length === 0) {
      stopSimulation();
      return;
    }

    nodesRef.current = nodes.map(n => ({
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      z: n.z ?? 0,
      vx: n.vx ?? 0,
      vy: n.vy ?? 0,
      vz: n.vz ?? 0,
    }));

    const links: SimulationLink[] = edges.map(e => ({
      source: e.source,
      target: e.target,
      value: Math.log10(e.amount + 1),
    }));

    const simulation = d3.forceSimulation<SimulationNode>(nodesRef.current)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(FORCE_CONFIG.linkDistance)
        .strength(FORCE_CONFIG.linkStrength))
      .force('charge', d3.forceManyBody().strength(FORCE_CONFIG.charge))
      .force('center', d3.forceCenter(0, 0, 0).strength(FORCE_CONFIG.centerStrength))
      .force('collision', d3.forceCollide().radius(FORCE_CONFIG.collideRadius))
      .force('x', d3.forceX(0).strength(0.05))
      .force('y', d3.forceY(0).strength(0.05))
      .force('z', d3.forceZ(0).strength(0.05))
      .velocityDecay(FORCE_CONFIG.velocityDecay);

    simulationRef.current = simulation;

    let tickCount = 0;
    const totalTicks = FORCE_CONFIG.iterations;

    const animate = () => {
      if (tickCount < totalTicks) {
        simulation.tick(3);
        tickCount += 3;

        const positions = new Map<string, { x: number; y: number; z: number }>();
        nodesRef.current.forEach(node => {
          positions.set(node.id, { x: node.x, y: node.y, z: node.z });
        });
        onUpdate(positions);

        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        simulation.stop();
      }
    };

    animate();

    return () => {
      stopSimulation();
    };
  }, [nodes, edges, onUpdate, stopSimulation]);

  const setNodePosition = useCallback((nodeId: string, x: number, y: number, z: number) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.fz = z;
      node.x = x;
      node.y = y;
      node.z = z;
    }
  }, []);

  const releaseNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
      node.fz = null;
    }
  }, []);

  const reheat = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  return {
    setNodePosition,
    releaseNode,
    reheat,
    stopSimulation,
  };
}

export default useForceSimulation;
