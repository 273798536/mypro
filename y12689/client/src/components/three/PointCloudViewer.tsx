import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { NormalRecord } from '@/types'

interface PointCloudViewerProps {
  record: NormalRecord
  sliceAxis: 'x' | 'y' | 'z'
  slicePosition: number
  playbackTime: number
}

const POINT_COUNT = 3000

function generatePoints(record: NormalRecord) {
  const positions = new Float32Array(POINT_COUNT * 3)
  const colors = new Float32Array(POINT_COUNT * 3)
  const deviation = record.normalDeviation

  for (let i = 0; i < POINT_COUNT; i++) {
    const x = Math.random() * 200
    const y = Math.random() * 100
    const z = Math.random() * 100

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const rand = Math.random()
    let color: THREE.Color

    if (rand < deviation * 0.5) {
      color = new THREE.Color('#ff4d4f')
    } else if (rand < deviation * 0.5 + 0.15) {
      color = new THREE.Color('#00e5ff')
    } else if (rand < deviation * 0.5 + 0.3) {
      color = new THREE.Color('#1890ff')
    } else {
      color = new THREE.Color('#52c41a')
    }

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return { positions, colors }
}

function PointCloud({ record }: { record: NormalRecord }) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => generatePoints(record), [record])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [positions, colors])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={1.2}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  )
}

function SlicePlane({
  axis,
  position,
}: {
  axis: 'x' | 'y' | 'z'
  position: number
}) {
  const planeRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    if (axis === 'x') {
      return new THREE.PlaneGeometry(200, 200)
    } else if (axis === 'y') {
      return new THREE.PlaneGeometry(200, 200)
    } else {
      return new THREE.PlaneGeometry(200, 200)
    }
  }, [axis])

  const positionArr = useMemo(() => {
    if (axis === 'x') return [position, 50, 50] as [number, number, number]
    if (axis === 'y') return [100, position, 50] as [number, number, number]
    return [100, 50, position] as [number, number, number]
  }, [axis, position])

  const rotation = useMemo(() => {
    if (axis === 'x') return [0, Math.PI / 2, 0] as [number, number, number]
    if (axis === 'y') return [Math.PI / 2, 0, 0] as [number, number, number]
    return [0, 0, 0] as [number, number, number]
  }, [axis])

  return (
    <mesh ref={planeRef} position={positionArr} rotation={rotation} geometry={geometry}>
      <meshBasicMaterial color="#1890ff" transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  )
}

function AxesHelper() {
  return <axesHelper args={[80]} />
}

function Scene({
  record,
  sliceAxis,
  slicePosition,
}: {
  record: NormalRecord
  sliceAxis: 'x' | 'y' | 'z'
  slicePosition: number
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 100, 50]} intensity={0.8} />
      <PointCloud record={record} />
      <gridHelper
        args={[200, 20, '#303030', '#1f1f1f']}
        position={[100, 0, 50]}
      />
      <AxesHelper />
      <SlicePlane axis={sliceAxis} position={slicePosition} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={50}
        maxDistance={500}
      />
    </>
  )
}

function PointCloudViewer({
  record,
  sliceAxis,
  slicePosition,
  playbackTime: _playbackTime,
}: PointCloudViewerProps) {
  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden border border-border"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <Canvas
        camera={{
          position: [150, 100, 150],
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(100, 50, 0)
        }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <fog attach="fog" args={['#0a0a0a', 300, 800]} />
        <Scene
          record={record}
          sliceAxis={sliceAxis}
          slicePosition={slicePosition}
        />
      </Canvas>
    </div>
  )
}

export default PointCloudViewer
