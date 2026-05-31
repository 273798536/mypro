import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Table, Card, Button, Tag, Space, Modal, Form, 
  Input, DatePicker, message, Descriptions
} from 'antd'
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { rulesAPI } from '../api/client'
import dayjs from 'dayjs'

function RulesPage() {
  const [createModal, setCreateModal] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rulesAPI.list()
  })

  const createMutation = useMutation({
    mutationFn: (data) => rulesAPI.create(data),
    onSuccess: () => {
      message.success('规则版本创建成功')
      setCreateModal(false)
      form.resetFields()
      queryClient.invalidateQueries(['rules'])
    }
  })

  const activateMutation = useMutation({
    mutationFn: (id) => rulesAPI.activate(id),
    onSuccess: () => {
      message.success('规则版本已激活')
      queryClient.invalidateQueries(['rules'])
    }
  })

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 120,
      render: (text, record) => (
        <Space>
          <Tag color="purple">{text}</Tag>
          {record.is_active && (
            <Tag color="green" icon={<CheckCircleOutlined />}>当前生效</Tag>
          )}
        </Space>
      )
    },
    {
      title: '规则名称',
      dataIndex: 'rule_name',
      width: 150
    },
    {
      title: '规则内容',
      dataIndex: 'rule_content',
      ellipsis: true
    },
    {
      title: '生效日期',
      dataIndex: 'effective_date',
      width: 120
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => !record.is_active && (
        <Button 
          type="link" 
          size="small"
          onClick={() => activateMutation.mutate(record.id)}
        >
          设为生效
        </Button>
      )
    }
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: '#666' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            规则版本用于管理递延计算的口径，每次规则变更都会保留历史版本
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setCreateModal(true)}
          >
            新建规则版本
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={rules || []}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          rowClassName={(record) => record.is_active ? 'corrected-row' : ''}
        />
      </Card>

      <Modal
        title="新建规则版本"
        open={createModal}
        width={600}
        onCancel={() => setCreateModal(false)}
        onOk={() => {
          form.validateFields().then(values => {
            createMutation.mutate({
              version: values.version,
              ruleName: values.rule_name,
              ruleContent: values.rule_content,
              effectiveDate: values.effective_date.format('YYYY-MM-DD'),
              createdBy: 'admin'
            })
          })
        }}
        confirmLoading={createMutation.isLoading}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="version" 
            label="版本号" 
            rules={[{ required: true, message: '请输入版本号' }]}
            tooltip="例如: v1.4"
          >
            <Input placeholder="v1.4" />
          </Form.Item>
          <Form.Item 
            name="rule_name" 
            label="规则名称" 
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="新规则名称" />
          </Form.Item>
          <Form.Item 
            name="rule_content" 
            label="规则内容" 
            rules={[{ required: true, message: '请输入规则内容' }]}
          >
            <Input.TextArea rows={4} placeholder="详细描述规则内容" />
          </Form.Item>
          <Form.Item 
            name="effective_date" 
            label="生效日期" 
            rules={[{ required: true, message: '请选择生效日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RulesPage
