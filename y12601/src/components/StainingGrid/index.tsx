import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import type { GridCell } from '@/types/staining'
import { PALETTE_COLORS } from '@/data/colors'
import styles from './index.module.scss'

interface Props {
  cells: GridCell[][]
  selectedColorIndex: number
  onCellTap: (row: number, col: number) => void
  showResult?: boolean
  compact?: boolean
  highlightDiff?: { row: number; col: number }[]
}

const StainingGrid: React.FC<Props> = ({
  cells,
  selectedColorIndex,
  onCellTap,
  showResult = false,
  compact = false,
  highlightDiff = [],
}) => {
  const diffSet = new Set(highlightDiff.map((d) => `${d.row}-${d.col}`))

  const getCellStyle = (cell: GridCell) => {
    const colorIndex = showResult ? cell.correctColorIndex : cell.userColorIndex
    if (colorIndex < 0) return {}
    if (colorIndex === 0) return { backgroundColor: PALETTE_COLORS[0].hex }
    return { backgroundColor: PALETTE_COLORS[colorIndex]?.hex || '#F3F4F6' }
  }

  return (
    <View className={styles.gridWrapper}>
      {cells.map((row, ri) => (
        <View className={styles.gridRow} key={ri}>
          {row.map((cell, ci) => {
            const isDiff = diffSet.has(`${ri}-${ci}`)
            const isWrong = showResult && cell.userColorIndex !== cell.correctColorIndex && cell.userColorIndex > 0
            const isMissed = showResult && cell.correctColorIndex > 0 && cell.userColorIndex <= 0

            return (
              <View
                key={ci}
                className={classnames(
                  styles.cell,
                  compact ? styles.cellCompact : styles.cellNormal,
                  cell.isBoundary && styles.boundaryCell,
                  cell.isBoundaryTouched && styles.boundaryTouched,
                  isWrong && styles.wrongCell,
                  isMissed && styles.missedCell,
                  isDiff && styles.diffCell,
                )}
                style={getCellStyle(cell)}
                onClick={() => !showResult && onCellTap(ri, ci)}
              >
                {cell.isBoundary && !showResult && (
                  <View className={styles.boundaryMark} />
                )}
                {isWrong && <Text className={styles.cellIcon}>✕</Text>}
                {isMissed && <Text className={styles.cellIcon}>○</Text>}
                {isDiff && <View className={styles.diffDot} />}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export default StainingGrid
