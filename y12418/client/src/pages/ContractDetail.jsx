import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Card, Button, Descriptions, Tabs, Table, Tag, Space, 
  Modal, Form, Input, DatePicker, InputNumber, message,
  Alert, Divider, Row, Col, Statistic, Popconfirm
} from 'antd'
import { 
  ArrowLeftOutlined, EditOutlined, PlusOutlined, 
  DeleteOutlined, RollbackOutlined, AlertOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons'
import { contractsAPI, deferralAPI, recordsAPI } from '../api/client'
import dayjs from 'dayjs'

function ContractDetail({ contractId, onBack }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editRemarkModal, setEditRemarkModal] = useState(false)
  const [addEntryModal, setAddEntryModal] = useState(false)
  const [addFreezeModal, setAddFreezeModal] = useState(false)
  const [addMakeupModal, setAddMakeupModal] = useState(false)
  const [addTransferModal, setAddTransferModal] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractsAPI.get(contractId)
  })

  const { data: overview } = useQuery({
    queryKey: ['deferral-overview', contractId],
    queryFn: () => deferralAPI.getOverview(contractId),
    enabled: !!contractId
  })

  const correctMutation = useMutation({
    mutationFn: ({ id, data }) => deferralAPI.correct(id, data),
    onSuccess: () => {
      message.success('修正成功')
      queryClient.invalidateQueries(['deferral-overview', contractId])
    }
  })

  const withdrawMakeupMutation = useMutation({
    mutationFn: (id) => recordsAPI.withdrawMakeup(id),
    onSuccess: () => {
      message.success('补课单已撤回')
      queryClient.invalidateQueries(['contract', contractId])
      queryClient.invalidateQueries(['deferral-overview', contractId])
    }
  })

  const updateRemarkMutation = useMutation({
    mutationFn: (remark) => contractsAPI.updateRemark(contractId, remark),
    onSuccess: () => {
      message.success('备注已更新')
      setEditRemarkModal(false)
      queryClient.invalidateQueries(['contract', contractId])
    }
  })

  const addEntryMutation = useMutation({
    mutationFn: (data) => recordsAPI.addEntry(data),
    onSuccess: () => {
      message.success('入场记录已添加')
      setAddEntryModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['contract', contractId])
    }
  })

  const addFreezeMutation = useMutation({
    mutationFn: (data) => recordsAPI.addFreeze(data),
    onSuccess: () => {
      message.success('冻结申请已添加')
      setAddFreezeModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['contract', contractId])
    }
  })

  const addMakeupMutation = useMutation({
    mutationFn: (data) => recordsAPI.addMakeup(data),
    onSuccess: () => {
      message.success('补课单已添加')
      setAddMakeupModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['contract', contractId])
    }
  })

  const addTransferMutation = useMutation({
    mutationFn: (data) => recordsAPI.addTransfer(data),
    onSuccess: () => {
      message.success('转让记录已添加')
      setAddTransferModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['contract', contractId])
    }
  })

  const deferralColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      width: 120
    },
    {
      title: '基础天数',
      dataIndex: 'baseDays',
      width: 100
    },
    {
      title: '冻结天数',
      dataIndex: 'freezeDays',
      width: 100,
      render: (val) => val > 0 ? <Tag color="orange">{val}天</Tag> : '-'
    },
    {
      title: '实际服务天数',
      dataIndex: 'actualDays',
      width: 120
    },
    {
      title: '确认收入',
      dataIndex: 'recognized',
      width: 120,
      render: (val) => <span style={{ color: '#3f8600', fontWeight: 'bold' }}>¥{val}</span>
    },
    {
      title: '递延金额',
      dataIndex: 'deferred',
      width: 120,
      render: (val) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{val}</span>
    },
    {
      title: '影响因素',
      dataIndex: 'affectedBy',
      render: (items) => (
        <Space wrap>
          {items?.map((item, idx) => (
            <Tag 
              key={idx}
              color={
                item.type === 'freeze' ? 'orange' :
                item.type === 'makeup' ? 'blue' :
                item.type === 'transfer' ? 'purple' :
                item.type === 'makeup_withdrawn' ? 'red' : 'default'
              }
            >
              {item.type === 'freeze' ? '冻结' :
               item.type === 'makeup' ? '补课' :
               item.type === 'transfer' ? '转让' :
               item.type === 'makeup_withdrawn' ? '已撤回补课' : item.type}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '差异',
      dataIndex: 'discrepancy',
      width: 120,
      render: (disc) => disc && !disc.hasDiscrepancy !== false ? (
        <Space>
          <Tag color="red" icon={<AlertOutlined />}>
            ¥{disc.differenceAmount}
          </Tag>
        </Space>
      ) : <Tag color="green" icon={<CheckCircleOutlined />}>正常</Tag>
    },
    {
      title: '已撤回标记',
      dataIndex: 'hasWithdrawnMakeup',
      width: 120,
      render: (val) => val ? (
        <Tag color="red" icon={<CloseCircleOutlined />}>
          含已撤回补课
        </Tag>
      ) : null
    },
    {
      title: '计算逻辑',
      dataIndex: 'logic',
      ellipsis: true
    }
  ]

  const entryColumns = [
    { title: '入场日期', dataIndex: 'entry_date', width: 120 },
    { title: '类型', dataIndex: 'entry_type', width: 100, render: (t) => t === 'normal' ? '正常' : t },
    { title: '场馆', dataIndex: 'venue' },
    { title: '教练', dataIndex: 'coach' }
  ]

  const freezeColumns = [
    { title: '冻结开始', dataIndex: 'freeze_start_date', width: 120 },
    { title: '冻结结束', dataIndex: 'freeze_end_date', width: 120 },
    { title: '天数', dataIndex: 'freeze_days', width: 80 },
    { title: '原因', dataIndex: 'freeze_reason' },
    { 
      title: '跨月', 
      dataIndex: 'is_cross_month', 
      width: 80,
      render: (val) => val ? <Tag color="orange">是</Tag> : <Tag>否</Tag>
    },
    { title: '状态', dataIndex: 'status', width: 80, render: (s) => s === 'approved' ? '已批准' : s }
  ]

  const makeupColumns = [
    { title: '原定日期', dataIndex: 'lesson_date', width: 120 },
    { title: '补课日期', dataIndex: 'makeup_date', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (s) => 
      s === 'completed' ? <Tag color="green">已完成</Tag> :
      s === 'pending' ? <Tag color="blue">待补课</Tag> :
      s === 'withdrawn' ? <Tag color="red">已撤回</Tag> : s
    },
    { title: '是否撤回', dataIndex: 'is_withdrawn', width: 100, render: (v) => 
      v ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>
    },
    { title: '撤回时间', dataIndex: 'withdrawn_at', width: 180 },
    { title: '备注', dataIndex: 'remark' },
    {
      title: '操作',
      width: 120,
      render: (_, record) => !record.is_withdrawn && (
        <Popconfirm
          title="确定要撤回这个补课单吗？"
          description="撤回后将影响相关月份的递延计算"
          onConfirm={() => withdrawMakeupMutation.mutate(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<RollbackOutlined />}>
            撤回
          </Button>
        </Popconfirm>
      )
    }
  ]

  const transferColumns = [
    { title: '转让日期', dataIndex: 'transfer_date', width: 120 },
    { title: '转出方', dataIndex: 'from_member', width: 100 },
    { title: '转入方', dataIndex: 'to_member', width: 100 },
    { title: '转让费', dataIndex: 'transfer_fee', width: 100, render: (v) => `¥${v}` },
    { 
      title: '追溯调整', 
      dataIndex: 'is_retroactive', 
      width: 100,
      render: (v) => v ? <Tag color="purple">是</Tag> : <Tag>否</Tag>
    },
    { title: '追溯月份', dataIndex: 'retroactive_month', width: 120 },
    { title: '备注', dataIndex: 'remark' }
  ]

  const tabItems = [
    {
      key: 'overview',
      label: '递延概览',
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="合同总额" 
                  value={contract?.total_amount || 0} 
                  prefix="¥"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="累计确认收入" 
                  value={overview?.months?.reduce((sum, m) => sum + m.recognized, 0) || 0} 
                  prefix="¥"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="累计递延金额" 
                  value={overview?.months?.reduce((sum, m) => sum + m.deferred, 0) || 0} 
                  prefix="¥"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic 
                  title="差异月份数" 
                  value={overview?.months?.filter(m => m.discrepancy && !m.discrepancy.hasDiscrepancy === false).length || 0} 
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          {overview?.months?.some(m => m.hasWithdrawnMakeup) && (
            <Alert
              message="存在已撤回的补课单"
              description="部分月份的递延计算包含已撤回的补课单，请检查相关计算是否需要重新调整"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Table
            columns={deferralColumns}
            dataSource={overview?.months || []}
            rowKey="month"
            pagination={false}
            rowClassName={(record) => {
              if (record.hasWithdrawnMakeup) return 'warning-row'
              if (record.discrepancy && !record.discrepancy.hasDiscrepancy === false) return 'warning-row'
              return ''
            }}
          />
        </div>
      )
    },
    {
      key: 'entries',
      label: '入场记录',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddEntryModal(true)}>
              添加入场记录
            </Button>
          </div>
          <Table
            columns={entryColumns}
            dataSource={contract?.entries || []}
            rowKey="id"
          />
        </div>
      )
    },
    {
      key: 'freezes',
      label: '冻结申请',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddFreezeModal(true)}>
              添加冻结申请
            </Button>
          </div>
          {contract?.freezes?.some(f => f.is_cross_month) && (
            <Alert
              message="存在跨月冻结"
              description="跨月冻结会按实际冻结天数在各月份分摊，请确保各月递延计算口径一致"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Table
            columns={freezeColumns}
            dataSource={contract?.freezes || []}
            rowKey="id"
          />
        </div>
      )
    },
    {
      key: 'makeups',
      label: '补课单',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddMakeupModal(true)}>
              添加补课单
            </Button>
          </div>
          <Table
            columns={makeupColumns}
            dataSource={contract?.makeups || []}
            rowKey="id"
          />
        </div>
      )
    },
    {
      key: 'transfers',
      label: '转让记录',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddTransferModal(true)}>
              添加转让记录
            </Button>
          </div>
          {contract?.transfers?.some(t => t.is_retroactive) && (
            <Alert
              message="存在追溯转让"
              description="追溯调整的转让记录会影响历史月份的递延计算，请确保口径一致"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Table
            columns={transferColumns}
            dataSource={contract?.transfers || []}
            rowKey="id"
          />
        </div>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回列表
        </Button>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditRemarkModal(true)}>
            编辑备注
          </Button>
        </Space>
      </div>

      <Card loading={isLoading} style={{ marginBottom: 16 }}>
        <Descriptions title="合同信息" bordered>
          <Descriptions.Item label="合同编号">{contract?.contract_no}</Descriptions.Item>
          <Descriptions.Item label="会员姓名">{contract?.member_name}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{contract?.member_phone}</Descriptions.Item>
          <Descriptions.Item label="会员类型">
            <Tag color="blue">{contract?.membership_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="合同开始">{contract?.start_date}</Descriptions.Item>
          <Descriptions.Item label="合同结束">{contract?.end_date}</Descriptions.Item>
          <Descriptions.Item label="合同总额">¥{contract?.total_amount?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="月均费用">¥{contract?.monthly_fee?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={contract?.status === 'active' ? 'success' : 'default'}>
              {contract?.status === 'active' ? '有效' : '已终止'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{contract?.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <Modal
        title="编辑备注"
        open={editRemarkModal}
        onCancel={() => setEditRemarkModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            updateRemarkMutation.mutate(values.remark)
          })
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="remark" label="备注" initialValue={contract?.remark}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加入场记录"
        open={addEntryModal}
        onCancel={() => setAddEntryModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            addEntryMutation.mutate({
              contractId,
              entryDate: values.entry_date.format('YYYY-MM-DD'),
              venue: values.venue,
              coach: values.coach
            })
          })
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="entry_date" label="入场日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="venue" label="场馆">
            <Input />
          </Form.Item>
          <Form.Item name="coach" label="教练">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加冻结申请"
        open={addFreezeModal}
        onCancel={() => setAddFreezeModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            const start = values.freeze_start_date
            const end = values.freeze_end_date
            const days = end.diff(start, 'day') + 1
            const isCrossMonth = start.month() !== end.month()
            
            addFreezeMutation.mutate({
              contractId,
              freezeStartDate: start.format('YYYY-MM-DD'),
              freezeEndDate: end.format('YYYY-MM-DD'),
              freezeDays: days,
              freezeReason: values.freeze_reason,
              isCrossMonth: isCrossMonth ? 1 : 0
            })
          })
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="freeze_start_date" label="冻结开始日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="freeze_end_date" label="冻结结束日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="freeze_reason" label="冻结原因">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加补课单"
        open={addMakeupModal}
        onCancel={() => setAddMakeupModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            addMakeupMutation.mutate({
              contractId,
              lessonDate: values.lesson_date.format('YYYY-MM-DD'),
              makeupDate: values.makeup_date?.format('YYYY-MM-DD'),
              remark: values.remark
            })
          })
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="lesson_date" label="原定上课日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="makeup_date" label="补课日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加转让记录"
        open={addTransferModal}
        onCancel={() => setAddTransferModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            addTransferMutation.mutate({
              contractId,
              fromMember: values.from_member,
              toMember: values.to_member,
              transferDate: values.transfer_date.format('YYYY-MM-DD'),
              transferFee: values.transfer_fee || 0,
              isRetroactive: values.is_retroactive ? 1 : 0,
              retroactiveMonth: values.retroactive_month?.format('YYYY-MM'),
              remark: values.remark
            })
          })
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="from_member" label="转出方" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="to_member" label="转入方" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="transfer_date" label="转让日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="transfer_fee" label="转让费">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="is_retroactive" label="是否追溯调整" valuePropName="checked">
            <Input.Checkbox>追溯调整历史月份递延</Input.Checkbox>
          </Form.Item>
          <Form.Item name="retroactive_month" label="追溯月份">
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ContractDetail
