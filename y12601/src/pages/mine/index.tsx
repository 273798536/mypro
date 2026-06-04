import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

const MinePage: React.FC = () => {
  return (
    <View className={styles.page}>
      <View className={styles.profileCard}>
        <View className={styles.profileAvatar}>
          <Text className={styles.avatarText}>运</Text>
        </View>
        <Text className={styles.profileName}>赛事运营</Text>
        <Text className={styles.profileRole}>细胞切片涂色练习 · 标注员</Text>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>3</Text>
          <Text className={styles.statLabel}>已完成关卡</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>65%</Text>
          <Text className={styles.statLabel}>平均命中率</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>3</Text>
          <Text className={styles.statLabel}>标注草稿</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>练习统计</Text>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>基础涂色</Text>
          <Text className={styles.menuValue}>命中率 72%</Text>
        </View>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>边界失败</Text>
          <Text className={styles.menuValue}>命中率 58%</Text>
        </View>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>撤销与重开</Text>
          <Text className={styles.menuValue}>命中率 65%</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>常见问题</Text>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>撤销后为什么状态不同步</Text>
          <Text className={styles.menuValue}>查看说明</Text>
        </View>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>网格吸附有什么影响</Text>
          <Text className={styles.menuValue}>查看说明</Text>
        </View>
        <View className={styles.menuItem}>
          <Text className={styles.menuLabel}>导出文件怎么看</Text>
          <Text className={styles.menuValue}>查看说明</Text>
        </View>
      </View>
    </View>
  )
}

export default MinePage
