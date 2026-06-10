import React, { useEffect, useState } from 'react'
import { Table, Card, Tag, Space, Button, Input, message, Alert } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { locationsApi } from '../api'

export default function Locations() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  useEffect(() => { loadData() }, [keyword])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await locationsApi.list({ keyword })
      setData(res.data)
    } catch (e) {
      message.error('加载失败: ' + (e.error || e.message))
    } finally { setLoading(false) }
  }

  const columns = [
    { title: '地点编号', dataIndex: 'code', width: 120, render: t => <Tag color="blue">{t}</Tag> },
    { title: '名称', dataIndex: 'name', width: 200, render: t => <b>{t}</b> },
    { title: '区域', dataIndex: 'area', width: 100 },
    { title: '楼栋', dataIndex: 'building', width: 100 },
    { title: '楼层', dataIndex: 'floor', width: 80 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
  ]

  return (
    <Card
      title="📍 采样地点（不用反复查了，看板里都有）"
      extra={<Space>
        <Input allowClear prefix={<SearchOutlined />} placeholder="搜索编号/名称/说明"
          value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} />
      </Space>}
    >
      <Alert style={{ marginBottom: 16 }} type="info" showIcon
        message="动物房管理员最想省掉的一步：反复查采样地点。这里已内置所有地点的完整信息。" />
      <Table size="middle" rowKey="id" loading={loading} columns={columns} dataSource={data} />
    </Card>
  )
}
