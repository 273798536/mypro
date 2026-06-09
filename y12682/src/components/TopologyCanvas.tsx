import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTopologyStore, useViewStore, useRecordStore } from '../store';
import type { ViewState } from '../types';

interface TopologyCanvasProps {
  onViewChange?: (view: ViewState) => void;
}

const TopologyCanvas: React.FC<TopologyCanvasProps> = ({ onViewChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, links, selectedNodeId, selectNode } = useTopologyStore();
  const { currentView, saveView } = useViewStore();
  const { addRecord } = useRecordStore();

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${currentView.x},${currentView.y}) scale(${currentView.zoom})`);

    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#94A3B8');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        const view: ViewState = {
          x: event.transform.x,
          y: event.transform.y,
          zoom: event.transform.k,
          timestamp: Date.now(),
        };
        saveView(view);
        onViewChange?.(view);
      });

    svg.call(zoom);

    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (!source || !target) return;

      const lineColor = link.status === 'normal' ? '#10B981' : 
                       link.status === 'warning' ? '#F59E0B' : '#EF4444';

      g.append('line')
        .attr('x1', source.position.x)
        .attr('y1', source.position.y)
        .attr('x2', target.position.x)
        .attr('y2', target.position.y)
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)')
        .style('cursor', 'pointer')
        .on('click', () => {
          addRecord({
            operator: '当前用户',
            operation: '查看连接详情',
            parameters: { linkId: link.id, type: link.type },
            result: 'success',
          });
        });
    });

    nodes.forEach(node => {
      const nodeGroup = g.append('g')
        .attr('transform', `translate(${node.position.x},${node.position.y})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          selectNode(node.id);
          addRecord({
            operator: '当前用户',
            operation: '选择节点',
            parameters: { nodeId: node.id, type: node.type },
            result: 'success',
          });
        });

      const radius = node.type === 'center' ? 30 : node.type === 'primary' ? 25 : 20;
      const nodeColor = node.type === 'center' ? '#2563EB' : 
                       node.type === 'primary' ? '#10B981' : 
                       node.type === 'secondary' ? '#F59E0B' : '#EF4444';

      nodeGroup.append('circle')
        .attr('r', radius)
        .attr('fill', nodeColor)
        .attr('stroke', selectedNodeId === node.id ? '#1E293B' : 'white')
        .attr('stroke-width', selectedNodeId === node.id ? 4 : 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

      const icon = node.type === 'center' ? '☀️' : 
                   node.type === 'primary' ? '🟢' : 
                   node.type === 'secondary' ? '🟡' : '🔴';
      
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '16px')
        .text(icon);

      nodeGroup.append('text')
        .attr('y', radius + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#1E293B')
        .attr('font-weight', '500')
        .text(node.name);

      if (node.coordinateSystem === '3d' || node.unit !== 'px') {
        nodeGroup.append('text')
          .attr('y', radius + 28)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#EF4444')
          .text(`⚠️ ${node.coordinateSystem} ${node.unit}`);
      }
    });

  }, [nodes, links, selectedNodeId, currentView, selectNode, saveView, addRecord, onViewChange]);

  return (
    <div ref={containerRef} className="topology-canvas">
      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};

export default TopologyCanvas;
