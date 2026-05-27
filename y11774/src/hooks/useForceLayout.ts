import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3-force-3d';
import type { Asset, CorrelationEdge, AssetNode } from '@/types';

interface UseForceLayoutOptions {
  assets: Asset[];
  edges: CorrelationEdge[];
  nodeRadius?: number;
  linkDistance?: number;
  chargeStrength?: number;
}

export const useForceLayout = ({
  assets,
  edges,
  nodeRadius = 1,
  linkDistance = 5,
  chargeStrength = -30,
}: UseForceLayoutOptions) => {
  const [nodes, setNodes] = useState<Map<string, AssetNode>>(new Map());
  const simulationRef = useRef<d3.Simulation<AssetNode, CorrelationEdge> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (assets.length === 0) return;

    const initialNodes: AssetNode[] = assets.map((asset) => ({
      ...asset,
      position: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
      },
      vx: 0,
      vy: 0,
      vz: 0,
    }));

    const nodeMap = new Map<string, AssetNode>();
    initialNodes.forEach((node) => nodeMap.set(node.id, node));
    setNodes(nodeMap);

    const validEdges = edges.filter(
      (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
    );

    const simulation = d3
      .forceSimulation(initialNodes)
      .force('link', d3.forceLink(validEdges).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter())
      .force('collision', d3.forceCollide().radius(nodeRadius * 2))
      .stop();

    for (let i = 0; i < 100; i++) {
      simulation.tick();
    }

    const stabilizedMap = new Map<string, AssetNode>();
    initialNodes.forEach((node) => {
      stabilizedMap.set(node.id, { ...node });
    });
    setNodes(stabilizedMap);

    simulationRef.current = simulation;
    setIsSimulating(true);

    const animate = () => {
      simulation.tick();
      const updatedMap = new Map<string, AssetNode>();
      initialNodes.forEach((node) => {
        updatedMap.set(node.id, { ...node });
      });
      setNodes(updatedMap);

      if (simulation.alpha() > simulation.alphaMin()) {
        requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
      }
    };

    simulation.alpha(0.3).restart();
    requestAnimationFrame(animate);

    return () => {
      simulation.stop();
    };
  }, [assets.length, edges, nodeRadius, linkDistance, chargeStrength]);

  const getNodePosition = (assetId: string) => {
    const node = nodes.get(assetId);
    return node ? node.position : { x: 0, y: 0, z: 0 };
  };

  return {
    nodes,
    getNodePosition,
    isSimulating,
  };
};
