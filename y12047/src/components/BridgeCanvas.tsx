import { useEffect, useRef, useState } from 'react';
import { bridgeRenderer } from '../renderer/bridgeRenderer';
import type { Node, Member, SimulationResult, RenderOptions } from '../types';

interface BridgeCanvasProps {
  nodes: Node[];
  members: Member[];
  result?: SimulationResult | null;
  renderOptions?: Partial<RenderOptions>;
  loadPosition?: number;
  width?: number;
  height?: number;
  onMemberClick?: (memberId: string) => void;
  onNodeClick?: (nodeId: string) => void;
  selectedMemberId?: string | null;
  selectedNodeId?: string | null;
}

export function BridgeCanvas({
  nodes,
  members,
  result = null,
  renderOptions: propOptions = {},
  loadPosition = 0,
  width = 800,
  height = 500,
  onMemberClick,
  onNodeClick,
  selectedMemberId = null,
  selectedNodeId = null,
}: BridgeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(300, rect.height),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const defaultOptions: RenderOptions = {
      showDeformation: true,
      deformationScale: 10,
      showForces: true,
      showStressColors: true,
      showLabels: true,
    };

    const options = { ...defaultOptions, ...propOptions };

    bridgeRenderer.render(ctx, nodes, members, result, options, loadPosition, {
      width: dimensions.width,
      height: dimensions.height,
      selectedMemberId,
      selectedNodeId,
    });
  }, [nodes, members, result, propOptions, loadPosition, dimensions, selectedMemberId, selectedNodeId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedMember = bridgeRenderer.hitTestMember(
      x,
      y,
      nodes,
      members,
      result,
      { width: dimensions.width, height: dimensions.height }
    );

    if (clickedMember && onMemberClick) {
      onMemberClick(clickedMember.id);
      return;
    }

    const clickedNode = bridgeRenderer.hitTestNode(
      x,
      y,
      nodes,
      result,
      { width: dimensions.width, height: dimensions.height }
    );

    if (clickedNode && onNodeClick) {
      onNodeClick(clickedNode.id);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-50 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleClick}
        className="cursor-pointer"
      />
    </div>
  );
}
