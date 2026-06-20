import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input,
  InputNumber, DatePicker, message, Row, Col, Statistic
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  LockOutlined,
  SafetyOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { snapshotApi } from '../api.js'

const { TextArea } = Input

function SnapshotList() {
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [form] = Form.useForm()
  const [sealMonthFilter, setSealMonthFilter] = useState()

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (sealMonthFilter) {
        params.seal_month = sealMonthFilter.format('YYYY-MM')
      }
      const data = await snapshotApi.list(params)
      setSnapshots(data)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [sealMonthFilter])

  const handleCreate = async (values) => {
    try {
      const payload = {
        snapshot_name: values.snapshot_name,
        model_version: values.model_version,
        created_by: values.created_by,
        description: values.description,
        seal_month: values.seal_month ? values.seal_month.format('YYYY-MM') : undefined,
        threshold_config: {
          recall_threshold: values.recall_threshold,
          precision_threshold: values.precision_threshold,
          score_threshold: values.score_threshold,
        },
        initial_samples: [],
      }
      await snapshotApi.create(payload)
      message.success('快照创建成功')
      setCreateModal(false)
      form.resetFields()
      loadData()
    } catch (e) {
      message.error('创建失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      render: (v) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: '快照名称',
      dataIndex: 'snapshot_name',
      render: (v, record) => (
        <Link to={`/snapshots/${record.id}`} style={{ fontWeight: 500 }}>{v}</Link>
      ),
    },
    {
      title: '版本号',
      dataIndex: 'snapshot_version',
      width: 220,
      render: (v) => <code style={{ fontSize: 12, color: '#666' }}>{v}</code>,
    },
    {
      title: '模型版本',
      dataIndex: 'model_version',
      width: 180,
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => {
        const map = {
          draft: { color: 'default', text: '草稿' },
          sealed: { color: 'green', text: '已封账' },
        }
        const cfg = map[v] || { color: 'default', text: v }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '封账月份',
      dataIndex: 'seal_month',
      width: 110,
      render: (v) => v ? <Tag color="purple">{v}</Tag> : '-',
    },
    {
      title: '锁定',
      dataIndex: 'is_locked',
      width: 70,
      render: (v) => v ? <Tag icon={<LockOutlined />} color="success">已锁定</Tag> : '-',
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/snapshots/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <Row gutter={24} align="middle">
          <Col span={14}>
            <div className="page-title">召回漏斗版本快照</div>
            <div className="page-desc">
              管理所有版本的召回漏斗快照，支持训练日志关联、人工判断保护、变更追溯等功能
            </div>
          </Col>
          <Col span={10} style={{ textAlign: 'right' }}>
            <Space>
              <DatePicker
                picker="month"
                placeholder="筛选封账月份"
                allowClear
                onChange={setSealMonthFilter}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                创建快照
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="快照总数" value={snapshots.length} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已封账数" value={snapshots.filter(s => s.status === 'sealed').length} prefix={<SafetyOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月快照"
              value={snapshots.filter(s => dayjs(s.created_at).isSame(dayjs(), 'month')).length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="有父版本"
              value={snapshots.filter(s => s.parent_snapshot_id).length}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={snapshots}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="创建召回漏斗快照"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            recall_threshold: 0.05,
            score_threshold: 0.5,
            precision_threshold: 0.7,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="snapshot_name" label="快照名称" rules={[{ required: true }]}>
                <Input placeholder="如：6月召回漏斗-新模型" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model_version" label="模型版本" rules={[{ required: true }]}>
                <Input placeholder="如：model_v20260615" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="recall_threshold" label="召回阈值">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="score_threshold" label="分数阈值">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="precision_threshold" label="精确率阈值">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="created_by" label="创建人" rules={[{ required: true }]}>
                <Input placeholder="如：小唐" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="seal_month" label="封账月份">
                <DatePicker picker="month" style={{ width: '100%' }} format="YYYY-MM" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="快照描述说明" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SnapshotList
