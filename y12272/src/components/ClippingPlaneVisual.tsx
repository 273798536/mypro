import { useRef, useMemo, useState } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useStore } from "@/store/useStore"
import { Html } from "@react-three/drei"

export default function ClippingPlaneVisual() {
  const planeRef = useRef<THREE.Mesh>(null)
  const edgeRef = useRef<THREE.LineSegments>(null)
  const [dragging, setDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; pos: number } | null>(null)

  const clippingPlane = useStore((s) => s.clippingPlane)
  const setClippingPlane = useStore((s) => s.setClippingPlane)

  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(20, 20), [])
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(20, 20)), [])

  const planePosition = useMemo(() => {
    const pos: [number, number, number] = [0, clippingPlane.position, 0]
    if (clippingPlane.direction === "x") {
      pos[0] = clippingPlane.position
      pos[1] = -1.5
    } else if (clippingPlane.direction === "z") {
      pos[2] = clippingPlane.position
      pos[1] = -1.5
    }
    return pos
  }, [clippingPlane.position, clippingPlane.direction])

  const planeRotation = useMemo(() => {
    const rot: [number, number, number] = [-Math.PI / 2, 0, 0]
    if (clippingPlane.direction === "x") {
      rot[0] = 0
      rot[1] = Math.PI / 2
    } else if (clippingPlane.direction === "z") {
      rot[0] = 0
      rot[1] = 0
    }
    return rot
  }, [clippingPlane.direction])

  useFrame(() => {
    if (planeRef.current) {
      const material = planeRef.current.material as THREE.MeshBasicMaterial
      if (material) {
        const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.2
        material.opacity = clippingPlane.enabled ? pulse : 0
      }
    }
  })

  if (!clippingPlane.enabled) return null

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setDragging(true)
    dragStartRef.current = {
      y: e.point.y,
      pos: clippingPlane.position,
    }
  }

  const handlePointerMove = (e: any) => {
    if (!dragging || !dragStartRef.current) return
    e.stopPropagation()
    const deltaY = e.point.y - dragStartRef.current.y
    let newPos = dragStartRef.current.pos + deltaY * 0.5
    newPos = Math.max(-3, Math.min(0, newPos))
    setClippingPlane({ position: parseFloat(newPos.toFixed(2)) })
  }

  const handlePointerUp = () => {
    setDragging(false)
    dragStartRef.current = null
  }

  return (
    <group>
      <mesh
        ref={planeRef}
        geometry={planeGeometry}
        position={planePosition}
        rotation={planeRotation}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <lineSegments
        ref={edgeRef}
        geometry={edgeGeometry}
        position={planePosition}
        rotation={planeRotation}
      >
        <lineBasicMaterial color="#60a5fa" linewidth={2} />
      </lineSegments>

      <Html
        position={[
          planePosition[0] + (clippingPlane.direction === "x" ? 0 : 10),
          planePosition[1] + 0.1,
          planePosition[2] + (clippingPlane.direction === "z" ? 0 : -10),
        ]}
        center
        distanceFactor={8}
      >
        <div className="rounded bg-blue-500/80 px-2 py-1 text-[10px] font-mono text-white whitespace-nowrap shadow-lg">
          剖切 y={clippingPlane.position.toFixed(2)}m
        </div>
      </Html>
    </group>
  )
}
