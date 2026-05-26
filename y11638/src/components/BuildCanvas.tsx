import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

interface BuildCanvasProps {
  width: number;
  height: number;
}

export default function BuildCanvas({ width, height }: BuildCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const {
    currentLevel,
    nodes,
    members,
    materials,
    selectedMaterial,
    selectedNode,
    hoveredNode,
    toolMode,
    isSimulating,
    selectNode,
    setHoveredNode,
    addNode,
    connectNodes,
    deleteMember,
    moveNode,
    deleteNode
  } = useGameStore();
  
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [connectStart, setConnectStart] = useState<string | null>(null);
  
  const material = materials.find(m => m.id === selectedMaterial) || materials[0];
  
  const getStressColor = useCallback((stress: number, maxStress: number) => {
    const ratio = Math.min(Math.abs(stress) / Math.max(maxStress, 1), 1);
    if (ratio < 0.5) {
      const t = ratio / 0.5;
      return `rgb(${Math.round(34 + t * 220)}, ${Math.round(197 + t * 100)}, 94)`;
    } else if (ratio < 0.8) {
      const t = (ratio - 0.5) / 0.3;
      return `rgb(${Math.round(234 + t * 21)}, ${Math.round(179 + t * -81)}, ${Math.round(8 + t * 78)})`;
    } else {
      const t = (ratio - 0.8) / 0.2;
      return `rgb(239, ${Math.round(68 + t * -4)}, ${Math.round(68 + t * -4)})`;
    }
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      if (!currentLevel) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      
      ctx.clearRect(0, 0, width, height);
      
      ctx.save();
      
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      const gradient = ctx.createLinearGradient(0, currentLevel.groundY, 0, height);
      gradient.addColorStop(0, '#475569');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, currentLevel.groundY, currentLevel.anchors[0].x, height - currentLevel.groundY);
      ctx.fillRect(
        currentLevel.anchors[currentLevel.anchors.length - 1].x,
        currentLevel.groundY,
        width - currentLevel.anchors[currentLevel.anchors.length - 1].x,
        height - currentLevel.groundY
      );
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(
        currentLevel.anchors[0].x,
        currentLevel.groundY,
        currentLevel.anchors[currentLevel.anchors.length - 1].x - currentLevel.anchors[0].x,
        height - currentLevel.groundY
      );
      
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.moveTo(currentLevel.anchors[0].x, currentLevel.groundY + 50 + Math.sin(Date.now() * 0.003) * 5);
      for (let x = currentLevel.anchors[0].x; x <= currentLevel.anchors[currentLevel.anchors.length - 1].x; x += 20) {
        const y = currentLevel.groundY + 50 + Math.sin(x * 0.02 + Date.now() * 0.003) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(currentLevel.anchors[currentLevel.anchors.length - 1].x, height);
      ctx.lineTo(currentLevel.anchors[0].x, height);
      ctx.closePath();
      ctx.fill();
      
      members.forEach(member => {
        const start = nodes.find(n => n.id === member.startNodeId);
        const end = nodes.find(n => n.id === member.endNodeId);
        if (!start || !end) return;
        
        const mat = materials.find(m => m.id === member.materialId);
        if (!mat) return;
        
        const color = isSimulating
          ? getStressColor(member.stress, member.maxStress)
          : mat.color;
        
        ctx.strokeStyle = member.broken ? '#ef4444' : color;
        ctx.lineWidth = member.broken ? 8 : 6;
        ctx.lineCap = 'round';
        
        if (member.broken) {
          ctx.setLineDash([10, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (member.broken) {
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✕', midX, midY);
        }
      });
      
      if (connectStart && mousePos && !isSimulating) {
        const start = nodes.find(n => n.id === connectStart);
        if (start) {
          ctx.strokeStyle = material?.color || '#60a5fa';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 5]);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      
      nodes.forEach(node => {
        const isSelected = selectedNode === node.id;
        const isHovered = hoveredNode === node.id;
        const isConnecting = connectStart === node.id;
        
        const radius = node.isAnchor ? 14 : (isSelected || isHovered ? 12 : 10);
        
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
        
        if (node.isAnchor) {
          grad.addColorStop(0, '#fb923c');
          grad.addColorStop(1, '#ea580c');
        } else {
          grad.addColorStop(0, '#60a5fa');
          grad.addColorStop(1, '#3b82f6');
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = isSelected || isConnecting ? '#fbbf24' : '#1e3a5f';
        ctx.lineWidth = isSelected || isConnecting ? 3 : 2;
        ctx.stroke();
        
        if (node.isAnchor) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚓', node.x, node.y);
        }
      });
      
      if (toolMode === 'add_node' && mousePos && !isSimulating) {
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      ctx.restore();
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, members, materials, selectedNode, hoveredNode, connectStart, mousePos, toolMode, isSimulating, currentLevel, width, height, material, getStressColor]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentLevel) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    if (draggingNode) {
      if (!nodes.find(n => n.id === draggingNode)?.isAnchor) {
        moveNode(draggingNode, x, y);
      }
    } else {
      let found = false;
      for (const node of nodes) {
        const dist = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        if (dist < 20) {
          setHoveredNode(node.id);
          found = true;
          break;
        }
      }
      if (!found) setHoveredNode(null);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !currentLevel) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 2) {
      e.preventDefault();
      for (const member of members) {
        const start = nodes.find(n => n.id === member.startNodeId);
        const end = nodes.find(n => n.id === member.endNodeId);
        if (!start || !end) continue;
        
        const lineLen = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const t = Math.max(0, Math.min(1, ((x - start.x) * (end.x - start.x) + (y - start.y) * (end.y - start.y)) / (lineLen * lineLen)));
        const closestX = start.x + t * (end.x - start.x);
        const closestY = start.y + t * (end.y - start.y);
        const dist = Math.sqrt(Math.pow(x - closestX, 2) + Math.pow(y - closestY, 2));
        
        if (dist < 15) {
          deleteMember(member.id);
          return;
        }
      }
      
      for (const node of nodes) {
        const dist = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        if (dist < 20 && !node.isAnchor) {
          deleteNode(node.id);
          return;
        }
      }
      return;
    }
    
    for (const node of nodes) {
      const dist = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      if (dist < 20) {
        if (toolMode === 'connect') {
          if (!connectStart) {
            setConnectStart(node.id);
          } else if (connectStart !== node.id) {
            connectNodes(connectStart, node.id);
            setConnectStart(null);
          }
        } else if (toolMode === 'select') {
          selectNode(node.id);
          setDraggingNode(node.id);
        }
        return;
      }
    }
    
    if (toolMode === 'add_node') {
      if (y < currentLevel.groundY - 10) {
        addNode(x, y);
      }
    }
    
    setConnectStart(null);
  };
  
  const handleMouseUp = () => {
    setDraggingNode(null);
  };
  
  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredNode(null);
    setDraggingNode(null);
    setConnectStart(null);
  };
  
  if (!currentLevel) return null;
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl border-2 border-slate-700 cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
