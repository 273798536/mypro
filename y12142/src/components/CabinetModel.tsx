import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import type { Cell, AnomalyType, SeverityLevel } from '@/types'
import * as THREE from 'three'
import CellMesh from './CellMesh'

interface Props {
  cabinetId: string
  cells: Cell[]
  position: [number, number, number]
  selectedCellId: string | null
  onSelectCell: (id: string | null) => void
}

function getAnomalyColor(type: AnomalyType, severity: SeverityLevel): string {
  if (type === 'missing_sample') return '#8b5cf6'
  if (type === 'drift') {
    if (severity === 'critical') return '#ef4444'
    return '#f59e0b'
  }
  if (type === 'threshold_version_error') {
    if (severity === 'critical') return '#ef4444'
    return '#f59e0b'
  }
  if (severity === 'critical') return '#ef4444'
  if (severity === 'warning') return '#f59e0b'
  return '#10b981'
}

export default function CabinetModel({ cabinetId, cells, position, selectedCellId, onSelectCell }: Props) {
  const checkThreshold = useStore((s) => s.checkThreshold)

  const cellsByCluster = useMemo(() => {
    const map: Record<string, Cell[]> = {}
    for (const cell of cells) {
      if (!map[cell.clusterId]) map[cell.clusterId] = []
      map[cell.clusterId].push(cell)
    }
    return map
  }, [cells])

  const clusterIds = useMemo(() => Object.keys(cellsByCluster), [cellsByCluster])

  const handleCellClick = (cellId: string) => {
    onSelectCell(selectedCellId === cellId ? null : cellId)
  }

  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.8, 2.0, 0.9]} />
        <meshStandardMaterial
          color="#1a1f2e"
          transparent
          opacity={0.25}
          roughness={0.8}
          metalness={0.3}
        />
      </mesh>

      <lineSegments position={[0, 0.9, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.8, 2.0, 0.9)]} />
        <lineBasicMaterial color="#2d3748" transparent opacity={0.6} />
      </lineSegments>

      {clusterIds.map((clusterId, ci) => {
        const clusterCells = cellsByCluster[clusterId]
        const sorted = [...clusterCells].sort((a, b) => a.index - b.index)
        const xOffset = ci === 0 ? -0.35 : 0.35

        return sorted.map((cell, ri) => {
          const col = ri % 4
          const row = Math.floor(ri / 4)
          const x = xOffset + (col - 1.5) * 0.2
          const y = 0.3 + row * 0.22
          const z = 0

          const result = checkThreshold(cell.id)
          const baseColor = getAnomalyColor(cell.status, result.severity)
          const isSelected = selectedCellId === cell.id
          const isHighlighted = selectedCellId === null || isSelected

          return (
            <CellMesh
              key={cell.id}
              cell={cell}
              position={[x, y, z]}
              color={baseColor}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              onClick={() => handleCellClick(cell.id)}
              severity={result.severity}
            />
          )
        })
      })}
    </group>
  )
}
