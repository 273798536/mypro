import { useEffect, useState } from 'react'
import { Table, Input, Select, Space, Button, Card, Tag, Modal, Form, Drawer, Descriptions, List, Badge } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../api'
import type { Sample, EvaluationRecord, ManualCorrection, ReviewHistory } from '../types'
import type { PaginatedResponse } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

function Samples() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [source, setSource] = useState<string | undefined>()
  const [category, setCategory] = useState<string | undefined>()

  const [detailVisible, setDetailVisible] = useState(false)
  const [currentSample, setCurrentSample] = useState<Sample | null>(null)
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([])
  const [corrections, setCorrections] = useState<ManualCorrection[]>([])
  const [histories, setHistories] = useState<ReviewHistory[]>([])

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchSamples()
  }, [page, pageSize, source, category])

  const fetchSamples = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (source) params.source = source
      if (category) params.category = category
      if (keyword) params.keyword = keyword

      const res = await api.get('/samples/', { params }) as PaginatedResponse<Sample>
      setSamples(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('Failed to fetch samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchSamples()
  }

  const viewDetail = async (sample: Sample) => {
    setCurrentSample(sample)
    setDetailVisible(true)

    try {
      const [evalsRes, corrRes, histRes] = await Promise.all([
        api.get(`/evaluations/sample/${sample.id}`),
        api.get(`/corrections/sample/${sample.id}`),
        api.get(`/history/sample/${sample.id}`),
      ]) as any
      setEvaluations(evalsRes)
      setCorrections(corrRes)
      setHistories(histRes)
    } catch (error) {
      console.error('Failed to fetch sample details:', error)
    }
  }

  const handleCreate = async (values: any) => {
    try {
      await api.post('/samples/', values)
      setCreateModalVisible(false)
      form.resetFields()
      fetchSamples()
    } catch (error) {
      console.error('Failed to create sample:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'orange',
      processing: 'blue',
      processed: 'green',
    }
    return map[status] || 'default'
  }

  const columns = [
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      key: 'sample_id',
      width: 100,
    },
    {
      title: '查询内容',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (s: string) => <Tag color="blue">{s}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Sample) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="样本管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            新增样本
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索查询内容"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="筛选来源"
            value={source}
            onChange={setSource}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="客服进线">客服进线</Option>
            <Option value="运营录入">运营录入</Option>
            <Option value="重复评测-回归测试">重复评测</Option>
          </Select>
          <Select
            placeholder="筛选分类"
            value={category}
            onChange={setCategory}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="操作类">操作类</Option>
            <Option value="风险类">风险类</Option>
            <Option value="产品类">产品类</Option>
            <Option value="查询类">查询类</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>

        <Table
          loading={loading}
          columns={columns}
          dataSource={samples}
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
        title="样本详情"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        destroyOnClose
      >
        {currentSample && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="样本ID">{currentSample.sample_id}</Descriptions.Item>
              <Descriptions.Item label="查询内容">{currentSample.query}</Descriptions.Item>
              <Descriptions.Item label="来源">
                <Tag>{currentSample.source}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分类">{currentSample.category}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(currentSample.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h4>各版本评测结果</h4>
              <List
                size="small"
                dataSource={evaluations}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>版本：{item.version?.version || item.version_id}</span>
                          {item.is_repeat_eval && <Badge status="warning" text="重复评测" />}
                        </Space>
                      }
                      description={
                        <Space>
                          <span>分数: {item.score}</span>
                          <Tag color={item.is_pass ? 'green' : 'red'}>
                            {item.is_pass ? '通过' : '未通过'}
                          </Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            <div>
              <h4>人工修正记录</h4>
              <List
                size="small"
                dataSource={corrections}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>来源：{item.source}</span>
                          <Tag color={getStatusColor(item.process_status)}>
                            {item.process_status}
                          </Tag>
                        </Space>
                      }
                      description={item.remark}
                    />
                  </List.Item>
                )}
              />
            </div>

            <div>
              <h4>复核历史</h4>
              <List
                size="small"
                dataSource={histories}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag>{item.action_type}</Tag>
                          <span style={{ fontSize: 12, color: '#999' }}>
                            {dayjs(item.created_at).format('MM-DD HH:mm')}
                          </span>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>操作人: {item.operator || '未知'}</span>
                          <span style={{ color: '#666' }}>{item.remark}</span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </Space>
        )}
      </Drawer>

      <Modal
        title="新增样本"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="sample_id" label="样本ID" rules={[{ required: true }]}>
            <Input placeholder="请输入样本ID" />
          </Form.Item>
          <Form.Item name="query" label="查询内容" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入查询内容" />
          </Form.Item>
          <Form.Item name="source" label="来源" initialValue="运营录入">
            <Select>
              <Option value="客服进线">客服进线</Option>
              <Option value="运营录入">运营录入</Option>
              <Option value="重复评测-回归测试">重复评测</Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="分类" initialValue="产品类">
            <Select>
              <Option value="操作类">操作类</Option>
              <Option value="风险类">风险类</Option>
              <Option value="产品类">产品类</Option>
              <Option value="查询类">查询类</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确定</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Samples
