import React from 'react'
import BatchList from './BatchList.jsx'
import { Alert, Space, Typography } from 'antd'
import { SafetyCertificateOutlined, CalendarOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

export default function BackupCheckEntry({ onOpenBatch, onImportSuccess }) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message={
          <span>
            <b>备份校验 — 月底/课前专项入口</b>
            <Text type="secondary" style={{ marginLeft: 12 }}>
              月底结账或开课之前，对备份恢复场景下的分区策略、表结构一致性进行集中复核。
              与"慢查询归因"分入口，避免日常数据干扰专项审计。
            </Text>
          </span>
        }
      />
      <Typography style={{ padding: '0 8px' }}>
        <Title level={4} style={{ margin: '8px 0' }}>专项复核流程 <CalendarOutlined /></Title>
        <Paragraph style={{ marginLeft: 8, color: '#555' }}>
          ① 备份恢复演练 → ② 导出全量表结构快照 → ③ 本入口导入 → ④ 与最近一次日常快照做对比（批次对比 API）→ ⑤ 验证分区策略、租户/账套字段是否正确 → ⑥ 给出专项结论并下载归档
        </Paragraph>
      </Typography>
      <BatchList onOpen={onOpenBatch} onRefresh={onImportSuccess} filterEntry="backup_check" />
    </Space>
  )
}
