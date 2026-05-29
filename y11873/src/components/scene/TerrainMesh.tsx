import { useMemo } from 'react'
import * as THREE from 'three'

function heightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.3) * Math.cos(z * 0.3) * 2 +
    Math.sin(x * 0.1 + z * 0.1) * 3 +
    Math.cos(x * 0.05) * Math.sin(z * 0.08) * 1.5
  )
}

export { heightAt }

export default function TerrainMesh() {
  const geometry = useMemo(() => {
    const size = 40
    const segments = 120
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    let minH = Infinity
    let maxH = -Infinity
    const heights: number[] = []

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = heightAt(x, z)
      heights.push(h)
      if (h < minH) minH = h
      if (h > maxH) maxH = h
    }

    const range = maxH - minH || 1

    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heights[i])
      const t = (heights[i] - minH) / range

      let r: number, g: number, b: number
      if (t < 0.3) {
        r = 0.04 + t * 0.06
        g = 0.12 + t * 0.5
        b = 0.35 + t * 0.8
      } else if (t < 0.65) {
        const lt = (t - 0.3) / 0.35
        r = 0.06 + lt * 0.2
        g = 0.27 + lt * 0.35
        b = 0.59 - lt * 0.45
      } else {
        const lt = (t - 0.65) / 0.35
        r = 0.26 + lt * 0.5
        g = 0.62 - lt * 0.25
        b = 0.14 - lt * 0.04
      }

      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors />
    </mesh>
  )
}
