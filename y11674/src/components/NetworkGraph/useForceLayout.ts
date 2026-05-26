import { useRef, useCallback, useEffect } from 'react';
import { NetworkNode, NetworkEdge } from '../../types';

interface NodePosition {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export function useForceLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  autoLayout: boolean,
  onUpdate: (positions: Map<string, { x: number; y: number; z: number }>) => void
) {
  const positionsRef = useRef<Map<string, NodePosition>>(new Map());
  const animationRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const initPositions = useCallback(() => {
    const positions = new Map<string, NodePosition>();
    
    nodes.forEach((node, index) => {
      if (node.position) {
        positions.set(node.id, {
          x: node.position.x,
          y: node.position.y,
          z: node.position.z,
          vx: 0,
          vy: 0,
          vz: 0,
        });
      } else {
        const phi = Math.acos(-1 + (2 * index) / nodes.length);
        const theta = Math.sqrt(nodes.length * Math.PI) * phi;
        const radius = 8 + Math.random() * 4;
        
        positions.set(node.id, {
          x: radius * Math.cos(theta) * Math.sin(phi),
          y: radius * Math.sin(theta) * Math.sin(phi),
          z: radius * Math.cos(phi),
          vx: 0,
          vy: 0,
          vz: 0,
        });
      }
    });
    
    positionsRef.current = positions;
  }, [nodes]);

  const applyForces = useCallback(() => {
    const positions = positionsRef.current;
    const nodeCount = nodes.length;
    const nodeArray = nodes;
    
    const repulsionStrength = 80;
    const attractionStrength = 0.015;
    const damping = 0.85;
    const centerStrength = 0.01;
    
    for (let i = 0; i < nodeCount; i++) {
      const nodeA = nodeArray[i];
      const posA = positions.get(nodeA.id);
      if (!posA) continue;
      
      for (let j = i + 1; j < nodeCount; j++) {
        const nodeB = nodeArray[j];
        const posB = positions.get(nodeB.id);
        if (!posB) continue;
        
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dz = posA.z - posB.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
        const force = repulsionStrength / (distance * distance);
        
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;
        
        posA.vx += fx;
        posA.vy += fy;
        posA.vz += fz;
        posB.vx -= fx;
        posB.vy -= fy;
        posB.vz -= fz;
      }
    }
    
    edges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      if (!sourcePos || !targetPos) return;
      
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const dz = targetPos.z - sourcePos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
      const force = (distance - 5) * attractionStrength;
      
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;
      
      sourcePos.vx += fx;
      sourcePos.vy += fy;
      sourcePos.vz += fz;
      targetPos.vx -= fx;
      targetPos.vy -= fy;
      targetPos.vz -= fz;
    });
    
    positions.forEach(pos => {
      pos.vx -= pos.x * centerStrength;
      pos.vy -= pos.y * centerStrength;
      pos.vz -= pos.z * centerStrength;
      
      pos.vx *= damping;
      pos.vy *= damping;
      pos.vz *= damping;
      
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.z += pos.vz;
      
      const maxDist = 20;
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (dist > maxDist) {
        pos.x = (pos.x / dist) * maxDist;
        pos.y = (pos.y / dist) * maxDist;
        pos.z = (pos.z / dist) * maxDist;
      }
    });
    
    const result = new Map<string, { x: number; y: number; z: number }>();
    positions.forEach((pos, id) => {
      result.set(id, { x: pos.x, y: pos.y, z: pos.z });
    });
    
    onUpdate(result);
  }, [nodes, edges, onUpdate]);

  const animate = useCallback(() => {
    if (!isRunningRef.current) return;
    
    applyForces();
    animationRef.current = requestAnimationFrame(animate);
  }, [applyForces]);

  const start = useCallback(() => {
    if (isRunningRef.current || !autoLayout) return;
    isRunningRef.current = true;
    animate();
  }, [animate, autoLayout]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    initPositions();
    if (autoLayout) {
      start();
    }
    return () => stop();
  }, [nodes, autoLayout, initPositions, start, stop]);

  const getPosition = useCallback((nodeId: string) => {
    const pos = positionsRef.current.get(nodeId);
    return pos ? { x: pos.x, y: pos.y, z: pos.z } : { x: 0, y: 0, z: 0 };
  }, []);

  const setPosition = useCallback((nodeId: string, x: number, y: number, z: number) => {
    const pos = positionsRef.current.get(nodeId);
    if (pos) {
      pos.x = x;
      pos.y = y;
      pos.z = z;
      pos.vx = 0;
      pos.vy = 0;
      pos.vz = 0;
    }
  }, []);

  return {
    getPosition,
    setPosition,
    start,
    stop,
  };
}
