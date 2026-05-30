import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Rack, Location, PathNode } from '../types';
import { useStore } from '../store/useStore';
import { formatShortDate } from '../utils/heatColor';

interface PathSceneProps {
  rack: Rack;
  locations: Location[];
  pathNodes: PathNode[];
}

function PathLine({ nodes, currentIndex }: { nodes: PathNode[]; currentIndex: number }) {
  const { pathPoints, traveledPoints } = useMemo(() => {
    const points = nodes.map((n) => new THREE.Vector3(...n.position));
    const traveled = nodes.slice(0, currentIndex + 1).map((n) => new THREE.Vector3(...n.position));
    return { pathPoints: points, traveledPoints: traveled };
  }, [nodes, currentIndex]);

  const lineGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5);
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [pathPoints]);

  const traveledGeometry = useMemo(() => {
    if (traveledPoints.length < 2) return new THREE.BufferGeometry();
    const curve = new THREE.CatmullRomCurve3(traveledPoints, false, 'catmullrom', 0.5);
    const points = curve.getPoints(100);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [traveledPoints]);

  return (
    <group>
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: '#334155', transparent: true, opacity: 0.5 }))} />
      {traveledPoints.length >= 2 && (
        <primitive object={new THREE.Line(traveledGeometry, new THREE.LineBasicMaterial({ color: '#3b82f6' }))} />
      )}
    </group>
  );
}

function MovingBox({ nodes, currentIndex, isPlaying }: {
  nodes: PathNode[];
  currentIndex: number;
  isPlaying: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  const { currentNode, nextNode, segmentProgress } = useMemo(() => {
    const current = nodes[currentIndex];
    const next = nodes[Math.min(currentIndex + 1, nodes.length - 1)];
    return {
      currentNode: current,
      nextNode: next,
      segmentProgress: progressRef.current,
    };
  }, [nodes, currentIndex]);

  useFrame((_, delta) => {
    if (isPlaying && meshRef.current && currentNode && nextNode) {
      progressRef.current += delta * 0.5;
      if (progressRef.current >= 1) {
        progressRef.current = 0;
      }

      const t = progressRef.current;
      const x = currentNode.position[0] + (nextNode.position[0] - currentNode.position[0]) * t;
      const y = currentNode.position[1] + (nextNode.position[1] - currentNode.position[1]) * t + 0.5;
      const z = currentNode.position[2] + (nextNode.position[2] - currentNode.position[2]) * t;

      meshRef.current.position.set(x, y, z);
    }
  });

  useEffect(() => {
    progressRef.current = 0;
  }, [currentIndex]);

  if (!currentNode) return null;

  return (
    <mesh ref={meshRef} position={[currentNode.position[0], currentNode.position[1] + 0.5, currentNode.position[2]]}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.5} />
    </mesh>
  );
}

function PathMarkers({ nodes, currentIndex }: { nodes: PathNode[]; currentIndex: number }) {
  return (
    <group>
      {nodes.map((node, index) => (
        <group key={node.id} position={node.position}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshStandardMaterial
              color={index <= currentIndex ? '#3b82f6' : '#374151'}
              transparent
              opacity={0.8}
            />
          </mesh>

          {(index === currentIndex || index <= currentIndex) && (
            <Html position={[0, 1, 0]} center distanceFactor={10}>
              <div
                className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                  index === currentIndex
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                <div className="font-bold">#{index + 1} {node.info.action}</div>
                {index === currentIndex && (
                  <>
                    <div className="text-[10px] opacity-80">{node.info.skuName}</div>
                    <div className="text-[10px] opacity-60">
                      {node.info.operator} · {formatShortDate(node.timestamp)}
                    </div>
                  </>
                )}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

function SimpleRack({ rack, locations }: { rack: Rack; locations: Location[] }) {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[rack.columns * rack.cellWidth + 2, rack.rows * rack.cellDepth + 2]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>

      {locations.map((location) => {
        const x = (location.col - rack.columns / 2 + 0.5) * rack.cellWidth;
        const y = (location.layer + 0.5) * rack.cellHeight;
        const z = (location.row - rack.rows / 2 + 0.5) * rack.cellDepth;

        return (
          <mesh key={location.id} position={[x, y, z]}>
            <boxGeometry
              args={[rack.cellWidth * 0.9, rack.cellHeight * 0.85, rack.cellDepth * 0.9]}
            />
            <meshStandardMaterial
              color={location.isOccluded ? '#4a3728' : '#2a2a3a'}
              transparent
              opacity={0.3}
              wireframe={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function PathScene({ rack, locations, pathNodes }: PathSceneProps) {
  const { currentPathIndex, isPlaying } = useStore();

  return (
    <Canvas camera={{ position: [15, 10, 12], fov: 50 }} shadows gl={{ antialias: true }}>
      <color attach="background" args={['#0f0f1a']} />
      <fog attach="fog" args={['#0f0f1a', 20, 50]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <pointLight position={[-10, 10, -10]} intensity={0.4} color="#60a5fa" />

      <SimpleRack rack={rack} locations={locations} />
      <PathLine nodes={pathNodes} currentIndex={currentPathIndex} />
      <PathMarkers nodes={pathNodes} currentIndex={currentPathIndex} />
      <MovingBox nodes={pathNodes} currentIndex={currentPathIndex} isPlaying={isPlaying} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2}
      />

      <Environment preset="city" />
    </Canvas>
  );
}
