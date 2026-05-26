import { useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useBondStore } from '../../stores/bondStore'
import { useScenarioStore } from '../../stores/scenarioStore'
import { useUIStore } from '../../stores/uiStore'
import { CashFlowBar } from './CashFlowBar'
import { AxisSystem } from './AxisSystem'
import { SceneLighting } from './SceneLighting'
import { formatAmount } from '../../utils/dataValidator'

export function WaterfallScene() {
  const holdings = useBondStore((state) => state.holdings)
  const cashFlows = useBondStore((state) => state.cashFlows)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)
  const hoveredBarId = useUIStore((state) => state.hoveredBarId)
  const selectedBar = useUIStore((state) => state.selectedBar)
  const setHoveredBar = useUIStore((state) => state.setHoveredBar)
  const setSelectedBar = useUIStore((state) => state.setSelectedBar)

  const filteredCashFlows = useMemo(() => {
    if (!activeScenarioId) return []
    return cashFlows.filter((cf) => cf.scenarioId === activeScenarioId)
  }, [cashFlows, activeScenarioId])

  const sortedDates = useMemo(() => {
    const dates = [...new Set(filteredCashFlows.map((cf) => cf.flowDate))]
    return dates.sort()
  }, [filteredCashFlows])

  const sortedBonds = useMemo(() => {
    const codes = [...new Set(filteredCashFlows.map((cf) => cf.bondCode))]
    return codes.sort()
  }, [filteredCashFlows])

  const maxAmount = useMemo(() => {
    const max = filteredCashFlows.reduce((m, cf) => Math.max(m, Math.abs(cf.amount)), 0)
    return max > 0 ? max : 1
  }, [filteredCashFlows])

  const barPositions = useMemo(() => {
    if (sortedDates.length === 0 || sortedBonds.length === 0) return []

    const dateStep = sortedDates.length > 1 ? 20 / (sortedDates.length - 1) : 0
    const bondStep = sortedBonds.length > 1 ? 20 / (sortedBonds.length - 1) : 0

    return filteredCashFlows.map((cf) => {
      const dateIndex = sortedDates.indexOf(cf.flowDate)
      const bondIndex = sortedBonds.indexOf(cf.bondCode)
      return {
        cashFlow: cf,
        position: [
          -10 + dateIndex * dateStep,
          0,
          -10 + bondIndex * bondStep,
        ] as [number, number, number],
      }
    })
  }, [filteredCashFlows, sortedDates, sortedBonds])

  const hoveredCashFlow = useMemo(() => {
    if (!hoveredBarId) return null
    return filteredCashFlows.find((cf) => cf.id === hoveredBarId) || null
  }, [hoveredBarId, filteredCashFlows])

  const selectedCashFlow = useMemo(() => {
    if (!selectedBar) return null
    return filteredCashFlows.find((cf) => cf.id === selectedBar.cashFlowId) || null
  }, [selectedBar, filteredCashFlows])

  const handlePointerOver = useCallback((id: string) => {
    setHoveredBar(id)
  }, [setHoveredBar])

  const handlePointerOut = useCallback(() => {
    setHoveredBar(null)
  }, [setHoveredBar])

  const handleClick = useCallback(
    (id: string, screenPosition: { x: number; y: number }) => {
      if (selectedBar?.cashFlowId === id) {
        setSelectedBar(null)
      } else {
        setSelectedBar({ cashFlowId: id, screenPosition })
      }
    },
    [selectedBar, setSelectedBar]
  )

  return (
    <Canvas
      shadows
      camera={{ position: [18, 15, 18], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1117 100%)' }}
    >
      <fog attach="fog" args={['#0a1628', 30, 60]} />
      <color attach="background" args={['#0a1628']} />

      <SceneLighting />

      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <AxisSystem
        dateLabels={sortedDates}
        bondLabels={sortedBonds}
        maxAmount={maxAmount}
      />

      {barPositions.map(({ cashFlow, position }) => {
        const bond = holdings.find((b) => b.bondCode === cashFlow.bondCode)
        return (
          <CashFlowBar
            key={cashFlow.id}
            cashFlow={cashFlow}
            bond={bond}
            position={position}
            maxAmount={maxAmount}
            isSelected={selectedBar?.cashFlowId === cashFlow.id}
            isHovered={hoveredBarId === cashFlow.id}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />

      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>

      {hoveredCashFlow && (
        <Html
          position={[0, 0, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-[#161b22]/95 border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
            <div className="font-mono text-[#58a6ff] mb-1">{hoveredCashFlow.bondCode}</div>
            <div className="text-[#8b949e]">
              {formatAmount(hoveredCashFlow.amount)}元 | {hoveredCashFlow.flowDate}
            </div>
            {hoveredCashFlow.anomaly && (
              <div className="text-[#f85149] mt-1">
                ⚠ {hoveredCashFlow.anomaly}
              </div>
            )}
          </div>
        </Html>
      )}
    </Canvas>
  )
}