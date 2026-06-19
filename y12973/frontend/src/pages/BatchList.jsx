import React, { useState, useEffect } from 'react'
import { Table, Tag, Space, Input, Select, Button, Form, Card, Tooltip, Empty } from 'antd'
import { SearchOutlined, ReloadOutlined, FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { listBatches } from '../api.js'
import { ENTRY_POINT_LABELS } from '../App.jsx'

const { Option } = Select

export default function BatchList({ onOpen, onRefresh, filterEntry }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [params, setParams] = useState({})
  const [form] = Form.useForm()

  useEffect(() => {
    if (filterEntry) {
      form.setFieldsValue({ entry_point: filterEntry })
      setParams(p => ({ ...p, entry_point: filterEntry }))
    }
  }, [filterEntry])

  useEffect(() => {
    load()
  }, [params])

  const load = () => {
    setLoading(true)
    listBatches(params).then(setData).finally(() => {
      setLoading(false)
      if (onRefresh) onRefresh()
    })
  }

  const handleSearch = () => {
    setParams(form.getFieldsValue())
  }

  const handleReset = () => {
    form.resetFields()
    if (filterEntry) form.setFieldsValue({ entry_point: filterEntry })
    setParams(filterEntry ? { entry_point: filterEntry } : {})
  }

  const columns = [
    {
      title: '批次号', dataIndex: 'batch_no', key: 'batch_no', width: 210,
      render: (v, r) => (
        <a onClick={() => onOpen(r.id)}>
          <Space><FileTextOutlined />{v}</Space>
        </a>
      ),
    },
    { title: '导入时间', dataIndex: 'import_time', key: 'import_time', width: 170 },
    { title: '导入人', dataIndex: 'import_user', key: 'import_user', width: 110 },
    { title: '数据来源', dataIndex: 'source', key: 'source', width: 120 },
    {
      title: '入口', dataIndex: 'entry_point', key: 'entry_point', width: 150,
      render: (v) => {
        const ep = ENTRY_POINT_LABELS[v]
        if (!ep) return v
        return <Tag color={ep.color}><span>{ep.icon}</span> {ep.label}</Tag>
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v) => v === 'active' ? <Tag color="green">活跃</Tag> : <Tag color="default">{v}</Tag>,
    },
    {
      title: '数据哈希', dataIndex: 'data_hash', key: 'data_hash', ellipsis: true,
      render: (v) => <Tooltip title={v}><code style={{ color: '#666', fontSize: 12 }}>{v?.slice(0, 22)}…</code></Tooltip>,
    },
    { title: '表数量', dataIndex: 'table_count', key: 'table_count', width: 80, align: 'center' },
    {
      title: '结论数', dataIndex: 'conclusion_count', key: 'conclusion_count', width: 100, align: 'center',
      render: (v) => v > 0 ? <Tag color="green">{v} 条</Tag> : <Tag color="orange">待复核</Tag>,
    },
    {
      title: '操作', key: 'op', width: 100, align: 'right', fixed: 'right',
      render: (_, r) => <Button type="link" onClick={() => onOpen(r.id)}>详情 <ArrowRightOutlined /></Button>,
    },
  ]

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card bordered={false} size="small">
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword">
            <Input allowClear placeholder="搜索批次号/哈希" prefix={<SearchOutlined />} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="entry_point" label="入口">
            <Select allowClear placeholder="全部" style={{ width: 180 }}>
              {Object.entries(ENTRY_POINT_LABELS).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select allowClear placeholder="全部" style={{ width: 130 }}>
              <Option value="active">活跃</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={load} />
          </Space>
        </Form>
      </Card>

      <Card bordered={false}>
        {data?.length ? (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 批` }}
            scroll={{ x: 1200 }}
          />
        ) : <Empty description={loading ? '加载中...' : '暂无批次数据'} />}
      </Card>
    </Space>
  )
}
