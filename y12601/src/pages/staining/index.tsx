import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import LEVELS from '@/data/levels'
import StainingGrid from '@/components/StainingGrid'
import ColorPalette from '@/components/ColorPalette'
import { useStainingStore } from '@/store/useStainingStore'
import styles from './index.module.scss'

const StainingPage: React.FC = () => {
  const router = useRouter()
  const levelId = router.params.levelId || 'level_basic'

  const {
    currentLevel,
    gridCells,
    selectedColorIndex,
    isGridSnapEnabled,
    history,
    undoSyncIssues,
    isCompleted,
    loadLevel,
    selectColor,
    stainCell,
    undo,
    restart,
    toggleGridSnap,
    submit,
  } = useStainingStore()

  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const level = LEVELS.find((l) => l.id === levelId)
    if (level) {
      loadLevel(level)
      setIsLoaded(true)
    }
  }, [levelId, loadLevel])

  useDidShow(() => {
    if (isCompleted) {
      const level = LEVELS.find((l) => l.id === levelId)
      if (level) {
        loadLevel(level)
      }
    }
  })

  const handleCellTap = (row: number, col: number) => {
    if (isCompleted) return
    if (selectedColorIndex <= 0) {
      Taro.showToast({ title: '请先选择颜色', icon: 'none' })
      return
    }
    stainCell(row, col)
  }

  const handleSubmit = () => {
    const hasStained = gridCells.some((row) => row.some((c) => c.userColorIndex > 0))
    if (!hasStained) {
      Taro.showToast({ title: '请先涂色再提交', icon: 'none' })
      return
    }
    submit()
    Taro.navigateTo({ url: `/pages/result/index?levelId=${levelId}` })
  }

  if (!isLoaded || !currentLevel) {
    return (
      <View className={styles.page}>
        <View className={styles.levelInfo}>
          <Text className={styles.levelName}>加载中...</Text>
        </View>
      </View>
    )
  }

  const hasStained = gridCells.some((row) => row.some((c) => c.userColorIndex > 0))

  return (
    <View className={styles.page}>
      <View className={styles.levelInfo}>
        <Text className={styles.levelName}>{currentLevel.name}</Text>
        <Text className={styles.levelDesc}>{currentLevel.description}</Text>
      </View>

      <View className={styles.gridSection}>
        <Text className={styles.gridLabel}>
          {currentLevel.gridSize}x{currentLevel.gridSize} 涂色网格
          {isGridSnapEnabled ? ' · 吸附开启' : ' · 吸附关闭'}
        </Text>
        <StainingGrid
          cells={gridCells}
          selectedColorIndex={selectedColorIndex}
          onCellTap={handleCellTap}
        />
      </View>

      <View className={styles.toolbar}>
        <View
          className={classnames(styles.snapToggle, isGridSnapEnabled && styles.snapActive)}
          onClick={toggleGridSnap}
        >
          <View
            className={classnames(styles.snapDot, isGridSnapEnabled && styles.snapDotActive)}
          />
          <Text>网格吸附</Text>
        </View>
        <View className={styles.actionBtns}>
          <View
            className={classnames(styles.actionBtn, styles.undoBtn)}
            onClick={() => {
              if (history.length === 0) {
                Taro.showToast({ title: '没有可撤销的操作', icon: 'none' })
                return
              }
              undo()
            }}
          >
            <Text>撤销</Text>
          </View>
          <View
            className={classnames(styles.actionBtn, styles.restartBtn)}
            onClick={() => {
              restart()
              Taro.showToast({ title: '已重开', icon: 'none' })
            }}
          >
            <Text>重开</Text>
          </View>
        </View>
      </View>

      <View className={styles.paletteSection}>
        <ColorPalette
          colors={currentLevel.colorPalette}
          selectedIndex={selectedColorIndex}
          onSelect={selectColor}
        />
      </View>

      {undoSyncIssues.length > 0 && (
        <View className={styles.syncWarning}>
          <Text className={styles.syncWarningTitle}>⚠ 检测到状态同步异常</Text>
          {undoSyncIssues.map((issue, i) => (
            <Text className={styles.syncWarningText} key={i}>
              {i + 1}. {issue.description}{'\n'}
              预期：{issue.expectedState}{'\n'}
              实际：{issue.actualState}
            </Text>
          ))}
        </View>
      )}

      <View className={styles.tipsCard}>
        <Text className={styles.tipsTitle}>操作提示</Text>
        {currentLevel.tips.map((tip, i) => (
          <Text className={styles.tipItem} key={i}>
            {i + 1}. {tip}
          </Text>
        ))}
      </View>

      <View className={styles.submitBar}>
        <View
          className={classnames(
            styles.submitBtn,
            isCompleted && styles.submitBtnDisabled
          )}
          onClick={handleSubmit}
        >
          <Text>提交查看结果</Text>
        </View>
      </View>
    </View>
  )
}

export default StainingPage
