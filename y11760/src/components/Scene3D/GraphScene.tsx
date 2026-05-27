import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useGraphStore } from '../../stores/graphStore'
import { EnterpriseNode } from './EnterpriseNode'
import { PersonNode } from './PersonNode'
import { GuaranteeLink } from './GuaranteeLink'
import { RiskHighlight } from './RiskHighlight'

function Nodes() {
  const nodes = useGraphStore((s) => s.nodes)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId)
  const visibleNodeIds = useGraphStore((s) => s.visibleNodeIds)

  return (
    <group>
      {nodes.map((node) => {
        const isSelected = node.id === selectedNodeId
        const isHovered = node.id === hoveredNodeId
        const isFiltered = !visibleNodeIds.has(node.id)

        if (node.type === 'enterprise') {
          return (
            <EnterpriseNode
              key={node.id}
              id={node.id}
              position={node.position}
              label={node.label}
              selected={isSelected}
              hovered={isHovered}
              filtered={isFiltered}
              riskSeverity={node.riskSeverity}
            />
          )
        }

        return (
          <PersonNode
            key={node.id}
            id={node.id}
            position={node.position}
            label={node.label}
            selected={isSelected}
            hovered={isHovered}
            filtered={isFiltered}
            riskSeverity={node.riskSeverity}
          />
        )
      })}
    </group>
  )
}

function Edges() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId)
  const visibleEdgeIds = useGraphStore((s) => s.visibleEdgeIds)

  const nodeMap = useMemo(() => {
    const m = new Map<string, [number, number, number]>()
    for (const n of nodes) {
      m.set(n.id, n.position)
    }
    return m
  }, [nodes])

  return (
    <group>
      {edges.map((edge) => {
        if (!visibleEdgeIds.has(edge.id)) return null
        const sourcePos = nodeMap.get(edge.source)
        const targetPos = nodeMap.get(edge.target)
        if (!sourcePos || !targetPos) return null

        const isHighlighted =
          edge.highlighted ||
          edge.source === selectedNodeId ||
          edge.target === selectedNodeId ||
          edge.source === hoveredNodeId ||
          edge.target === hoveredNodeId

        return (
          <GuaranteeLink
            key={edge.id}
            source={sourcePos}
            target={targetPos}
            isCircular={edge.isCircular ?? false}
            highlighted={isHighlighted}
            guaranteeAmount={edge.guaranteeAmount}
          />
        )
      })}
    </group>
  )
}

function RiskHighlights() {
  const nodes = useGraphStore((s) => s.nodes)
  const visibleNodeIds = useGraphStore((s) => s.visibleNodeIds)

  return (
    <group>
      {nodes.map((node) =>
        node.riskSeverity && node.riskSeverity !== 'low' && visibleNodeIds.has(node.id) ? (
          <RiskHighlight
            key={`risk-${node.id}`}
            position={node.position}
            severity={node.riskSeverity}
          />
        ) : null
      )}
    </group>
  )
}

function SceneGrid() {
  return (
    <Grid
      position={[0, -10, 0]}
      args={[100, 100]}
      cellSize={2}
      cellThickness={0.5}
      cellColor="#1a1a2e"
      sectionSize={10}
      sectionThickness={1}
      sectionColor="#16213e"
      fadeDistance={60}
      fadeStrength={1}
      infiniteGrid
    />
  )
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 10]} intensity={0.8} />
      <pointLight position={[-10, 20, -10]} intensity={0.3} color="#6366f1" />

      <Nodes />
      <Edges />
      <RiskHighlights />
      <SceneGrid />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 1.5}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
      </EffectComposer>
    </>
  )
}

export function GraphScene() {
  return (
    <Canvas
      camera={{ position: [0, 20, 35], fov: 50, near: 0.1, far: 200 }}
      style={{ background: '#0a0a1a' }}
      onPointerMissed={() => useGraphStore.getState().selectNode(null)}
    >
      <SceneContent />
    </Canvas>
  )
}
