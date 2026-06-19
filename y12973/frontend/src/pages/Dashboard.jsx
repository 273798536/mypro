import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, Tooltip, Empty, Spin } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { getDashboardStats, listBatches } from '../api.js'
import { ENTRY_POINT_LABELS } from '../App.jsx'

const { Title, Text } = Typography

export default function Dashboard({ onOpenBatch, onRefresh }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = () => {
    setLoading(true)
    getDashboardStats()
      .then(setStats)
      .finally(() => {
        setLoading(false)
        if (onRefresh) onRefresh()
      })
  }

  if (loading && !stats) return <Spin tip="加载中..." size="large" style={{ display: 'block', margin: '100px auto' }} />

  const typePieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: stats?.by_type?.length ? stats.by_type.map((t, i) => ({
        name: t.conclusion_type, value: t.cnt,
        itemStyle: { color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'][i % 6] },
      })) : [{ name: '暂无数据', value: 1, itemStyle: { color: '#eee' } }],
    }],
  }

  const entryBarOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats?.by_entry_point?.length ? stats.by_entry_point.map(e =>
        ENTRY_POINT_LABELS[e.entry_point]?.label || e.entry_point
      ) : ['暂无数据'],
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      barWidth: 36,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: '#1890ff' },
      data: stats?.by_entry_point?.length ? stats.by_entry_point.map(e => e.cnt) : [0],
      label: { show: true, position: 'top' },
    }],
  }

  const recentColumns = [
    {
      title: '批次号', dataIndex: 'batch_no', key: 'batch_no',
      render: (v, r) => (
        <a onClick={() => onOpenBatch(r.id)}>
          <Space><FileTextOutlined />{v}</Space>
        </a>
      ),
    },
    { title: '导入时间', dataIndex: 'import_time', key: 'import_time', width: 170 },
    { title: '导入人', dataIndex: 'import_user', key: 'import_user', width: 110 },
    {
      title: '入口', dataIndex: 'entry_point', key: 'entry_point', width: 150,
      render: (v) => {
        const ep = ENTRY_POINT_LABELS[v]
        if (!ep) return v
        return <Tag color={ep.color}><span>{ep.icon}</span> {ep.label}</Tag>
      },
    },
    { title: '表数量', dataIndex: 'table_count', key: 'table_count', width: 80, align: 'center' },
    {
      title: '结论', dataIndex: 'conclusion_count', key: 'conclusion_count', width: 120, align: 'center',
      render: (v) => v > 0 ? (
        <Tag color="green"><CheckCircleOutlined /> {v} 条</Tag>
      ) : <Tag color="orange"><ClockCircleOutlined /> 待复核</Tag>,
    },
    {
      title: '操作', key: 'op', width: 100, align: 'right',
      render: (_, r) => (
        <Button type="link" onClick={() => onOpenBatch(r.id)}>
          详情 <ArrowRightOutlined />
        </Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>总览看板</Title>
          <Text type="secondary">图表、明细与下载数据均来自同一批 snapshot_batch 数据，确保口径一致</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="总批次数"
              value={stats?.total_batches || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="待复核批次"
              value={stats?.unreviewed_batches || 0}
              valueStyle={{ color: stats?.unreviewed_batches > 0 ? '#fa8c16' : '#52c41a' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="已复核批次"
              value={stats?.concluded_batches || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="活跃批次数"
              value={stats?.active_batches || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="复核结论类型分布" bordered={false} extra={<Tag color="blue">结论数据</Tag>}>
            <ReactECharts option={typePieOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按入口批次分布" bordered={false} extra={<Tag color="purple">slow_query = 日常</Tag>}>
            <ReactECharts option={entryBarOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="最近批次"
        bordered={false}
        extra={<Text type="secondary">点击批次号查看详情，与下载导出共享同一数据批</Text>}
      >
        {stats?.recent_batches?.length ? (
          <Table
            columns={recentColumns}
            dataSource={stats.recent_batches}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : <Empty description="暂无批次数据，请先导入" />}
      </Card>
    </Space>
  )
}
