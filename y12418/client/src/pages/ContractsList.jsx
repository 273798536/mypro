import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Input, Space, Tag, Button, Card, Row, Col, Statistic } from 'antd'
import { SearchOutlined, EyeOutlined, AlertOutlined } from '@ant-design/icons'
import { contractsAPI } from '../api/client'
import dayjs from 'dayjs'

function ContractsList({ onSelectContract }) {
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', pagination.current, pagination.pageSize, keyword],
    queryFn: () => contractsAPI.list({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword
    })
  })

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contract_no',
      width: 140,
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => onSelectContract(record.id)}
          icon={<EyeOutlined />}
        >
          {text}
        </Button>
      )
    },
    {
      title: '会员姓名',
      dataIndex: 'member_name',
      width: 100
    },
    {
      title: '会员类型',
      dataIndex: 'membership_type',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '合同期限',
      width: 220,
      render: (_, record) => (
        <span>
          {record.start_date} 至 {record.end_date}
        </span>
      )
    },
    {
      title: '合同总额',
      dataIndex: 'total_amount',
      width: 100,
      render: (val) => `¥${val.toLocaleString()}`
    },
    {
      title: '月均费用',
      dataIndex: 'monthly_fee',
      width: 100,
      render: (val) => `¥${val.toLocaleString()}`
    },
    {
      title: '关联记录',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag color="green">{record.entry_count}次入场</Tag>
          {record.freeze_count > 0 && (
            <Tag color="orange" icon={<AlertOutlined />}>
              {record.freeze_count}次冻结
            </Tag>
          )}
          {record.transfer_count > 0 && (
            <Tag color="purple">{record.transfer_count}次转让</Tag>
          )}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (text) => (
        <Tag color={text === 'active' ? 'success' : 'default'}>
          {text === 'active' ? '有效' : '已终止'}
        </Tag>
      )
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true
    }
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="有效合同数" 
              value={data?.data?.filter(c => c.status === 'active').length || 0} 
              suffix="份"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="本月递延总额" 
              value={0} 
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理差异" 
              value={0} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="冻结申请数" 
              value={0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="搜索合同编号或会员姓名"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => setKeyword(value)}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            ...pagination,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(p) => setPagination(p)}
        />
      </Card>
    </div>
  )
}

export default ContractsList
