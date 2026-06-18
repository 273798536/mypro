import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, List, Tag, Typography, Space } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  EditOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import api from '../api'
import type { DashboardData } from '../types'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard') as any
      setData(res)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionTypeText = (type: string) => {
    const map: Record<string, { text: string; color: string }> = {
      correction_created: { text: '修正录入', color: 'blue' },
      correction_updated: { text: '修正更新', color: 'geekblue' },
      version_compare: { text: '版本对比', color: 'purple' },
      correction_confirmed: { text: '修正确认', color: 'green' },
      review_note_added: { text: '复核备注', color: 'orange' },
    }
    return map[type] || { text: type, color: 'default' }
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>概览</Title>
      <Text type="secondary">知识库召回证据复核系统总览</Text>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="样本总数"
              value={data?.total_samples || 0}
              prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="算法版本"
              value={data?.total_versions || 0}
              prefix={<BarChartOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="人工修正"
              value={data?.total_corrections || 0}
              prefix={<EditOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <Statistic
              title="复核结论"
              value={data?.total_conclusions || 0}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="当前生效版本" extra={data?.active_version ? <Tag color="green">运行中</Tag> : null}>
            {data?.active_version ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>版本号：</Text>
                  <Text>{data.active_version.version}</Text>
                </div>
                <div>
                  <Text strong>描述：</Text>
                  <Text>{data.active_version.description}</Text>
                </div>
                <div>
                  <Text strong>阈值配置：</Text>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                    {JSON.stringify(data.active_version.threshold_config, null, 2)}
                  </pre>
                </div>
              </Space>
            ) : (
              <Text type="secondary">暂无生效版本</Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="待处理修正"
            extra={
              <Tag color={data?.pending_corrections ? 'red' : 'green'} icon={<ExclamationCircleOutlined />}>
                {data?.pending_corrections || 0} 条待处理
              </Tag>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic
                value={data?.pending_corrections || 0}
                valueStyle={{ color: '#cf1322', fontSize: 32 }}
                prefix={<ClockCircleOutlined />}
              />
              <Text type="secondary">请及时处理待复核的人工修正，确保月底封账前可追溯</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="最近操作历史" style={{ marginTop: 16 }}>
        <List
          loading={loading}
          dataSource={data?.recent_histories || []}
          renderItem={(item) => {
            const typeInfo = getActionTypeText(item.action_type)
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<Tag color={typeInfo.color}>{typeInfo.text}</Tag>}
                  title={
                    <Space>
                      <span>样本 #{item.sample_id}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text>操作人：{item.operator || '未知'}</Text>
                      <Text type="secondary">{item.remark}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      </Card>
    </div>
  )
}

export default Dashboard
