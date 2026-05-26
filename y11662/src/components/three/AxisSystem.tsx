import { useMemo } from 'react'
import * as THREE from 'three'

interface AxisSystemProps {
  dateLabels: string[]
  bondLabels: string[]
  maxAmount: number
}

export function AxisSystem({ dateLabels, bondLabels, maxAmount }: AxisSystemProps) {
  const dateAxisPositions = useMemo(() => {
    const positions: { x: number; label: string }[] = []
    if (dateLabels.length === 0) return positions

    const step = dateLabels.length > 1 ? 20 / (dateLabels.length - 1) : 0
    dateLabels.forEach((label, i) => {
      positions.push({
        x: -10 + i * step,
        label,
      })
    })
    return positions
  }, [dateLabels])

  const bondAxisPositions = useMemo(() => {
    const positions: { z: number; label: string }[] = []
    if (bondLabels.length === 0) return positions

    const step = bondLabels.length > 1 ? 20 / (bondLabels.length - 1) : 0
    bondLabels.forEach((label, i) => {
      positions.push({
        z: -10 + i * step,
        label,
      })
    })
    return positions
  }, [bondLabels])

  const yAxisTicks = useMemo(() => {
    const ticks: { y: number; label: string }[] = []
    const step = maxAmount / 5
    for (let i = 0; i <= 5; i++) {
      const value = step * i
      const height = (value / maxAmount) * 8
      let label: string
      if (value >= 100000000) {
        label = (value / 100000000).toFixed(1) + '亿'
      } else if (value >= 10000) {
        label = (value / 10000).toFixed(0) + '万'
      } else {
        label = value.toFixed(0)
      }
      ticks.push({ y: height, label })
    }
    return ticks
  }, [maxAmount])

  return (
    <group>
      <gridHelper args={[24, 24, '#1e3a5f', '#0a1628']} position={[0, 0.001, 0]} />

      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshBasicMaterial color="#0d1117" transparent opacity={0.9} />
      </mesh>

      {dateAxisPositions.map((item, i) => (
        <group key={`date-${i}`} position={[item.x, 0, -12.5]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 10, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <group position={[0, 5, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <sprite scale={[2, 0.5, 1]}>
              <canvasTexture
                attach="map"
                image={createTextCanvas(item.label, '#60a5fa', 12)}
              />
            </sprite>
          </group>
        </group>
      ))}

      {bondAxisPositions.map((item, i) => (
        <group key={`bond-${i}`} position={[-12.5, 0, item.z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 10, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <sprite position={[0, 5, 0]} scale={[3, 0.6, 1]}>
            <canvasTexture
              attach="map"
              image={createTextCanvas(item.label, '#34d399', 10)}
            />
          </sprite>
        </group>
      ))}

      {yAxisTicks.map((tick, i) => (
        <group key={`y-${i}`} position={[-12.5, tick.y, -12.5]}>
          <mesh>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <sprite position={[-1, 0, 0]} scale={[2, 0.4, 1]}>
            <canvasTexture
              attach="map"
              image={createTextCanvas(tick.label, '#fbbf24', 10)}
            />
          </sprite>
        </group>
      ))}

      <group position={[0, 0, 0]}>
        <arrowHelper
          args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-12.5, 0.2, -12.5), 10, 0xf59e0b, 0.3, 0.15]}
        />
        <arrowHelper
          args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-10, 0.2, -12.5), 20, 0x3b82f6, 0.3, 0.15]}
        />
        <arrowHelper
          args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(-12.5, 0.2, -10), 20, 0x10b981, 0.3, 0.15]}
        />
      </group>

      <group position={[0, -12, 0]}>
        <sprite position={[0, 0.5, 0]} scale={[3, 0.5, 1]}>
          <canvasTexture
            attach="map"
            image={createTextCanvas('现金流日期 →', '#60a5fa', 14)}
          />
        </sprite>
      </group>

      <group position={[-12.5, 0, 0]}>
        <sprite position={[0, 0.5, 0]} scale={[3, 0.5, 1]} rotation={[0, Math.PI / 2, 0]}>
          <canvasTexture
            attach="map"
            image={createTextCanvas('债券代码 →', '#34d399', 14)}
          />
        </sprite>
      </group>

      <group position={[-12.5, 0, -12.5]}>
        <sprite position={[0, 5, 0]} scale={[3, 0.5, 1]}>
          <canvasTexture
            attach="map"
            image={createTextCanvas('现金流金额 ↑', '#fbbf24', 14)}
          />
        </sprite>
      </group>
    </group>
  )
}

function createTextCanvas(text: string, color: string, fontSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 512
  canvas.height = 128
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = `bold ${fontSize * 2}px "Roboto Mono", monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  return canvas
}