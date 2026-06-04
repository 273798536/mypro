import React, { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import DRAFTS from '@/data/drafts'
import { generateExportText, copyExportText } from '@/utils/exportUtils'
import type { DraftRecord, DraftEntry } from '@/types/draft'
import styles from './index.module.scss'

const DraftsPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    setExportingId(null)
  }

  const handleExport = (draft: DraftRecord) => {
    if (exportingId === draft.id) {
      const text = generateExportText(draft)
      const success = copyExportText(text)
      Taro.showToast({
        title: success ? '已复制到剪贴板' : '导出文本已生成',
        icon: 'none',
      })
      return
    }
    setExportingId(draft.id)
  }

  const getAccuracyClass = (accuracy: number) => {
    if (accuracy >= 0.8) return styles.accuracyHigh
    if (accuracy >= 0.6) return styles.accuracyMid
    return styles.accuracyLow
  }

  const renderEntry = (entry: DraftEntry) => (
    <View className={styles.entryItem} key={entry.id}>
      <Text className={styles.entryPos}>{entry.positionLabel}</Text>
      <Text className={styles.entryColor}>
        涂色: {entry.userColorName} | 正确: {entry.correctColorName} | 来源: {entry.sourceName}
        {entry.isCorrect ? ' · 正确' : ' · 错误'}
      </Text>
      {entry.hasIssue && entry.issueType === 'mismatch' && (
        <Text className={styles.entryIssue}>
          涂色错误：{entry.issueDescription}
        </Text>
      )}
      {entry.isDuplicate && (
        <Text className={styles.entryDuplicate}>
          重复标注：{entry.duplicateReason}
        </Text>
      )}
      {entry.hasIssue && entry.issueType === 'missing_unit' && (
        <Text className={styles.entryUnit}>
          漏填单位：{entry.issueDescription}
        </Text>
      )}
      {entry.hasIssue && entry.issueType === 'inconsistent_name' && (
        <Text className={styles.entryIssue}>
          字段名不一致：{entry.issueDescription}
        </Text>
      )}
    </View>
  )

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>标注草稿</Text>
        <Text className={styles.headerDesc}>查看练习记录与导出标注数据</Text>
      </View>

      <View className={styles.draftList}>
        {DRAFTS.map((draft) => (
          <View className={styles.draftCard} key={draft.id}>
            <View className={styles.draftHeader}>
              <Text className={styles.draftLevel}>{draft.levelName}</Text>
              <Text className={classnames(styles.draftAccuracy, getAccuracyClass(draft.accuracy))}>
                {Math.round(draft.accuracy * 100)}%
              </Text>
            </View>
            <Text className={styles.draftTime}>{draft.createdAt}</Text>
            <Text className={styles.draftSummary}>{draft.summary}</Text>
            <View className={styles.draftFooter}>
              <View className={styles.draftMeta}>
                <Text className={styles.metaItem}>标注 {draft.entryCount}</Text>
                <Text className={styles.metaItem}>问题 {draft.issueCount}</Text>
              </View>
              <View className={styles.draftActions}>
                <View
                  className={classnames(styles.draftBtn, styles.viewBtn)}
                  onClick={() => handleToggle(draft.id)}
                >
                  <Text>{expandedId === draft.id ? '收起' : '详情'}</Text>
                </View>
                <View
                  className={classnames(styles.draftBtn, styles.exportBtn)}
                  onClick={() => handleExport(draft)}
                >
                  <Text>{exportingId === draft.id ? '复制' : '导出'}</Text>
                </View>
              </View>
            </View>

            {expandedId === draft.id && (
              <View className={styles.entrySection}>
                <Text className={styles.entrySectionTitle}>标注详情</Text>
                {draft.entries.map(renderEntry)}
              </View>
            )}

            {exportingId === draft.id && (
              <View className={styles.exportPreview}>
                <ScrollView scrollY style={{ maxHeight: '500rpx' }}>
                  <Text className={styles.exportText}>
                    {generateExportText(draft)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

export default DraftsPage
