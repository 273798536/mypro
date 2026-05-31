import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PhysicsEngine } from '../engine/PhysicsEngine';

interface BridgeCanvasProps {
  physicsEngine?: PhysicsEngine | null;
}

export const BridgeCanvas: React.FC<BridgeCanvasProps> = ({ physicsEngine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    nodes,
    members,
    selectedNodeId,
    selectedMemberId,
    setSelectedNode,
    setSelectedMember,
    updateNode,
    phase
  } = useGameStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'edit') return;
    
    const { x, y } = getCanvasCoords(e);
    
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        if (!node.fixed) {
          setIsDragging(true);
          setDragNodeId(node.id);
        }
        setSelectedNode(node.id);
        setSelectedMember(null);
        return;
      }
    }

    for (const member of members) {
      const startNode = nodes.find(n => n.id === member.startNodeId);
      const endNode = nodes.find(n => n.id === member.endNodeId);
      if (!startNode || !endNode) continue;

      const lineLen = Math.sqrt(
        Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
      );
      const d1 = Math.sqrt(Math.pow(x - startNode.x, 2) + Math.pow(y - startNode.y, 2));
      const d2 = Math.sqrt(Math.pow(x - endNode.x, 2) + Math.pow(y - endNode.y, 2));
      
      if (Math.abs(d1 + d2 - lineLen) < 10) {
        setSelectedMember(member.id);
        setSelectedNode(null);
        return;
      }
    }

    setSelectedNode(null);
    setSelectedMember(null);
  }, [phase, nodes, members, getCanvasCoords, setSelectedNode, setSelectedMember]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragNodeId || phase !== 'edit') return;
    
    const { x, y } = getCanvasCoords(e);
    const clampedX = Math.max(30, Math.min(970, x));
    const clampedY = Math.max(50, Math.min(450, y));
    
    updateNode(dragNodeId, { x: clampedX, y: clampedY });
  }, [isDragging, dragNodeId, phase, getCanvasCoords, updateNode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      members.forEach(member => {
        const startNode = nodes.find(n => n.id === member.startNodeId);
        const endNode = nodes.find(n => n.id === member.endNodeId);
        if (!startNode || !endNode) return;

        let startX = startNode.x;
        let startY = startNode.y;
        let endX = endNode.x;
        let endY = endNode.y;

        if (physicsEngine) {
          const startDisp = physicsEngine.getNodeDisplacement(startNode.id);
          const endDisp = physicsEngine.getNodeDisplacement(endNode.id);
          startX += startDisp.dx;
          startY += startDisp.dy;
          endX += endDisp.dx;
          endY += endDisp.dy;
        }

        const stressRatio = member.currentStress / member.maxStress;
        let color = '#60a5fa';
        if (member.type === 'damper') color = '#34d399';
        if (member.type === 'spring') color = '#fbbf24';
        
        if (stressRatio > 0.7) {
          color = stressRatio > 1 ? '#ef4444' : '#f97316';
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = member.id === selectedMemberId ? '#22d3ee' : color;
        ctx.lineWidth = member.id === selectedMemberId ? 4 : 3;
        ctx.stroke();

        if (member.type === 'damper') {
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(midX, midY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      nodes.forEach(node => {
        let nodeX = node.x;
        let nodeY = node.y;

        if (physicsEngine) {
          const disp = physicsEngine.getNodeDisplacement(node.id);
          nodeX += disp.dx;
          nodeY += disp.dy;
        }

        ctx.beginPath();
        ctx.arc(nodeX, nodeY, node.fixed ? 12 : 10, 0, Math.PI * 2);
        ctx.fillStyle = node.fixed ? '#64748b' : '#3b82f6';
        if (node.id === selectedNodeId) {
          ctx.fillStyle = '#22d3ee';
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 15;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = node.fixed ? '#94a3b8' : '#93c5fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (node.fixed) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(nodeX - 15, nodeY + 8, 30, 8);
        }
      });

      requestAnimationFrame(render);
    };

    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [nodes, members, selectedNodeId, selectedMemberId, physicsEngine]);

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={500}
      className="border border-slate-700 rounded-lg cursor-crosshair bg-slate-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
