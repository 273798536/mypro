import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Tooltip, message } from 'antd'
import {
  FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, CopyOutlined,
  BugOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import { dashboardApi, recordsApi } from '../api'
import { StatusTag, formatDate } from '../utils.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await dashboardApi.overview()
      setOverview(res.data)
    } catch (e) {
      message.error('加载看板数据失败: ' + (e.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const s = overview?.summary || {}

  const pendingColumns = [
    { title: '记录编号', dataIndex: 'record_no', render: (t, r) => <a onClick={() => navigate(`/records/${r.id}`)}>{t}</a> },
    { title: '批次号', dataIndex: 'batch_no', render: t => <Tag>{t}</Tag> },
    { title: '诱捕日期', dataIndex: 'trap_date' },
    { title: '采样地点', dataIndex: 'location_name', render: (t, r) => `${r.location_code} - ${t}` },
    { title: '虫数', dataIndex: 'insect_count', render: (t) => <b style={{ color: t > 0 ? '#cf1322' : 'inherit' }}>{t}</b> },
    { title: '操作', key: 'act', render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/records/${r.id}`)}>人工修正</Button> },
  ]

  const dupColumns = [
    { title: '记录编号', dataIndex: 'record_no', render: (t, r) => <a onClick={() => navigate(`/records/${r.id}`)}>{t}</a> },
    { title: '重复来源', dataIndex: 'duplicate_of_no', render: (t, r) => <Tooltip title="点击跳转至原始记录"><a onClick={() => navigate(`/records/${r.duplicate_of_id}`)}>↩ {t}</a></Tooltip> },
    { title: '批次号', dataIndex: 'batch_no', render: t => <Tag>{t}</Tag> },
    { title: '采样地点', dataIndex: 'location_name' },
  ]

  const batchColumns = [
    { title: '批次号', dataIndex: 'batch_no', render: (t, r) => (
      <Space>
        <a onClick={() => navigate(`/batches/${r.id}/trace`)}>{t}</a>
        {r.has_batch_effect ? <Tag color="purple" icon={<ThunderboltOutlined />}>批次效应</Tag> : null}
      </Space>
    )},
    { title: '诱捕日期', dataIndex: 'trap_date' },
    { title: '操作员', dataIndex: 'operator' },
    { title: '记录数', dataIndex: 'record_count' },
    { title: '待复核', dataIndex: 'pending_count', render: t => t > 0 ? <Tag color="default">{t} 条待复核</Tag> : '-' },
    { title: '重复导入', dataIndex: 'duplicate_count', render: t => t > 0 ? <Tag color="purple">{t} 条重复</Tag> : '-' },
    { title: '追溯', key: 'trace', render: (_, r) => <Button size="small" icon={<ThunderboltOutlined />} onClick={() => navigate(`/batches/${r.id}/trace`)}>倒查追溯</Button> },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => navigate('/records')} size="large">🐞 进入人工修正（日常入口）</Button>
        <Button onClick={() => navigate('/reports')} size="large">📊 报告导出（月底/课前）</Button>
        <Button onClick={loadData} loading={loading}>🔄 刷新数据</Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading}><Statistic title="总记录数" value={s.total_records} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading} className="stat-card-normal"><Statistic title="正常样本" value={s.normal_count} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading} className="stat-card-boundary"><Statistic title="边界样本" value={s.boundary_count} prefix={<ExclamationCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading} className="stat-card-bad"><Statistic title="异常样本" value={s.bad_count} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading} className="stat-card-pending"><Statistic title="待复核" value={s.pending_count} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card loading={loading} className="stat-card-duplicate">
            <Statistic title="重复导入标记" value={s.duplicate_count} prefix={<CopyOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={<span><BugOutlined /> 最近诱捕批次（含批次效应倒查入口）</span>} extra={<a onClick={() => navigate('/batches')}>全部批次 →</a>}>
            <Table size="small" rowKey="id" loading={loading} columns={batchColumns} dataSource={overview?.recentBatches || []} pagination={false} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#d48806' }}><ClockCircleOutlined /> 待复核样本（去人工修正）</span>} extra={<a onClick={() => navigate('/records', { state: { status: 'pending' } })}>全部待复核 →</a>}>
            <Table size="small" rowKey="id" loading={loading} columns={pendingColumns} dataSource={overview?.pendingRecords || []} pagination={false} locale={{ emptyText: '暂无待复核样本 🎉' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#722ed1' }}><CopyOutlined /> 重复导入记录（避免越跑越乱）</span>} extra={<a onClick={() => navigate('/records', { state: { duplicate: 1 } })}>全部重复 →</a>}>
            <Table size="small" rowKey="id" loading={loading} columns={dupColumns} dataSource={overview?.duplicateRecords || []} pagination={false} locale={{ emptyText: '暂无重复导入记录' }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
