import { useEffect, useState } from 'react'
import {
  Table,
  Select,
  Space,
  Button,
  Card,
  Tag,
  Modal,
  Form,
  Input,
  Drawer,
  Descriptions,
  message,
  Typography,
  Badge,
} from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons'
import api from '../api'
import type { ManualCorrection } from '../types'
import type { PaginatedResponse } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text, Paragraph } = Typography

function Corrections() {
  const [corrections, setCorrections] = useState<ManualCorrection[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [source, setSource] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [type, setType] = useState<string | undefined>()

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentItem, setCurrentItem] = useState<ManualCorrection | null>(null)

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [samples, setSamples] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])

  useEffect(() => {
    fetchCorrections()
    fetchOptions()
  }, [page, pageSize, source, status, type])

  const fetchOptions = async () => {
    try {
      const [samplesRes, versionsRes] = await Promise.all([
        api.get('/samples/', { params: { page_size: 100 } }),
        api.get('/versions/'),
      ]) as any
      setSamples(samplesRes.items)
      setVersions(versionsRes)
    } catch (error) {
      console.error('Failed to fetch options:', error)
    }
  }

  const fetchCorrections = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (source) params.source = source
      if (status) params.process_status = status
      if (type) params.correction_type = type

      const res = await api.get('/corrections/', { params }) as PaginatedResponse<ManualCorrection>
      setCorrections(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('Failed to fetch corrections:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = (item: ManualCorrection) => {
    setCurrentItem(item)
    setDetailVisible(true)
  }

  const handleCreate = async (values: any) => {
    try {
      const correctionData: Record<string, any> = {}
      if (values.correction_type) correctionData['修正类型'] = values.correction_type
      if (values.description) correctionData['问题描述'] = values.description
      if (values.suggestion) correctionData['建议操作'] = values.suggestion

      await api.post('/corrections/', {
        sample_id: values.sample_id,
        version_id: values.version_id || null,
        source: values.source,
        process_status: 'pending',
        correction_data: correctionData,
        correction_type: values.correction_type || 'general',
        operator: values.operator || '',
        remark: values.description || '',
      })
      message.success('人工修正录入成功')
      setCreateModalVisible(false)
      form.resetFields()
      fetchCorrections()
    } catch (error) {
      message.error('录入失败')
      console.error(error)
    }
  }

  const handleProcess = async (item: ManualCorrection) => {
    try {
      await api.put(`/corrections/${item.id}`, {
        process_status: 'processed',
        operator: '当前用户',
        remark: '已处理',
      })
      message.success('处理成功')
      fetchCorrections()
    } catch (error) {
      message.error('处理失败')
    }
  }

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: 'orange',
      processing: 'blue',
      processed: 'green',
    }
    return map[s] || 'default'
  }

  const getStatusText = (s: string) => {
    const map: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      processed: '已处理',
    }
    return map[s] || s
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '样本ID',
      dataIndex: ['sample', 'sample_id'],
      key: 'sample_id',
      width: 100,
      render: (_: any, record: ManualCorrection) => record.sample?.sample_id || record.sample_id,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (s: string) => <Tag color="blue">{s}</Tag>,
    },
    {
      title: '处理状态',
      dataIndex: 'process_status',
      key: 'process_status',
      width: 100,
      render: (s: string) => (
        <Tag color={getStatusColor(s)}>{getStatusText(s)}</Tag>
      ),
    },
    {
      title: '修正类型',
      dataIndex: 'correction_type',
      key: 'correction_type',
      width: 100,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: ManualCorrection) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
            详情
          </Button>
          {record.process_status !== 'processed' && (
            <Button type="link" icon={<CheckOutlined />} onClick={() => handleProcess(record)}>
              标记已处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>人工修正</Title>
      <Text type="secondary">
        管理各来源提交的人工修正，来源和处理状态是核心字段，确保可追溯
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="筛选来源"
            value={source}
            onChange={setSource}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="运营-老唐">运营-老唐</Option>
            <Option value="风控-小李">风控-小李</Option>
            <Option value="质检-小王">质检-小王</Option>
            <Option value="技术支持-小张">技术支持-小张</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            value={status}
            onChange={setStatus}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="pending">待处理</Option>
            <Option value="processing">处理中</Option>
            <Option value="processed">已处理</Option>
          </Select>
          <Select
            placeholder="筛选类型"
            value={type}
            onChange={setType}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="答案修正">答案修正</Option>
            <Option value="标签修正">标签修正</Option>
            <Option value="分类修正">分类修正</Option>
            <Option value="优先级调整">优先级调整</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            录入修正
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          message="字段说明"
          description="负责人交来的人工修正字段名可能前后不一，系统已兼容不同字段名，但 '来源' 和 '处理状态' 是必保字段。"
          style={{ marginBottom: 16 }}
        />

        <Table
          loading={loading}
          columns={columns}
          dataSource={corrections}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <Drawer
        title="人工修正详情"
        width={500}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        destroyOnClose
      >
        {currentItem && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="样本ID">
                {currentItem.sample?.sample_id || currentItem.sample_id}
              </Descriptions.Item>
              <Descriptions.Item label="来源">
                <Tag color="blue">{currentItem.source}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处理状态">
                <Tag color={getStatusColor(currentItem.process_status)}>
                  {getStatusText(currentItem.process_status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="修正类型">
                {currentItem.correction_type}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {currentItem.operator || '未指定'}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {currentItem.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>修正内容（兼容字段）：</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(currentItem.correction_data, null, 2)}
              </pre>
            </div>

            <div>
              <Text strong>创建时间：</Text>
              <Text>
                {dayjs(currentItem.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            </div>
            <div>
              <Text strong>更新时间：</Text>
              <Text>
                {dayjs(currentItem.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            </div>
          </Space>
        )}
      </Drawer>

      <Modal
        title="录入人工修正"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="sample_id" label="关联样本" rules={[{ required: true }]}>
            <Select placeholder="选择样本" showSearch optionFilterProp="children">
              {samples.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.sample_id} - {s.query}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="version_id" label="关联版本">
            <Select placeholder="选择版本（可选）" allowClear>
              {versions.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.version}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="source" label="来源" rules={[{ required: true }]}>
            <Input placeholder="如：运营-老唐" />
          </Form.Item>
          <Form.Item name="correction_type" label="修正类型">
            <Select placeholder="选择类型">
              <Option value="答案修正">答案修正</Option>
              <Option value="标签修正">标签修正</Option>
              <Option value="分类修正">分类修正</Option>
              <Option value="优先级调整">优先级调整</Option>
              <Option value="general">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="问题描述">
            <Input.TextArea rows={3} placeholder="描述需要修正的问题" />
          </Form.Item>
          <Form.Item name="suggestion" label="建议操作">
            <Input.TextArea rows={2} placeholder="建议的处理方式" />
          </Form.Item>
          <Form.Item name="operator" label="操作人">
            <Input placeholder="操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Corrections
