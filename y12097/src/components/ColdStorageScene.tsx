import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Html, Float } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useAppStore } from '@/store/appStore'
import { shelves, probes, fans, generateProbeReadings, generateFanStatuses } from '@/data/mockData'
import type { Probe, Fan } from '@/types'

const getTemperatureColor = (temp: number, status: string): string => {
  if (status === 'offline') return '#ef4444'
  if (status === 'overtemp') return '#f97316'
  if (temp < -20) return '#67e8f9'
  if (temp < -15) return '#3b82f6'
  if (temp < -10) return '#fbbf24'
  return '#f97316'
}

interface ShelfLayerProps {
  shelf: typeof shelves[0]
  layer: number
  readings: ReturnType<typeof generateProbeReadings>
}

function ShelfLayer({ shelf, layer, readings }: ShelfLayerProps) {
  const { filters } = useAppStore()
  const meshRef = useRef<THREE.Mesh>(null)

  const layerReadings = useMemo(() => {
    return readings.filter((r) => {
      const probe = probes.find((p) => p.id === r.probeId)
      return probe?.shelfId === shelf.id && probe?.layer === layer
    })
  }, [readings, shelf.id, layer])

  const avgTemp = useMemo(() => {
    const validTemps = layerReadings.filter((r) => r.status !== 'offline' && !isNaN(r.temperature))
    if (validTemps.length === 0) return -18
    return validTemps.reduce((sum, r) => sum + r.temperature, 0) / validTemps.length
  }, [layerReadings])

  if (!filters.layers.includes(layer)) return null

  const yPos = (layer - 1) * shelf.layerHeight
  const color = getTemperatureColor(avgTemp, avgTemp > -10 ? 'overtemp' : 'online')

  return (
    <group position={[shelf.posX, yPos, shelf.posZ]}>
      <mesh ref={meshRef} position={[0, shelf.layerHeight / 2, 0]}>
        <planeGeometry args={[shelf.width, shelf.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, shelf.layerHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[shelf.width, shelf.depth]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

interface ProbeSphereProps {
  probe: Probe
  reading: ReturnType<typeof generateProbeReadings>[0]
  isSelected: boolean
}

function ProbeSphere({ probe, reading, isSelected }: ProbeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const { filters, setSelectedProbe, selectedProbeId } = useAppStore()

  useFrame(({ clock }) => {
    if (meshRef.current) {
      if (reading.status === 'offline') {
        const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.2
        meshRef.current.scale.setScalar(scale)
      } else if (reading.status === 'overtemp') {
        const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.15
        meshRef.current.scale.setScalar(scale)
      }
    }
    if (glowRef.current && reading.status !== 'online') {
      const opacity = 0.3 + Math.sin(clock.elapsedTime * 3) * 0.2
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })

  const probeFilterMatch = filters.probeStatuses.includes(reading.status)
  const layerFilterMatch = filters.layers.includes(probe.layer)
  const areaFilterMatch = filters.areas.includes(probe.area)

  if (!probeFilterMatch || !layerFilterMatch || !areaFilterMatch) return null

  const color = getTemperatureColor(reading.temperature, reading.status)

  return (
    <group position={[probe.posX, probe.posY, probe.posZ]}>
      <Float speed={1} rotationIntensity={0} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedProbe(selectedProbeId === probe.id ? null : probe.id)
          }}
        >
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 2 : 1}
          />
        </mesh>
        <mesh ref={glowRef} scale={1.5}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
        {isSelected && (
          <Html center distanceFactor={8} zIndexRange={[100, 0]}>
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 min-w-[180px] shadow-xl">
              <div className="text-xs text-slate-400 mb-1">{probe.id}</div>
              <div className="text-lg font-bold font-mono">
                {reading.status === 'offline' ? (
                  <span className="text-red-400">离线</span>
                ) : (
                  <span style={{ color }}>{reading.temperature.toFixed(1)}°C</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                层: {probe.layer} | {probe.area}
              </div>
              <div className="text-xs text-slate-500">
                来源: {reading.sourceReportId}
              </div>
            </div>
          </Html>
        )}
      </Float>
    </group>
  )
}

interface FanModelProps {
  fan: Fan
  status: 'running' | 'stopped'
}

function FanModel({ fan, status }: FanModelProps) {
  const bladeRef = useRef<THREE.Group>(null)
  const { filters } = useAppStore()

  useFrame(() => {
    if (bladeRef.current && status === 'running') {
      bladeRef.current.rotation.y += 0.1
    }
  })

  if (!filters.fanStatuses.includes(status)) return null

  const color = status === 'running' ? '#3b82f6' : '#ef4444'

  return (
    <group position={[fan.posX, fan.posY, fan.posZ]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <group ref={bladeRef} position={[0, 0.2, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2, (i * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.8, 0.05, 0.1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
      <Html center position={[0, -0.8, 0]} distanceFactor={10}>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'running'
              ? 'bg-blue-500/80 text-white'
              : 'bg-red-500/80 text-white'
          }`}
        >
          {fan.name}: {status === 'running' ? '运行中' : '已停转'}
        </div>
      </Html>
    </group>
  )
}

function ColdStorageShell() {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 17]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {[-11, 11].map((x) => (
        <mesh key={`wall-x-${x}`} position={[x, 4, 0]}>
          <boxGeometry args={[0.2, 8, 17]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-8.5, 8.5].map((z) => (
        <mesh key={`wall-z-${z}`} position={[0, 4, z]}>
          <boxGeometry args={[22, 8, 0.2]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 8.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 17]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function CameraController() {
  const { camera } = useThree()
  const { selectedProbeId } = useAppStore()
  const targetPos = useRef(new THREE.Vector3())

  useFrame(() => {
    if (selectedProbeId) {
      const probe = probes.find((p) => p.id === selectedProbeId)
      if (probe) {
        targetPos.current.set(probe.posX, probe.posY + 2, probe.posZ + 3)
        camera.position.lerp(targetPos.current, 0.05)
      }
    }
  })

  return null
}

function SceneContent() {
  const { currentTimeIndex, selectedProbeId } = useAppStore()

  const readings = useMemo(() => generateProbeReadings(currentTimeIndex), [currentTimeIndex])
  const fanStatuses = useMemo(() => generateFanStatuses(currentTimeIndex), [currentTimeIndex])

  return (
    <>
      <ambientLight color="#e0f0ff" intensity={0.4} />
      <pointLight position={[0, 7, 0]} color="#e0f0ff" intensity={1} distance={20} />
      {fans.map((fan, i) => (
        <pointLight
          key={`light-${fan.id}`}
          position={[fan.posX, fan.posY - 0.5, fan.posZ]}
          color="#a5d8ff"
          intensity={0.5}
          distance={8}
        />
      ))}

      <ColdStorageShell />

      {shelves.flatMap((shelf) =>
        Array.from({ length: shelf.layerCount }, (_, i) => (
          <ShelfLayer
            key={`${shelf.id}-layer-${i + 1}`}
            shelf={shelf}
            layer={i + 1}
            readings={readings}
          />
        ))
      )}

      {readings.map((reading) => {
        const probe = probes.find((p) => p.id === reading.probeId)
        if (!probe) return null
        return (
          <ProbeSphere
            key={probe.id}
            probe={probe}
            reading={reading}
            isSelected={selectedProbeId === probe.id}
          />
        )
      })}

      {fanStatuses.map((fs) => {
        const fan = fans.find((f) => f.id === fs.fanId)
        if (!fan) return null
        return <FanModel key={fan.id} fan={fan} status={fs.status} />
      })}

      <CameraController />
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={30}
        target={[0, 3, 0]}
        maxPolarAngle={Math.PI / 2.1}
      />
      <Environment preset="city" />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </>
  )
}

export default function ColdStorageScene() {
  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onClick={() => useAppStore.getState().setSelectedProbe(null)}
    >
      <color attach="background" args={['#0f1729']} />
      <fog attach="fog" args={['#0f1729', 15, 40]} />
      <SceneContent />
    </Canvas>
  )
}
