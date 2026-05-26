import { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useNetworkStore } from '../../store/networkStore';
import { useForceLayout } from '../../hooks/useForceLayout';
import { NetworkNode } from './NetworkNode';
import { NetworkEdge } from './NetworkEdge';
import { Starfield } from './Starfield';

interface CameraControllerProps {
  targetPosition: THREE.Vector3 | null;
}

const CameraController = ({ targetPosition }: CameraControllerProps) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (targetPosition && controlsRef.current) {
      controlsRef.current.target.lerp(targetPosition, 0.1);
      camera.position.lerp(
        new THREE.Vector3(
          targetPosition.x + 50,
          targetPosition.y + 50,
          targetPosition.z + 100
        ),
        0.1
      );
    }
  }, [targetPosition, camera]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />;
};

interface NetworkSceneProps {
  onNodePositionUpdate: (nodeId: string, pos: { x: number; y: number; z: number }) => void;
}

const NetworkScene = ({ onNodePositionUpdate }: NetworkSceneProps) => {
  const { 
    getFilteredNodes, 
    getFilteredEdges, 
    selectedNodeId, 
    highlightedNodeIds,
    highlightedEdgeIds,
    selectNode,
    selectEdge,
  } = useNetworkStore();

  const nodes = getFilteredNodes();
  const edges = getFilteredEdges();
  const [focusPosition, setFocusPosition] = useState<THREE.Vector3 | null>(null);

  const { getNodePosition } = useForceLayout(nodes, edges, { width: 800, height: 600 });

  useEffect(() => {
    const interval = setInterval(() => {
      nodes.forEach(node => {
        const pos = getNodePosition(node.id);
        onNodePositionUpdate(node.id, pos);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [nodes, getNodePosition, onNodePositionUpdate]);

  const handleNodeClick = useCallback((nodeId: string) => {
    selectNode(nodeId === selectedNodeId ? null : nodeId);
  }, [selectedNodeId, selectNode]);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    const pos = getNodePosition(nodeId);
    setFocusPosition(new THREE.Vector3(pos.x, pos.y, pos.z));
  }, [getNodePosition]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    selectEdge(edgeId);
  }, [selectEdge]);

  const hasHighlights = highlightedNodeIds.length > 0 || highlightedEdgeIds.length > 0;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[100, 100, 100]} intensity={1} color="#00f5ff" />
      <pointLight position={[-100, -100, -100]} intensity={0.5} color="#9933ff" />
      <pointLight position={[0, 50, -50]} intensity={0.5} color="#00ff88" />

      <Starfield count={3000} radius={500} />

      <gridHelper args={[500, 50, '#1a1a3a', '#0d0d20']} position={[0, -50, 0]} />

      {edges.map(edge => {
        const sourcePos = getNodePosition(edge.source);
        const targetPos = getNodePosition(edge.target);
        const isHighlighted = highlightedEdgeIds.includes(edge.id);
        const isDimmed = hasHighlights && !isHighlighted;

        return (
          <NetworkEdge
            key={edge.id}
            edge={edge}
            startPos={sourcePos}
            endPos={targetPos}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            onClick={() => handleEdgeClick(edge.id)}
          />
        );
      })}

      {nodes.map(node => {
        const pos = getNodePosition(node.id);
        const isSelected = selectedNodeId === node.id;
        const isHighlighted = highlightedNodeIds.includes(node.id);
        const isDimmed = hasHighlights && !isSelected && !isHighlighted;

        return (
          <NetworkNode
            key={node.id}
            node={node}
            position={pos}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            onClick={() => handleNodeClick(node.id)}
            onDoubleClick={() => handleNodeDoubleClick(node.id)}
          />
        );
      })}

      <CameraController targetPosition={focusPosition} />

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
          intensity={1.5} 
          mipmapBlur
        />
        <Vignette darkness={0.5} offset={0.3} />
      </EffectComposer>
    </>
  );
};

interface NetworkCanvasProps {
  onNodePositionUpdate: (nodeId: string, pos: { x: number; y: number; z: number }) => void;
}

export const NetworkCanvas = ({ onNodePositionUpdate }: NetworkCanvasProps) => {
  return (
    <Canvas
      camera={{ position: [0, 50, 150], fov: 60 }}
      style={{ background: '#0a0a1a' }}
      gl={{ antialias: true, alpha: false }}
      onClick={() => {
        useNetworkStore.getState().selectNode(null);
        useNetworkStore.getState().selectEdge(null);
      }}
    >
      <NetworkScene onNodePositionUpdate={onNodePositionUpdate} />
    </Canvas>
  );
};
