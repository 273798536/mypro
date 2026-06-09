import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Tag, Button, Space, Timeline, Statistic, Empty,
  Collapse, Progress, Tooltip, Descriptions
} from 'antd'
import {
  ReloadOutlined, HistoryOutlined, DatabaseOutlined, AuditOutlined,
  FileTextOutlined, CheckCircleOutlined, WarningOutlined, DiffOutlined
} from '@ant-design/icons'
import { systemApi } from '../../services/api'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Panel } = Collapse

export default function SystemTraces() {
  const [traces, setTraces] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      systemApi.traces({ limit: 20 }),
      systemApi.stats()
    ]).then(([t, s]) => {
      setTraces(t.traces || [])
      setStats(s)
    }).finally(() => setLoading(false))
  }

  const renderTimeline = (trace: any) => {
    const items: any[] = []

    if (trace.batch) {
      items.push({
        color: 'blue',
        children: (
          <div>
            <Space>
              <DatabaseOutlined />
              <Tag color="blue">导入批次</Tag>
              <Text strong>{trace.batch.name}</Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(trace.batch.imported_at).format('YYYY-MM-DD HH:mm')} · {trace.batch.total_records} 条记录
              </Text>
            </div>
          </div>
        )
      })
    }

    trace.review_sessions?.forEach((s: any) => {
      items.push({
        color: s.status === 'completed' ? 'green' : s.status === 'in_progress' ? 'blue' : 'gray',
        children: (
          <div>
            <Space>
              <AuditOutlined />
              <Tag color={s.status === 'completed' ? 'green' : s.status === 'in_progress' ? 'processing' : 'default'}>
                {s.status === 'completed' ? '复核完成' : s.status === 'in_progress' ? '复核进行中' : '复核未开始'}
              </Tag>
              <Text strong>{s.name}</Text>
              <Tag>{s.type === 'daily' ? '日常' : s.type === 'classroom' ? '课堂' : '批量'}</Tag>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Progress size="small" percent={s.total_items > 0 ? Math.round(s.reviewed_items / s.total_items * 100) : 0} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(s.created_at).format('YYYY-MM-DD HH:mm')} · 复核进度 {s.reviewed_items}/{s.total_items}
              </Text>
            </div>
          </div>
        )
      })
    })

    trace.reports?.forEach((r: any) => {
      items.push({
        color: 'purple',
        children: (
          <div>
            <Space>
              <FileTextOutlined />
              <Tag color="purple">报告生成</Tag>
              <Text strong>#{r.id}</Text>
              <Tag color={r.type === 'student' ? 'blue' : 'default'}>
                {r.type === 'student' ? '学生报告' : '内部报告'}
              </Tag>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(r.generated_at).format('YYYY-MM-DD HH:mm')}
              </Text>
            </div>
          </div>
        )
      })
    })

    if (trace.records_summary) {
      items.push({
        color: trace.records_summary.with_issues > 0 ? 'orange' : 'green',
        children: (
          <div>
            <Space>
              {trace.records_summary.with_issues > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              <Tag color={trace.records_summary.with_issues > 0 ? 'orange' : 'green'}>记录状态</Tag>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Row gutter={8}>
                <Col span={4}><Tag>共 {trace.records_summary.total}</Tag></Col>
                <Col span={4}><Tag color="default">待 {trace.records_summary.pending}</Tag></Col>
                <Col span={4}><Tag color="processing">复核 {trace.records_summary.reviewing || 0}</Tag></Col>
                <Col span={4}><Tag color="success">通过 {trace.records_summary.passed}</Tag></Col>
                <Col span={4}><Tag color="error">驳回 {trace.records_summary.rejected}</Tag></Col>
                <Col span={4}><Tag color="warning">问题 {trace.records_summary.with_issues}</Tag></Col>
              </Row>
            </div>
            {trace.corrections_count > 0 && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <DiffOutlined /> 人工修正 {trace.corrections_count} 次，均已留痕可追溯
                </Text>
              </div>
            )}
          </div>
        )
      })
    }

    return items
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">处理痕迹追踪</div>
        <div className="page-description">
          重启服务后仍可追溯完整的导入-复核-报告流程。确保同一件事不会出现两份结论
        </div>
      </div>

      <Alert
        message="持久性验证"
        description="所有操作痕迹均持久化存储于 SQLite 数据库，重启服务后仍可查询上一轮处理痕迹。人工修正、状态转换、复核判定均留痕可追溯。"
        type="success"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="批次总数" value={stats?.total_batches || 0} prefix={<DatabaseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="记录总数" value={stats?.total_records || 0} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="复核会话" value={stats?.total_sessions || 0} prefix={<AuditOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="报告数量" value={stats?.total_reports || 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
      </Row>

      <Card
        className="card-shadow"
        title={
          <Space>
            <HistoryOutlined />
            <Title level={5} style={{ margin: 0 }}>完整处理流程痕迹</Title>
          </Space>
        }
        extra={<Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>}
      >
        {traces.length === 0 ? (
          <Empty description="暂无处理痕迹，系统首次启动时已自动加载示例数据" />
        ) : (
          <Collapse defaultActiveKey={[String(traces[0]?.batch?.id)]} accordion>
            {traces.map((trace, idx) => (
              <Panel
                key={String(trace.batch?.id || idx)}
                header={
                  <Space>
                    <Text strong>{trace.batch?.name || `批次 #${trace.batch?.id}`}</Text>
                    <Tag>{trace.batch?.status}</Tag>
                    <Tag color="blue">{trace.records_summary?.total || 0} 条</Tag>
                    {trace.records_summary?.with_issues > 0 && (
                      <Tooltip title={`有 ${trace.records_summary.with_issues} 条问题记录`}>
                        <Tag color="orange"><WarningOutlined /> {trace.records_summary.with_issues} 问题</Tag>
                      </Tooltip>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(trace.batch?.imported_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                }
              >
                <div className="trace-timeline">
                  <Timeline mode="left" items={renderTimeline(trace)} />
                </div>
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>
    </div>
  )
}

import { Alert } from 'antd'
