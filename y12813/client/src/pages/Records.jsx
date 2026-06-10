import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Table, Space, Tag, Input, Select, DatePicker, Button, Card, message } from 'antd'
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { recordsApi, batchesApi, locationsApi } from '../api'
import { StatusTag } from '../utils.jsx'

const { RangePicker } = DatePicker
const { Option } = Select

export default function Records() {
  const navigate = useNavigate()
  const loc = useLocation()
  const initStatus = loc.state?.status
  const initDuplicate = loc.state?.duplicate

  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [filters, setFilters] = useState({
    keyword: '',
    sample_status: initStatus || undefined,
    is_duplicate: initDuplicate !== undefined ? String(initDuplicate) : undefined,
    batch_id: undefined,
    location_id: undefined,
    dateRange: null,
  })
  const [batches, setBatches] = useState([])
  const [locations, setLocations] = useState([])

  useEffect(() => {
    batchesApi.list().then(r => setBatches(r.data))
    locationsApi.list().then(r => setLocations(r.data))
  }, [])

  useEffect(() => {
    loadData()
  }, [page, pageSize, filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (filters.keyword) params.keyword = filters.keyword
      if (filters.sample_status) params.sample_status = filters.sample_status
      if (filters.is_duplicate !== undefined && filters.is_duplicate !== '') params.is_duplicate = filters.is_duplicate
      if (filters.batch_id) params.batch_id = filters.batch_id
      if (filters.location_id) params.location_id = filters.location_id
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.dateFrom = filters.dateRange[0].format('YYYY-MM-DD')
        params.dateTo = filters.dateRange[1].format('YYYY-MM-DD')
      }
      const res = await recordsApi.list(params)
      setData(res.data)
      setTotal(res.total)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: '记录编号', dataIndex: 'record_no', width: 130, fixed: 'left',
      render: (t, r) => <a onClick={() => navigate(`/records/${r.id}`)}><b>{t}</b></a> },
    { title: '状态', dataIndex: 'sample_status', width: 90, render: (s, r) => (
      <Space direction="vertical" size={2}>
        <StatusTag status={s} />
        {r.is_duplicate ? <Tag color="purple" style={{ margin: 0 }}>重复导入</Tag> : null}
        {r.has_batch_effect ? <Tag color="magenta" icon={<ThunderboltOutlined />} style={{ margin: 0 }}>批次效应</Tag> : null}
      </Space>
    )},
    { title: '批次号', dataIndex: 'batch_no', width: 170,
      render: (t, r) => <Space><Tag color="blue">{t}</Tag><a onClick={() => navigate(`/batches/${r.batch_id}/trace`)}><ThunderboltOutlined />追溯</a></Space> },
    { title: '诱捕日期', dataIndex: 'trap_date', width: 110 },
    { title: '采样地点', dataIndex: 'location_name', width: 180,
      render: (t, r) => <div><div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.location_code}</div>{r.location_area}/{r.location_building}/{r.location_floor} {t}</div> },
    { title: '虫数', dataIndex: 'insect_count', width: 70, render: (t) => <b style={{ color: t > 0 ? '#cf1322' : '#389e0d' }}>{t}</b> },
    { title: '昆虫种类', dataIndex: 'insect_types', width: 140, render: t => t || '-' },
    { title: '质量评分', dataIndex: 'quality_score', width: 90,
      render: t => t !== null && t !== undefined ? <Tag color={t >= 80 ? 'green' : t >= 60 ? 'orange' : 'red'}>{t}分</Tag> : '-' },
    { title: '最终结论', dataIndex: 'conclusion', width: 220, ellipsis: true,
      render: (t, r) => t ? <a onClick={() => navigate(`/records/${r.id}`)} title={t}>{t}</a> : <span style={{ color: '#bfbfbf' }}>（点击人工修正添加结论）</span> },
    { title: '采集人', dataIndex: 'collected_by', width: 80 },
    { title: '复核人', dataIndex: 'reviewed_by', width: 80 },
    { title: '操作', key: 'act', width: 140, fixed: 'right',
      render: (_, r) => <Space>
        <Button type="primary" size="small" onClick={() => navigate(`/records/${r.id}`)}>人工修正</Button>
        {r.is_duplicate && r.duplicate_of_id ? <Button size="small" onClick={() => navigate(`/records/${r.duplicate_of_id}`)}>看原件</Button> : null}
      </Space> },
  ]

  return (
    <Card
      title="🐞 诱捕记录（日常入口：人工修正 & 复核意见）"
      extra={<Space>
        <Input allowClear prefix={<SearchOutlined />} placeholder="搜索记录号/批次/地点/结论"
          value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} style={{ width: 280 }} />
        <Select allowClear placeholder="状态" style={{ width: 120 }}
          value={filters.sample_status} onChange={v => setFilters({ ...filters, sample_status: v })}>
          <Option value="normal">正常</Option>
          <Option value="boundary">边界</Option>
          <Option value="bad">异常</Option>
          <Option value="pending">待复核</Option>
        </Select>
        <Select allowClear placeholder="重复导入" style={{ width: 120 }}
          value={filters.is_duplicate} onChange={v => setFilters({ ...filters, is_duplicate: v })}>
          <Option value="1">仅看重复</Option>
          <Option value="0">仅看非重复</Option>
        </Select>
        <Select allowClear placeholder="批次" showSearch optionFilterProp="label" style={{ width: 180 }}
          value={filters.batch_id} onChange={v => setFilters({ ...filters, batch_id: v })}>
          {batches.map(b => <Option key={b.id} value={b.id} label={b.batch_no}>{b.batch_no} ({b.trap_date})</Option>)}
        </Select>
        <Select allowClear placeholder="采样地点" showSearch optionFilterProp="label" style={{ width: 180 }}
          value={filters.location_id} onChange={v => setFilters({ ...filters, location_id: v })}>
          {locations.map(l => <Option key={l.id} value={l.id} label={l.code}>{l.code} - {l.name}</Option>)}
        </Select>
        <RangePicker value={filters.dateRange} onChange={v => setFilters({ ...filters, dateRange: v })} />
        <Button onClick={() => setFilters({ keyword: '', sample_status: undefined, is_duplicate: undefined, batch_id: undefined, location_id: undefined, dateRange: null })}>重置</Button>
      </Space>}
    >
      <Table
        size="middle" rowKey="id" loading={loading} columns={columns} dataSource={data}
        scroll={{ x: 1500 }}
        pagination={{
          current: page, pageSize, total, showSizeChanger: true,
          showQuickJumper: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) }
        }}
      />
    </Card>
  )
}
