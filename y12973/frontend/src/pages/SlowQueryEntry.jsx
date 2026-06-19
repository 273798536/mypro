import React from 'react'
import BatchList from './BatchList.jsx'
import { Alert, Space, Typography } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

export default function SlowQueryEntry({ onOpenBatch, onImportSuccess }) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="warning"
        showIcon
        icon={<ThunderboltOutlined />}
        message={
          <span>
            <b>慢查询归因 — SRE 值班日常入口</b>
            <Text type="secondary" style={{ marginLeft: 12 }}>
              日常处理慢查询问题时，若发现涉及租户账套分区策略/表结构变更，在此入口导入复核。
              月底/课前统一使用"备份校验"入口，两者分流避免结论混淆。
            </Text>
          </span>
        }
      />
      <Typography style={{ padding: '0 8px' }}>
        <Title level={4} style={{ margin: '8px 0' }}>日常复核流程</Title>
        <Paragraph style={{ marginLeft: 8, color: '#555' }}>
          ① 慢查询告警触发 → ② 定位是否跨租户/跨账套分区未命中 → ③ 导出表结构快照 JSON → ④ 本页面导入（自动 data_hash 去重）→ ⑤ 给出结论并关联迁移脚本 → ⑥ 下载同批次数据留档
        </Paragraph>
      </Typography>
      <BatchList onOpen={onOpenBatch} onRefresh={onImportSuccess} filterEntry="slow_query" />
    </Space>
  )
}
