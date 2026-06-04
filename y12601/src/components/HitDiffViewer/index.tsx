import React from 'react'
import { View, Text } from '@tarojs/components'
import type { GridSnapDiff } from '@/types/staining'
import type { GridCell } from '@/types/staining'
import StainingGrid from '@/components/StainingGrid'
import styles from './index.module.scss'

interface Props {
  cells: GridCell[][]
  snapDiff: GridSnapDiff
}

const HitDiffViewer: React.FC<Props> = ({ cells, snapDiff }) => {
  if (snapDiff.diffCells.length === 0) {
    return (
      <View className={styles.container}>
        <Text className={styles.title}>吸附差异对比</Text>
        <Text className={styles.noDiff}>当前涂色在吸附开关两种模式下无差异</Text>
      </View>
    )
  }

  return (
    <View className={styles.container}>
      <Text className={styles.title}>吸附差异对比</Text>
      <Text className={styles.subtitle}>
        网格吸附开关对命中检测的影响（差异区域标蓝点）
      </Text>

      <View className={styles.diffGrids}>
        <View className={styles.diffSide}>
          <Text className={styles.diffLabel}>吸附开启</Text>
          <StainingGrid
            cells={cells}
            selectedColorIndex={-1}
            onCellTap={() => {}}
            showResult
            compact
            highlightDiff={snapDiff.diffCells}
          />
        </View>
        <View className={styles.diffDivider}>
          <Text className={styles.vs}>VS</Text>
        </View>
        <View className={styles.diffSide}>
          <Text className={styles.diffLabel}>吸附关闭</Text>
          <StainingGrid
            cells={buildNoSnapCells(cells, snapDiff)}
            selectedColorIndex={-1}
            onCellTap={() => {}}
            showResult
            compact
            highlightDiff={snapDiff.diffCells}
          />
        </View>
      </View>

      <View className={styles.diffList}>
        {snapDiff.diffCells.map((d, i) => (
          <View className={styles.diffItem} key={i}>
            <Text className={styles.diffPos}>
              第{d.row + 1}行第{d.col + 1}列
            </Text>
            <Text className={styles.diffDetail}>
              吸附开启: {d.snapColor} → 吸附关闭: {d.noSnapColor}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function buildNoSnapCells(
  originalCells: GridCell[][],
  snapDiff: GridSnapDiff
): GridCell[][] {
  const newCells = originalCells.map((row) =>
    row.map((cell) => ({ ...cell, userColorIndex: -1 }))
  )
  snapDiff.withoutSnap.forEach((item) => {
    if (item.colorIndex >= 0 && newCells[item.row] && newCells[item.row][item.col]) {
      newCells[item.row][item.col].userColorIndex = item.colorIndex
    }
  })
  return newCells
}

export default HitDiffViewer
