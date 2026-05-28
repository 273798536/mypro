import { useEffect, useRef, useCallback } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { NetworkNode, NetworkEdge } from '../types';
import { useNetworkStore } from '../store/networkStore';
import { getBottleneckColor } from '../utils/bottleneckAnalyzer';

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  edgeFlows?: Record<string, number>;
  bottleneckIds?: Set<string>;
}

export function NetworkGraph({ nodes, edges, edgeFlows = {}, bottleneckIds = new Set() }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSet = useRef(new DataSet<any>([]));
  const edgesDataSet = useRef(new DataSet<any>([]));
  
  const { selectedNodeId, selectedEdgeId, setSelectedNode, setSelectedEdge } = useNetworkStore();

  const getNodeColor = useCallback((node: NetworkNode) => {
    const colors: Record<string, string> = {
      warehouse: '#3b82f6',
      transit: '#8b5cf6',
      destination: '#10b981',
      source: '#f59e0b'
    };
    return colors[node.type] || '#6b7280';
  }, []);

  const getNodeShape = useCallback((node: NetworkNode) => {
    const shapes: Record<string, string> = {
      warehouse: 'dot',
      transit: 'diamond',
      destination: 'box',
      source: 'star'
    };
    return shapes[node.type] || 'dot';
  }, []);

  const getEdgeWidth = useCallback((edge: NetworkEdge) => {
    const flow = edgeFlows[edge.id] || 0;
    const utilization = edge.capacity > 0 ? flow / edge.capacity : 0;
    return Math.max(2, Math.min(15, utilization * 15));
  }, [edgeFlows]);

  const getEdgeColor = useCallback((edge: NetworkEdge) => {
    if (edge.disabled) return { color: '#d1d5db', highlight: '#9ca3af' };
    
    const flow = edgeFlows[edge.id] || 0;
    const utilization = edge.capacity > 0 ? flow / edge.capacity : 0;
    
    if (bottleneckIds.has(edge.id)) {
      const color = getBottleneckColor(utilization);
      return { color, highlight: color, hover: color };
    }
    
    return { color: '#94a3b8', highlight: '#3b82f6', hover: '#60a5fa' };
  }, [edgeFlows, bottleneckIds]);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = nodes.map(node => ({
      id: node.id,
      label: node.name,
      color: getNodeColor(node),
      shape: getNodeShape(node),
      size: node.type === 'warehouse' ? 25 : 20,
      font: { size: 12, color: '#1e293b' },
      shadow: true,
      x: node.x,
      y: node.y
    }));

    const visEdges = edges.map(edge => {
      const flow = edgeFlows[edge.id] || 0;
      const label = edgeFlows[edge.id] !== undefined 
        ? `${flow}/${edge.capacity}`
        : String(edge.capacity);
      
      return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label,
        width: getEdgeWidth(edge),
        color: getEdgeColor(edge),
        dashes: edge.disabled,
        font: { size: 10, align: 'middle' },
        smooth: { type: 'continuous' },
        arrows: edge.bidirectional ? 'to;from' : 'to'
      };
    });

    nodesDataSet.current.clear();
    edgesDataSet.current.clear();
    nodesDataSet.current.add(visNodes);
    edgesDataSet.current.add(visEdges);

    if (!networkRef.current) {
      const data = {
        nodes: nodesDataSet.current,
        edges: edgesDataSet.current
      };

      const options: any = {
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.3,
            springLength: 150,
            springConstant: 0.04
          },
          stabilization: {
            enabled: true,
            iterations: 100
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: false
        },
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 4
        }
      };

      networkRef.current = new Network(containerRef.current, data, options);
      
      networkRef.current.on('click', (params: any) => {
        if (params.nodes.length > 0) {
          setSelectedNode(params.nodes[0]);
        } else if (params.edges.length > 0) {
          setSelectedEdge(params.edges[0]);
        } else {
          setSelectedNode(null);
          setSelectedEdge(null);
        }
      });

      networkRef.current.on('stabilized', () => {
        if (networkRef.current) {
          const positions = networkRef.current.getPositions();
          nodes.forEach((node, index) => {
            if (positions[node.id]) {
              node.x = positions[node.id].x;
              node.y = positions[node.id].y;
            }
          });
        }
      });
    } else {
      nodesDataSet.current.clear();
      edgesDataSet.current.clear();
      nodesDataSet.current.add(visNodes);
      edgesDataSet.current.add(visEdges);
    }
  }, [nodes, edges, edgeFlows, bottleneckIds, getNodeColor, getNodeShape, getEdgeWidth, getEdgeColor, setSelectedNode, setSelectedEdge]);

  useEffect(() => {
    if (networkRef.current) {
      if (selectedNodeId) {
        networkRef.current.selectNodes([selectedNodeId]);
      } else if (selectedEdgeId) {
        networkRef.current.selectEdges([selectedEdgeId]);
      } else {
        networkRef.current.selectNodes([]);
        networkRef.current.selectEdges([]);
      }
    }
  }, [selectedNodeId, selectedEdgeId]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 rounded-lg border border-slate-200" />
  );
}
