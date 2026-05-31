import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Table, Card, Input, DatePicker, Button, Tag, Space, Modal, 
  Form, InputNumber, message, Alert, Drawer, Descriptions
} from 'antd'
import { 
  SearchOutlined, EditOutlined, HistoryOutlined,
  AlertOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons'
import { deferralAPI } from '../api/client'
import dayjs from 'dayjs'

function DeferralList() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [correctModal, setCorrectModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [historyDrawer, setHistoryDrawer] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['deferral-calculations', pagination.current, pagination.pageSize, month, keyword],
    queryFn: () => deferralAPI.list({
      page: pagination.current,
      pageSize: pagination.pageSize,
      month
    })
  })

  const { data: historyData } = useQuery({
    queryKey: ['deferral-history', selectedRecord?.id],
    queryFn: () => deferralAPI.getHistory(selectedRecord.id),
    enabled: !!selectedRecord?.id && historyDrawer
  })

  const correctMutation = useMutation({
    mutationFn: ({ id, data }) => deferralAPI.correct(id, data),
    onSuccess: () => {
      message.success('修正成功')
      setCorrectModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['deferral-calculations'])
    }
  })

  const columns = [
    {
      title: '月份',
      dataIndex: 'calculation_month',
      width: 120,
      fixed: 'left'
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
      title: '会员类型',
      dataIndex: 'membership_type',
      width: 120
    },
    {
      title: '规则版本',
      dataIndex: 'rule_version',
      width: 100,
      render: (v, r) => <Tag color="purple">{v || r.rule_name}</Tag>
    },
    {
      title: '确认收入',
      dataIndex: 'recognized_amount',
      width: 120,
      render: (v) => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>¥{v}</span>
    },
    {
      title: '递延金额',
      dataIndex: 'deferred_amount',
      width: 120,
      render: (v) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{v}</span>
    },
    {
      title: '影响因素',
      dataIndex: 'affected_by',
      width: 150,
      render: (types) => (
        <Space wrap>
          {types?.split(',').filter(Boolean).map((type, idx) => (
            <Tag 
              key={idx}
              color={
                type === 'freeze' ? 'orange' :
                type === 'makeup' ? 'blue' :
                type === 'transfer' ? 'purple' :
                type === 'makeup_withdrawn' ? 'red' : 'default'
              }
              size="small"
            >
              {type === 'freeze' ? '冻结' :
               type === 'makeup' ? '补课' :
               type === 'transfer' ? '转让' :
               type === 'makeup_withdrawn' ? '已撤回补课' : type}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '人工修正',
      dataIndex: 'is_manual_corrected',
      width: 100,
      render: (v) => v ? (
        <Tag color="purple" icon={<EditOutlined />}>已修正</Tag>
      ) : <Tag color="green">自动计算</Tag>
    },
    {
      title: '含已撤回补课',
      dataIndex: 'has_withdrawn_makeup',
      width: 130,
      render: (v) => v ? (
        <Tag color="red" icon={<CloseCircleOutlined />}>是</Tag>
      ) : <Tag color="green">否</Tag>
    },
    {
      title: '计算逻辑',
      dataIndex: 'calculation_logic',
      ellipsis: true
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedRecord(record)
              form.setFieldsValue({
                newDeferredAmount: record.deferred_amount,
                newRecognizedAmount: record.recognized_amount
              })
              setCorrectModal(true)
            }}
          >
            修正
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => {
              setSelectedRecord(record)
              setHistoryDrawer(true)
            }}
          >
            历史
          </Button>
        </Space>
      )
    }
  ]

  const historyColumns = [
    { title: '修正时间', dataIndex: 'created_at', width: 180 },
    { title: '操作人', dataIndex: 'corrected_by', width: 100 },
    { 
      title: '原递延金额', 
      dataIndex: 'old_deferred_amount', 
      width: 120,
      render: (v) => `¥${v}`
    },
    { 
      title: '新递延金额', 
      dataIndex: 'new_deferred_amount', 
      width: 120,
      render: (v) => `¥${v}`
    },
    { 
      title: '原确认收入', 
      dataIndex: 'old_recognized_amount', 
      width: 120,
      render: (v) => `¥${v}`
    },
    { 
      title: '新确认收入', 
      dataIndex: 'new_recognized_amount', 
      width: 120,
      render: (v) => `¥${v}`
    },
    { title: '修正原因', dataIndex: 'correction_reason', ellipsis: true }
  ]

  return (
    <div>
      {data?.data?.some(d => d.has_withdrawn_makeup) && (
        <Alert
          message="存在含已撤回补课的计算记录"
          description="以下记录的递延计算包含已撤回的补课单，请确认是否需要重新计算或人工修正"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <DatePicker.MonthPicker 
            value={dayjs(month)}
            onChange={(date) => setMonth(date?.format('YYYY-MM'))}
            style={{ width: 200 }}
          />
          <Input.Search
            placeholder="搜索合同编号"
            allowClear
            style={{ width: 200 }}
            onSearch={(value) => setKeyword(value)}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1400 }}
          rowClassName={(record) => {
            if (record.is_manual_corrected) return 'corrected-row'
            if (record.has_withdrawn_makeup) return 'warning-row'
            return ''
          }}
          pagination={{
            ...pagination,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(p) => setPagination(p)}
        />
      </Card>

      <Modal
        title="人工修正递延计算"
        open={correctModal}
        width={600}
        onCancel={() => setCorrectModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            correctMutation.mutate({
              id: selectedRecord.id,
              data: {
                newDeferredAmount: values.newDeferredAmount,
                newRecognizedAmount: values.newRecognizedAmount,
                correctionReason: values.correctionReason,
                correctedBy: 'admin'
              }
            })
          })
        }}
      >
        <Descriptions column={1} bordered style={{ marginBottom: 16 }} size="small">
          <Descriptions.Item label="合同编号">{selectedRecord?.contract_no}</Descriptions.Item>
          <Descriptions.Item label="计算月份">{selectedRecord?.calculation_month}</Descriptions.Item>
          <Descriptions.Item label="原递延金额">¥{selectedRecord?.deferred_amount}</Descriptions.Item>
          <Descriptions.Item label="原确认收入">¥{selectedRecord?.recognized_amount}</Descriptions.Item>
          <Descriptions.Item label="计算逻辑">{selectedRecord?.calculation_logic}</Descriptions.Item>
        </Descriptions>

        <Form form={form} layout="vertical">
          <Form.Item 
            name="newDeferredAmount" 
            label="新递延金额" 
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item 
            name="newRecognizedAmount" 
            label="新确认收入" 
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item 
            name="correctionReason" 
            label="修正原因" 
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} placeholder="请输入修正原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="修正历史"
        width={900}
        open={historyDrawer}
        onClose={() => setHistoryDrawer(false)}
      >
        <Descriptions column={2} bordered style={{ marginBottom: 16 }} size="small">
          <Descriptions.Item label="合同编号">{selectedRecord?.contract_no}</Descriptions.Item>
          <Descriptions.Item label="计算月份">{selectedRecord?.calculation_month}</Descriptions.Item>
          <Descriptions.Item label="当前递延金额">¥{selectedRecord?.deferred_amount}</Descriptions.Item>
          <Descriptions.Item label="当前确认收入">¥{selectedRecord?.recognized_amount}</Descriptions.Item>
        </Descriptions>

        <Table
          columns={historyColumns}
          dataSource={historyData || []}
          rowKey="id"
          pagination={false}
        />
      </Drawer>
    </div>
  )
}

export default DeferralList
