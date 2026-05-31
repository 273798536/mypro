import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Card, Input, DatePicker, Tag, Space, Alert } from 'antd'
import { SearchOutlined, EditOutlined, AlertOutlined } from '@ant-design/icons'
import { deferralAPI } from '../api/client'
import dayjs from 'dayjs'

function HistoryPage() {
  const [keyword, setKeyword] = useState('')
  const [allCorrections, setAllCorrections] = useState([])
  const [loading, setLoading] = useState(true)

  const { data: calculations } = useQuery({
    queryKey: ['all-calculations-for-history'],
    queryFn: () => deferralAPI.list({ page: 1, pageSize: 1000 })
  })

  useEffect(() => {
    if (calculations?.data) {
      setLoading(true)
      const fetchAllHistory = async () => {
        const allHistory = []
        for (const calc of calculations.data.filter(c => c.is_manual_corrected)) {
          try {
            const history = await deferralAPI.getHistory(calc.id)
            history.forEach(h => {
              allHistory.push({
                ...h,
                contract_no: calc.contract_no,
                member_name: calc.member_name,
                calculation_month: calc.calculation_month
              })
            })
          } catch (e) {
            console.error(e)
          }
        }
        allHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setAllCorrections(allHistory)
        setLoading(false)
      }
      fetchAllHistory()
    }
  }, [calculations])

  const filteredData = allCorrections.filter(item => 
    !keyword || 
    item.contract_no?.includes(keyword) ||
    item.member_name?.includes(keyword)
  )

  const columns = [
    {
      title: '修正时间',
      dataIndex: 'created_at',
      width: 180,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '合同编号',
      dataIndex: 'contract_no',
      width: 140,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '会员姓名',
      dataIndex: 'member_name',
      width: 100
    },
    {
      title: '计算月份',
      dataIndex: 'calculation_month',
      width: 120,
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: '操作人',
      dataIndex: 'corrected_by',
      width: 100
    },
    {
      title: '递延金额变更',
      width: 200,
      render: (_, record) => {
        const diff = record.new_deferred_amount - record.old_deferred_amount
        return (
          <Space>
            <span style={{ textDecoration: 'line-through', color: '#999' }}>
              ¥{record.old_deferred_amount}
            </span>
            <span>→</span>
            <span style={{ fontWeight: 'bold' }}>¥{record.new_deferred_amount}</span>
            <Tag color={diff > 0 ? 'red' : 'green'}>
              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
            </Tag>
          </Space>
        )
      }
    },
    {
      title: '确认收入变更',
      width: 200,
      render: (_, record) => {
        const diff = record.new_recognized_amount - record.old_recognized_amount
        return (
          <Space>
            <span style={{ textDecoration: 'line-through', color: '#999' }}>
              ¥{record.old_recognized_amount}
            </span>
            <span>→</span>
            <span style={{ fontWeight: 'bold' }}>¥{record.new_recognized_amount}</span>
            <Tag color={diff > 0 ? 'green' : 'red'}>
              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
            </Tag>
          </Space>
        )
      }
    },
    {
      title: '修正原因',
      dataIndex: 'correction_reason',
      ellipsis: true
    }
  ]

  return (
    <div>
      <Alert
        message="人工修正追踪"
        description="此处记录所有递延计算的人工修正历史，用于审计和追溯。每次修正都会保留前后数据对比，确保口径可追溯。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <div style={{ marginBottom: 16 }}>
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
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条修正记录`
          }}
        />
      </Card>
    </div>
  )
}

export default HistoryPage
