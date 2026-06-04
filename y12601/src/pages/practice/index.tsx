import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import LEVELS from '@/data/levels'
import styles from './index.module.scss'

const PracticePage: React.FC = () => {
  const handleStartLevel = (levelId: string) => {
    Taro.navigateTo({ url: `/pages/staining/index?levelId=${levelId}` })
  }

  const getTagStyle = (scenario: string) => {
    switch (scenario) {
      case 'basic': return styles.tagBasic
      case 'boundary': return styles.tagBoundary
      case 'undo': return styles.tagUndo
      default: return styles.tagBasic
    }
  }

  const getTagText = (scenario: string) => {
    switch (scenario) {
      case 'basic': return '基础'
      case 'boundary': return '边界'
      case 'undo': return '撤销'
      default: return scenario
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>细胞切片涂色练习</Text>
        <Text className={styles.headerDesc}>选择关卡，练习涂色标注与边界问题处理</Text>
      </View>

      <View className={styles.levelList}>
        {LEVELS.map((level) => (
          <View
            className={styles.levelCard}
            key={level.id}
            onClick={() => handleStartLevel(level.id)}
          >
            <View className={styles.levelHeader}>
              <Text className={styles.levelName}>{level.name}</Text>
              <Text className={classnames(styles.levelTag, getTagStyle(level.scenario))}>
                {getTagText(level.scenario)}
              </Text>
            </View>
            <Text className={styles.levelDesc}>{level.description}</Text>
            <View className={styles.levelFooter}>
              <Text className={styles.levelMeta}>
                {level.gridSize}x{level.gridSize} 网格 · {level.colorPalette.length - 1} 种染色
              </Text>
              <View className={styles.startBtn}>
                <Text>开始练习</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className={styles.tipsSection}>
        <Text className={styles.tipsTitle}>练习须知</Text>
        <View className={styles.tipCard}>
          <Text className={styles.tipText}>
            1. 基础涂色：熟悉操作，无边界问题{'\n'}
            2. 边界失败：涂色超出边界会被检测{'\n'}
            3. 撤销与重开：撤销后状态可能不同步{'\n'}{'\n'}
            每个关卡都会真实改变判定结果，完成后可查看结算和导出草稿。
          </Text>
        </View>
      </View>
    </View>
  )
}

export default PracticePage
