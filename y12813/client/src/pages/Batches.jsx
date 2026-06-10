import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Card, Tag, Space, Button, Input, DatePicker, Select, message, Alert } from 'antd'
import { ThunderboltOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { batchesApi } from '../api'
import { StatusTag } from '../utils.jsx'
const { RangePicker } = DatePicker
const { Option } = Select

export default function Batches() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ keyword: '', dateRange: null, hasBatchEffect: undefined })

  useEffect(() => { loadData() }, [filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.keyword) params.keyword = filters.keyword
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.dateFrom = filters.dateRange[0].format('YYYY-MM-DD')
        params.dateTo = filters.dateRange[1].format('YYYY-MM-DD')
      }
      if (filters.hasBatchEffect !== undefined) params.hasBatchEffect = filters.hasBatchEffect
      const res = await batchesApi.list(params)
      setData(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  const columns = [
    { title: '批次号', dataIndex: 'batch_no', width: 200,
      render: (t, r) => <Space>
        <a onClick={() => navigate(`/batches/${r.id}/trace`)} style={{ fontWeight: 600 }}>{t}</a>
        {r.has_batch_effect ? <Tag color="purple" icon={<ThunderboltOutlined />}>批次效应</Tag> : null}
      </Space> },
    { title: '诱捕日期', dataIndex: 'trap_date', width: 120 },
    { title: '操作员', dataIndex: 'operator', width: 100 },
    { title: '诱捕类型', dataIndex: 'trap_type', width: 100 },
    { title: '天气/温湿度', dataIndex: 'weather', width: 180,
      render: (_, r) => <div>{r.weather} {r.temperature}℃ {r.humidity ? `湿度${r.humidity}%` : ''}</div> },
    { title: '记录数', dataIndex: 'record_count', width: 90, render: t => <b>{t}</b> },
    { title: '样本分布', key: 'dist', width: 280,
      render: (_, r) => <Space size={4}>
        <StatusTag status="normal" />{r.normal_count || 0}
        <StatusTag status="boundary" />{r.boundary_count || 0}
        <StatusTag status="bad" />{r.bad_count || 0}
        <StatusTag status="pending" />{r.pending_count || 0}
      </Space> },
    { title: '批次效应说明', dataIndex: 'batch_effect_note', ellipsis: true, render: t => t || '-' },
    { title: '操作', key: 'act', width: 180, fixed: 'right',
      render: (_, r) => <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/batches/${r.id}/trace`)}>查看追溯</Button>
      </Space> },
  ]

  return (
    <Card
      title={<span><ThunderboltOutlined /> 诱捕批次（验收：拿批次效应记录倒查）</span>}
      extra={<Space>
        <Input allowClear prefix={<SearchOutlined />} placeholder="搜索批次号/操作员"
          value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} style={{ width: 240 }} />
        <Select allowClear placeholder="批次效应" style={{ width: 140 }}
          value={filters.hasBatchEffect} onChange={v => setFilters({ ...filters, hasBatchEffect: v })}>
          <Option value={1}>仅看有批次效应</Option>
          <Option value={0}>仅看无批次效应</Option>
        </Select>
        <RangePicker value={filters.dateRange} onChange={v => setFilters({ ...filters, dateRange: v })} />
        <Button onClick={() => setFilters({ keyword: '', dateRange: null, hasBatchEffect: undefined })}>重置</Button>
      </Space>}
    >
      <Alert
        style={{ marginBottom: 16 }} type="info" showIcon
        message="验收提示：找一行标记了「批次效应」的批次，点击「查看追溯」，工具要能从结果一路回到来源和处理记录。"
      />
      <Table size="middle" rowKey="id" loading={loading} columns={columns} dataSource={data} scroll={{ x: 1300 }} />
    </Card>
  )
}
