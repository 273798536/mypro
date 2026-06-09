import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Button, Space, Typography } from 'antd'
import {
  DatabaseOutlined, AuditOutlined, FileTextOutlined, WarningOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined, ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { systemApi, batchApi, reviewApi } from '../../services/api'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function AssistantDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [recentBatches, setRecentBatches] = useState<any[]>([])
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = () => {
    systemApi.stats().then(setStats)
    batchApi.list(0, 5).then(setRecentBatches)
    reviewApi.listSessions({ limit: 5 }).then(setRecentSessions)
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">投研助理工作台</div>
          <div className="page-description">管理数据导入、复核流程、公式计算与报告生成</div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => triggerRefresh()}>刷新</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="导入批次"
              value={stats?.total_batches || 0}
              prefix={<DatabaseOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="题目记录"
              value={stats?.total_records || 0}
              prefix={<AuditOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="待处理记录"
              value={stats?.pending_records || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="已通过记录"
              value={stats?.passed_records || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="card-shadow" style={{ cursor: 'pointer' }} onClick={() => navigate('/assistant/formula')}>
            <Space align="start">
              <div style={{ fontSize: 32, color: '#722ed1' }}>
                <FileTextOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>公式计算</div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                  日常入口 - 可靠性寿命曲线计算
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-shadow" style={{ cursor: 'pointer' }} onClick={() => navigate('/assistant/review')}>
            <Space align="start">
              <div style={{ fontSize: 32, color: '#13c2c2' }}>
                <AuditOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>批量复核</div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                  月底/课前集中复核处理
                </div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="card-shadow">
            <Space align="start">
              <div style={{ fontSize: 32, color: '#ff4d4f' }}>
                <WarningOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>数据质量问题</div>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                  当前有 {stats?.records_with_issues || 0} 条记录需处理
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={<Title level={5} style={{ margin: 0 }}>最近导入批次</Title>}
            extra={<Button type="link" onClick={() => navigate('/assistant/batches')}>查看全部 <ArrowRightOutlined /></Button>}
          >
            <List
              dataSource={recentBatches}
              locale={{ emptyText: '暂无导入批次，请先导入数据' }}
              renderItem={(batch) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => navigate(`/assistant/batches/${batch.id}`)}>
                      查看详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{batch.batch_name}</span>
                        <Tag color={batch.status === 'imported' ? 'green' : 'default'}>
                          {batch.status === 'imported' ? '已导入' : batch.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space split={<Text type="secondary">|</Text>}>
                        <Text type="secondary">{batch.total_records} 条记录</Text>
                        <Text type="secondary">有效 {batch.valid_records}</Text>
                        <Text type="secondary">{dayjs(batch.imported_at).format('YYYY-MM-DD HH:mm')}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="card-shadow"
            title={<Title level={5} style={{ margin: 0 }}>最近复核会话</Title>}
            extra={<Button type="link" onClick={() => navigate('/assistant/review')}>查看全部 <ArrowRightOutlined /></Button>}
          >
            <List
              dataSource={recentSessions}
              locale={{ emptyText: '暂无复核会话' }}
              renderItem={(session) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => navigate(`/assistant/review/${session.id}`)}>
                      进入复核
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{session.session_name}</span>
                        <Tag color={
                          session.status === 'completed' ? 'green' :
                          session.status === 'in_progress' ? 'blue' : 'default'
                        }>
                          {session.status === 'completed' ? '已完成' :
                           session.status === 'in_progress' ? '进行中' : '未开始'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space split={<Text type="secondary">|</Text>}>
                        <Text type="secondary">{session.session_type === 'daily' ? '日常复核' : session.session_type === 'classroom' ? '课堂复核' : '批量复核'}</Text>
                        <Text type="secondary">已复核 {session.reviewed_items}/{session.total_items}</Text>
                        <Text type="secondary">{dayjs(session.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
