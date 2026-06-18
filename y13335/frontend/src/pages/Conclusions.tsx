import { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Drawer,
  Descriptions,
  List,
  message,
  Typography,
  Divider,
  Statistic,
  Row,
  Col,
  Alert,
} from 'antd'
import {
  FileTextOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import api from '../api'
import type { ReviewConclusion, AlgorithmVersion } from '../types'
import type { PaginatedResponse } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text, Paragraph } = Typography

function Conclusions() {
  const [conclusions, setConclusions] = useState<ReviewConclusion[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isFinal, setIsFinal] = useState<boolean | undefined>()
  const [versions, setVersions] = useState<AlgorithmVersion[]>([])

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentItem, setCurrentItem] = useState<ReviewConclusion | null>(null)
  const [exportData, setExportData] = useState<any>(null)

  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [generateForm] = Form.useForm()

  useEffect(() => {
    fetchConclusions()
    fetchVersions()
  }, [page, pageSize, isFinal])

  const fetchVersions = async () => {
    try {
      const res = await api.get('/versions/') as AlgorithmVersion[]
      setVersions(res)
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    }
  }

  const fetchConclusions = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (isFinal !== undefined) params.is_final = isFinal

      const res = await api.get('/conclusions/', { params }) as PaginatedResponse<ReviewConclusion>
      setConclusions(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('Failed to fetch conclusions:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = async (item: ReviewConclusion) => {
    setCurrentItem(item)
    setDetailVisible(true)
    try {
      const res = await api.get(`/conclusions/${item.id}/export`)
      setExportData(res)
    } catch (error) {
      console.error('Failed to export conclusion:', error)
    }
  }

  const handleGenerate = async (values: any) => {
    try {
      const res = await api.post('/conclusions/generate', null, {
        params: {
          version_id: values.version_id,
          title: values.title,
          conclusion_id: values.conclusion_id || undefined,
          operator: values.operator || '',
        },
      })
      message.success('复核结论生成成功')
      setGenerateModalVisible(false)
      generateForm.resetFields()
      fetchConclusions()
    } catch (error) {
      message.error('生成失败')
      console.error(error)
    }
  }

  const handleFinalize = async (item: ReviewConclusion) => {
    Modal.confirm({
      title: '确认封账',
      content: '封账后结论将不可修改，确定要封账吗？',
      onOk: async () => {
        try {
          await api.put(`/conclusions/${item.id}/finalize`)
          message.success('已封账')
          fetchConclusions()
        } catch (error) {
          message.error('操作失败')
        }
      },
    })
  }

  const columns = [
    {
      title: '结论编号',
      dataIndex: 'conclusion_id',
      key: 'conclusion_id',
      width: 200,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '关联版本',
      dataIndex: ['version', 'version'],
      key: 'version',
      width: 120,
      render: (_: any, record: ReviewConclusion) => record.version?.version || '-',
    },
    {
      title: '样本数',
      dataIndex: 'total_samples',
      key: 'total_samples',
      width: 80,
    },
    {
      title: '通过数',
      dataIndex: 'pass_count',
      key: 'pass_count',
      width: 80,
      render: (n: number) => <span style={{ color: '#52c41a' }}>{n}</span>,
    },
    {
      title: '状态',
      dataIndex: 'is_final',
      key: 'is_final',
      width: 100,
      render: (f: boolean) => (
        <Tag color={f ? 'green' : 'orange'} icon={f ? <CheckCircleOutlined /> : <RocketOutlined />}>
          {f ? '已封账' : '草稿'}
        </Tag>
      ),
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
      width: 180,
      render: (_: any, record: ReviewConclusion) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
            查看
          </Button>
          {!record.is_final && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleFinalize(record)}
            >
              封账
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        复核结论
      </Title>
      <Text type="secondary">
        最终给人看的不是功能清单，而是能直接拿去沟通的接口返回
      </Text>

      <Alert
        type="info"
        showIcon
        message="使用说明"
        description="选择一个版本生成复核结论，结论包含指标统计、亮点摘要和样本明细，可直接用于与负责人沟通。月底封账后结论不可修改。"
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setGenerateModalVisible(true)}
          >
            生成结论
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="筛选状态"
            value={isFinal}
            onChange={setIsFinal}
            style={{ width: 140 }}
            allowClear
          >
            <Option value={false}>草稿</Option>
            <Option value={true}>已封账</Option>
          </Select>
        </Space>

        <Table
          loading={loading}
          columns={columns}
          dataSource={conclusions}
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
        title="复核结论详情"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        destroyOnClose
        extra={
          exportData && (
            <Button icon={<ExportOutlined />} onClick={() => message.info('导出功能待接入')}>
              导出报告
            </Button>
          )
        }
      >
        {currentItem && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card size="small">
              <Descriptions title="基本信息" column={2} size="small">
                <Descriptions.Item label="结论编号">
                  {currentItem.conclusion_id}
                </Descriptions.Item>
                <Descriptions.Item label="关联版本">
                  <Tag>{currentItem.version?.version || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="标题" span={2}>
                  {currentItem.title}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={currentItem.is_final ? 'green' : 'orange'}>
                    {currentItem.is_final ? '已封账' : '草稿'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="操作人">
                  {currentItem.operator || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {dayjs(currentItem.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={16}>
              <Col span={6}>
                <Card className="stats-card" size="small">
                  <Statistic title="样本总数" value={currentItem.total_samples} />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="stats-card" size="small">
                  <Statistic
                    title="通过数"
                    value={currentItem.pass_count}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="stats-card" size="small">
                  <Statistic
                    title="未通过数"
                    value={currentItem.fail_count}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card className="stats-card" size="small">
                  <Statistic
                    title="人工修正"
                    value={currentItem.correction_count}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card size="small" title="核心指标">
              <Descriptions column={2} size="small">
                {currentItem.metrics &&
                  Object.entries(currentItem.metrics).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      {typeof value === 'number' && (key.includes('rate') || key.includes('率'))
                        ? `${(value * 100).toFixed(2)}%`
                        : String(value)}
                    </Descriptions.Item>
                  ))}
              </Descriptions>
            </Card>

            <Card size="small" title="摘要">
              <Paragraph style={{ marginBottom: 0 }}>{currentItem.summary}</Paragraph>
            </Card>

            <Card size="small" title="亮点/关键数据">
              <List
                size="small"
                dataSource={currentItem.highlights || []}
                renderItem={(item: string) => (
                  <List.Item>
                    <span style={{ color: '#1890ff', marginRight: 8 }}>●</span>
                    {item}
                  </List.Item>
                )}
              />
            </Card>

            {exportData && (
              <Card size="small" title="样本明细（接口返回格式）">
                <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                  以下数据可直接用于与负责人沟通
                </Text>
                <Table
                  size="small"
                  dataSource={exportData.sample_details || []}
                  columns={[
                    { title: '样本ID', dataIndex: '样本ID', key: 'id' },
                    { title: '查询内容', dataIndex: '查询内容', key: 'query', ellipsis: true },
                    { title: '分数', dataIndex: '分数', key: 'score', width: 80 },
                    {
                      title: '状态',
                      dataIndex: '状态',
                      key: 'status',
                      width: 120,
                      render: (s: string) => (
                        <Tag color={s.includes('通过') && !s.includes('未') ? 'green' : 'red'}>
                          {s}
                        </Tag>
                      ),
                    },
                    { title: '人工修正数', dataIndex: '人工修正数', key: 'corr', width: 100 },
                  ]}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            )}

            {exportData && (
              <Card size="small" title="完整接口返回 JSON">
                <pre
                  style={{
                    background: '#f6f8fa',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 300,
                    overflow: 'auto',
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(
                    {
                      conclusion_id: exportData.conclusion_id,
                      title: exportData.title,
                      version: exportData.version,
                      summary: exportData.summary,
                      metrics: exportData.metrics,
                      highlights: exportData.highlights,
                      is_final: exportData.is_final,
                      operator: exportData.operator,
                      created_at: exportData.created_at,
                      sample_count: exportData.sample_details?.length || 0,
                    },
                    null,
                    2,
                  )}
                </pre>
              </Card>
            )}
          </Space>
        )}
      </Drawer>

      <Modal
        title="生成复核结论"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={generateForm} layout="vertical" onFinish={handleGenerate}>
          <Form.Item name="version_id" label="选择版本" rules={[{ required: true }]}>
            <Select placeholder="选择要生成结论的版本">
              {versions.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.version} {v.is_active && '(当前)'} - {v.description}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="结论标题" rules={[{ required: true }]}>
            <Input placeholder="如：v1.1.0 阈值调优版复核报告" />
          </Form.Item>
          <Form.Item name="conclusion_id" label="自定义编号（可选）">
            <Input placeholder="留空则自动生成" />
          </Form.Item>
          <Form.Item name="operator" label="操作人">
            <Input placeholder="操作人姓名" />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="自动计算说明"
            description="系统将自动统计该版本下的样本评测结果（排除重复评测）、人工修正数量和各项指标，生成可直接沟通的复核结论。"
            style={{ marginBottom: 16 }}
          />
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setGenerateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">生成</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Conclusions
