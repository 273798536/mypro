import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useGraphStore } from '../../stores/graphStore'
import { enterprises, persons } from '../../data/mockData'
import type { GraphNode, GraphEdge } from '../../types'
import { expandPathFromNode } from '../../engines/layoutEngine'

interface PathNodeProps {
  node: GraphNode
  layer: number
  selected: boolean
  onClick: () => void
}

function PathNode({ node, layer, selected, onClick }: PathNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetScale = selected ? 1.4 : 1

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.15)
  })

  const baseColor = node.type === 'enterprise' ? '#3B82F6' : '#F59E0B'
  const riskColor = node.riskSeverity === 'high' ? '#EF4444' : node.riskSeverity === 'medium' ? '#F59E0B' : baseColor

  return (
    <group position={node.position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick() }}>
        {node.type === 'enterprise' ? (
          <sphereGeometry args={[0.6, 32, 32]} />
        ) : (
          <octahedronGeometry args={[0.5, 0]} />
        )}
        <meshStandardMaterial
          color={riskColor}
          emissive={selected ? riskColor : '#000000'}
          emissiveIntensity={selected ? 0.6 : 0}
        />
      </mesh>
      <Text
        position={[0, 1, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {node.label}
      </Text>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color="#888888"
        anchorX="center"
        anchorY="top"
      >
        第 {layer} 层
      </Text>
    </group>
  )
}

interface PathEdgeProps {
  edge: GraphEdge
  sourcePos: [number, number, number]
  targetPos: [number, number, number]
  layer: number
}

function PathEdge({ edge, sourcePos, targetPos, layer }: PathEdgeProps) {
  const dashOffsetRef = useRef(0)

  const mid = [
    (sourcePos[0] + targetPos[0]) / 2,
    (sourcePos[1] + targetPos[1]) / 2 + 0.3 + layer * 0.2,
    (sourcePos[2] + targetPos[2]) / 2,
  ] as [number, number, number]

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...sourcePos),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...targetPos)
  )
  const points = curve.getPoints(50).map((p) => [p.x, p.y, p.z] as [number, number, number])

  useFrame((state) => {
    dashOffsetRef.current = -state.clock.elapsedTime * 2
  })

  const color = edge.isCircular ? '#EF4444' : edge.highlighted ? '#FBBF24' : '#10B981'
  const lineWidth = Math.max(1, Math.min(5, edge.guaranteeAmount / 500))

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        dashed
        dashSize={0.6}
        gapSize={0.2}
        dashOffset={dashOffsetRef.current}
      />
      <Text
        position={mid}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {edge.guaranteeAmount.toLocaleString()}万
      </Text>
    </group>
  )
}

interface PathSceneProps {
  startNodeId: string
  onNodeClick: (nodeId: string) => void
}

function PathSceneContent({ startNodeId, onNodeClick }: PathSceneProps) {
  const { nodes, edges, selectedNodeId, selectNode } = useGraphStore()
  const startNode = nodes.find((n) => n.id === startNodeId)

  if (!startNode) return null

  const { pathNodes, pathEdges } = expandPathFromNode(startNodeId, edges, nodes, 4)

  const layeredNodes = new Map<string, number>()
  const visited = new Set<string>()
  function assignLayers(nodeId: string, layer: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    layeredNodes.set(nodeId, layer)
    for (const e of pathEdges) {
      if (e.source === nodeId && !visited.has(e.target)) {
        assignLayers(e.target, layer + 1)
      }
      if (e.target === nodeId && !visited.has(e.source)) {
        assignLayers(e.source, layer + 1)
      }
    }
  }
  assignLayers(startNodeId, 0)

  const positionedNodes = pathNodes.map((node) => {
    const layer = layeredNodes.get(node.id) ?? 0
    const layerNodes = [...layeredNodes.entries()].filter(([_, l]) => l === layer)
    const index = layerNodes.findIndex(([id]) => id === node.id)
    const count = layerNodes.length
    const angle = count > 1 ? (index / (count - 1) - 0.5) * Math.PI * 0.8 : 0
    const radius = layer * 8
    return {
      ...node,
      position: [
        Math.cos(angle) * radius,
        layer * 4,
        Math.sin(angle) * radius,
      ] as [number, number, number],
    }
  })

  const nodeMap = new Map(positionedNodes.map((n) => [n.id, n.position]))

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 10]} intensity={0.8} />
      <pointLight position={[-10, 20, -10]} intensity={0.3} color="#6366f1" />

      {positionedNodes.map((node) => (
        <PathNode
          key={node.id}
          node={node}
          layer={layeredNodes.get(node.id) ?? 0}
          selected={node.id === selectedNodeId}
          onClick={() => {
            selectNode(node.id)
            onNodeClick(node.id)
          }}
        />
      ))}

      {pathEdges.map((edge, i) => {
        const sourcePos = nodeMap.get(edge.source)
        const targetPos = nodeMap.get(edge.target)
        if (!sourcePos || !targetPos) return null
        const layer = Math.min(
          layeredNodes.get(edge.source) ?? 0,
          layeredNodes.get(edge.target) ?? 0
        )
        return (
          <PathEdge
            key={edge.id || i}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
            layer={layer}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 1.5}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={0.8} />
      </EffectComposer>
    </>
  )
}

export function PathView({ startNodeId, onNodeClick }: PathSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 20, 40], fov: 55, near: 0.1, far: 200 }}
      style={{ background: '#0a0a1a' }}
      onPointerMissed={() => useGraphStore.getState().selectNode(null)}
    >
      <PathSceneContent startNodeId={startNodeId} onNodeClick={onNodeClick} />
    </Canvas>
  )
}
