import React, { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import StainingGrid from '@/components/StainingGrid'
import HitDiffViewer from '@/components/HitDiffViewer'
import { useStainingStore } from '@/store/useStainingStore'
import { calculateHitDetection, calculateGridSnapDiff } from '@/utils/hitDetection'
import styles from './index.module.scss'

const ResultPage: React.FC = () => {
  const {
    gridCells,
    currentLevel,
    boundaryFailures,
    undoSyncIssues,
  } = useStainingStore()

  const hitResult = useMemo(
    () => calculateHitDetection(gridCells),
    [gridCells]
  )

  const snapDiff = useMemo(
    () => calculateGridSnapDiff(gridCells, currentLevel?.snapOffsetCells || []),
    [gridCells, currentLevel]
  )

  const accuracyPercent = Math.round(hitResult.accuracy * 100)

  const handleBackHome = () => {
    Taro.switchTab({ url: '/pages/practice/index' })
  }

  const handleRetry = () => {
    Taro.navigateBack()
  }

  return (
    <View className={styles.page}>
      <View className={styles.scoreCard}>
        <Text className={styles.scoreLabel}>命中率</Text>
        <Text className={styles.scoreValue}>{accuracyPercent}%</Text>
        <Text className={styles.scoreSub}>
          正确 {hitResult.correctCells} / 总计 {hitResult.totalCells}
        </Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>涂色结果</Text>
        <View className={styles.resultGrid}>
          <StainingGrid
            cells={gridCells}
            selectedColorIndex={-1}
            onCellTap={() => {}}
            showResult
          />
        </View>
        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendCorrect)} />
            <Text className={styles.legendText}>正确</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendWrong)} />
            <Text className={styles.legendText}>错误</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.legendMissed)} />
            <Text className={styles.legendText}>漏涂</Text>
          </View>
        </View>
      </View>

      {boundaryFailures.length > 0 && (
        <View className={classnames(styles.section, styles.boundarySection)}>
          <Text className={styles.sectionTitle}>边界失败</Text>
          {boundaryFailures.map((f, i) => (
            <View className={styles.issueItem} key={i}>
              <Text className={styles.issuePos}>
                第{f.row + 1}行第{f.col + 1}列
              </Text>
              <Text className={styles.issueDesc}>{f.description}</Text>
            </View>
          ))}
        </View>
      )}

      {currentLevel && currentLevel.snapOffsetCells.length > 0 && (
        <View className={styles.section}>
          <HitDiffViewer cells={gridCells} snapDiff={snapDiff} />
        </View>
      )}

      {undoSyncIssues.length > 0 && (
        <View className={classnames(styles.section, styles.syncSection)}>
          <Text className={styles.sectionTitle}>撤销状态同步异常</Text>
          {undoSyncIssues.map((issue, i) => (
            <View className={styles.syncItem} key={i}>
              <Text className={styles.syncBugId}>{issue.bugId}</Text>
              <Text className={styles.syncDesc}>{issue.description}</Text>
              <Text className={styles.syncDetail}>
                预期状态：{issue.expectedState}
              </Text>
              <Text className={styles.syncDetail}>
                实际状态：{issue.actualState}
              </Text>
              <Text className={styles.syncImpact}>
                结果影响：{issue.impactOnResult}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className={styles.bottomBar}>
        <View className={classnames(styles.bottomBtn, styles.btnSecondary)} onClick={handleRetry}>
          <Text>重新练习</Text>
        </View>
        <View className={classnames(styles.bottomBtn, styles.btnPrimary)} onClick={handleBackHome}>
          <Text>返回练习列表</Text>
        </View>
      </View>
    </View>
  )
}

export default ResultPage
