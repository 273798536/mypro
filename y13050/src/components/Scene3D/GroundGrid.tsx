import { useMemo } from 'react'
import * as THREE from 'three'

export default function GroundGrid() {
  const grid = useMemo(() => {
    const size = 100
    const divisions = 50
    const g = new THREE.GridHelper(size, divisions, 0x1b4965, 0x13315c)
    g.position.y = -0.01
    g.material.transparent = true
    g.material.opacity = 0.6
    return g
  }, [])

  const borderLine = useMemo(() => {
    const pts = []
    pts.push(new THREE.Vector3(-5, 0, 0))
    pts.push(new THREE.Vector3(-5, 0, 80))
    pts.push(new THREE.Vector3(5, 0, 80))
    pts.push(new THREE.Vector3(5, 0, 0))
    pts.push(new THREE.Vector3(-5, 0, 0))
    const geom = new THREE.BufferGeometry().setFromPoints(pts)
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x1b9aaa }))
    return line
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 40]}>
        <planeGeometry args={[30, 100]} />
        <meshBasicMaterial color={0x0a1d33} />
      </mesh>
      <primitive object={grid} position={[0, 0, 40]} />
      <primitive object={borderLine} />
    </group>
  )
}
