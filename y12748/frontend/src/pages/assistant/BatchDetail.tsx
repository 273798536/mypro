import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, Tabs,
  Modal, Form, Input, InputNumber, Select, message, Tooltip, Descriptions
} from 'antd'
import {
  ArrowLeftOutlined, EyeOutlined, EditOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  AuditOutlined, PlusOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { batchApi, recordApi, reviewApi } from '../../services/api'
import type { ImportBatch, QuestionRecord } from '../../types'
import { ISSUE_TYPE_MAP, RECORD_STATUS_OPTIONS } from '../../types'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [batch, setBatch] = useState<ImportBatch | null>(null)
  const [records, setRecords] = useState<QuestionRecord[]>([])
  const [filter, setFilter] = useState<'all' | 'issues' | 'passed' | 'pending'>('all')
  const [editRecord, setEditRecord] = useState<QuestionRecord | null>(null)
  const [editModal, setEditModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [statusRecord, setStatusRecord] = useState<QuestionRecord | null>(null)
  const [reviewModal, setReviewModal] = useState(false)
  const [form] = Form.useForm()
  const [statusForm] = Form.useForm()
  const [reviewForm] = Form.useForm()
  const { triggerRefresh, refreshTrigger, setCurrentBatch } = useAppStore()

  useEffect(() => {
    if (id) loadData()
  }, [id, refreshTrigger, filter])

  useEffect(() => {
    if (batch) setCurrentBatch(batch)
  }, [batch, setCurrentBatch])

  const loadData = async () => {
    if (!id) return
    const bid = parseInt(id)
    const [batchRes, recordsRes] = await Promise.all([
      batchApi.get(bid),
      batchApi.getRecords(bid, filter === 'all' ? undefined :
        filter === 'issues' ? { has_issues: true } :
          filter === 'passed' ? { status: 'passed' } :
            { status: 'pending' })
    ])
    setBatch(batchRes)
    setRecords(recordsRes)
  }

  const handleEdit = async (values: any) => {
    if (!editRecord) return
    try {
      const fieldName = values.field_name
      const newVal = fieldName === 'stress_level' || fieldName === 'temperature' || fieldName === 'lifetime_hours'
        ? Number(values.new_value)
        : values.new_value
      await recordApi.updateField(editRecord.id, {
        field_name: fieldName,
        new_value: newVal,
        comment: values.comment
      })
      message.success('字段更新成功，已留痕')
      setEditModal(false)
      form.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '更新失败')
    }
  }

  const handleStatus = async (values: any) => {
    if (!statusRecord) return
    try {
      await recordApi.transitionStatus(statusRecord.id, {
        record_id: statusRecord.id,
        from_status: statusRecord.status,
        to_status: values.to_status,
        comment: values.comment
      })
      message.success('状态更新成功')
      setStatusModal(false)
      statusForm.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '状态更新失败')
    }
  }

  const handleCreateReview = async (values: any) => {
    if (!batch) return
    try {
      const session = await reviewApi.createSession({
        batch_id: batch.id,
        session_name: values.session_name,
        session_type: values.session_type,
        include_wrong_answers: values.include_wrong_answers,
        include_historical_answers: values.include_historical_answers,
        include_conflicts: values.include_conflicts,
        remark: values.remark
      })
      message.success('复核会话创建成功')
      setReviewModal(false)
      reviewForm.resetFields()
      navigate(`/assistant/review/${session.id}`)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '创建失败')
    }
  }

  const renderIssues = (record: QuestionRecord) => {
    const tags: JSX.Element[] = []
    if (record.has_unit_issue) tags.push(<Tag key="unit" color={ISSUE_TYPE_MAP.unit_missing.color}>{ISSUE_TYPE_MAP.unit_missing.label}</Tag>)
    if (record.has_empty_value) tags.push(<Tag key="empty" color={ISSUE_TYPE_MAP.empty_value.color}>{ISSUE_TYPE_MAP.empty_value.label}</Tag>)
    if (record.has_mixed_remark) tags.push(<Tag key="mixed" color={ISSUE_TYPE_MAP.mixed_remark.color}>{ISSUE_TYPE_MAP.mixed_remark.label}</Tag>)
    if (record.has_conflict) tags.push(<Tag key="conflict" color={ISSUE_TYPE_MAP.conflict.color}>{ISSUE_TYPE_MAP.conflict.label}</Tag>)
    if (record.is_duplicate) tags.push(<Tag key="dup" color={ISSUE_TYPE_MAP.duplicate.color}>{ISSUE_TYPE_MAP.duplicate.label}</Tag>)
    return tags.length > 0 ? tags : <Tag color="green">正常</Tag>
  }

  const columns = [
    {
      title: '题目编号',
      dataIndex: 'question_id',
      width: 120,
      render: (v: string) => v || '-'
    },
    {
      title: '材料',
      dataIndex: 'material_name',
      width: 160,
      render: (v: string) => v || '-'
    },
    {
      title: '应力/温度',
      width: 140,
      render: (_: any, r: QuestionRecord) => (
        <div>
          <div>应力: {r.stress_level || '-'} MPa</div>
          <div>温度: {r.temperature || '-'} ℃</div>
        </div>
      )
    },
    {
      title: '寿命',
      width: 120,
      render: (_: any, r: QuestionRecord) => (
        <Space>
          <span>{r.lifetime_hours || '-'}</span>
          <Tag color={r.has_unit_issue ? 'red' : 'default'}>{r.unit || '无单位'}</Tag>
        </Space>
      )
    },
    {
      title: '数据质量',
      width: 220,
      render: renderIssues
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const opt = RECORD_STATUS_OPTIONS.find(o => o.value === v)
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : v
      }
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 160,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, r: QuestionRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/assistant/records/${r.id}`)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setEditRecord(r); setEditModal(true) }}>
            修正
          </Button>
          <Button type="link" size="small" icon={<AuditOutlined />}
            onClick={() => { setStatusRecord(r); setStatusModal(true) }}>
            状态
          </Button>
        </Space>
      )
    }
  ]

  if (!batch) return <div className="page-container"><div className="empty-state">加载中...</div></div>

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ marginBottom: 8 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assistant/batches')}>
            返回列表
          </Button>
          <Title level={4} style={{ margin: 0 }}>{batch.batch_name}</Title>
        </Space>
        <div className="page-description">
          {batch.file_name ? `源文件: ${batch.file_name}` : '未上传文件'} · 导入于 {dayjs(batch.imported_at).format('YYYY-MM-DD HH:mm')}
          {batch.remark && ` · ${batch.remark}`}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总记录数" value={batch.total_records} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="有效记录" value={batch.valid_records} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="问题记录" value={batch.invalid_records} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="状态" value={
            batch.status === 'imported' ? '已导入' : batch.status
          } /></Card>
        </Col>
      </Row>

      <Card className="card-shadow">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={5} style={{ margin: 0 }}>题目记录</Title>
            <Space>
              <Button type={filter === 'all' ? 'primary' : 'default'} size="small" onClick={() => setFilter('all')}>
                全部
              </Button>
              <Button type={filter === 'issues' ? 'primary' : 'default'} size="small" icon={<WarningOutlined />}
                onClick={() => setFilter('issues')}>
                仅问题
              </Button>
              <Button type={filter === 'pending' ? 'primary' : 'default'} size="small"
                onClick={() => setFilter('pending')}>
                待处理
              </Button>
              <Button type={filter === 'passed' ? 'primary' : 'default'} size="small"
                onClick={() => setFilter('passed')}>
                已通过
              </Button>
            </Space>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setReviewModal(true)}>
              创建复核
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={`修记录 - ${editRecord?.question_id || ''}`}
        open={editModal}
        onCancel={() => { setEditModal(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="确认修正"
      >
        <div style={{ marginBottom: 12, background: '#fff7e6', padding: 12, borderRadius: 4 }}>
          <Text type="warning">⚠️ 修改将自动记录历史，可追溯前后变化</Text>
        </div>
        {editRecord && (
          <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="材料">{editRecord.material_name}</Descriptions.Item>
            <Descriptions.Item label="寿命">{editRecord.lifetime_hours} {editRecord.unit}</Descriptions.Item>
            <Descriptions.Item label="应力">{editRecord.stress_level} MPa</Descriptions.Item>
            <Descriptions.Item label="温度">{editRecord.temperature} ℃</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={form} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="field_name" label="选择要修改的字段" rules={[{ required: true }]}>
            <Select options={[
              { value: 'question_id', label: '题目编号' },
              { value: 'material_name', label: '材料名称' },
              { value: 'stress_level', label: '应力水平 (MPa)' },
              { value: 'temperature', label: '温度 (℃)' },
              { value: 'lifetime_hours', label: '寿命 (小时)' },
              { value: 'unit', label: '单位' },
              { value: 'student_answer', label: '学生答案' },
              { value: 'correct_answer', label: '正确答案' },
              { value: 'constraint_condition', label: '约束条件' },
              { value: 'remark', label: '备注' }
            ]} />
          </Form.Item>
          <Form.Item name="new_value" label="新值" rules={[{ required: true, message: '请输入新值' }]}>
            <Input placeholder="输入修正后的数值或文本" />
          </Form.Item>
          <Form.Item name="comment" label="修正说明（留痕）">
            <Input.TextArea rows={2} placeholder="可选，说明修正原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="状态转换"
        open={statusModal}
        onCancel={() => { setStatusModal(false); statusForm.resetFields() }}
        onOk={() => statusForm.submit()}
      >
        {statusRecord && (
          <div style={{ marginBottom: 16 }}>
            <p>当前状态: <Tag>{statusRecord.status}</Tag></p>
          </div>
        )}
        <Form form={statusForm} layout="vertical" onFinish={handleStatus}>
          <Form.Item name="to_status" label="转换为" rules={[{ required: true }]}>
            <Select options={RECORD_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          </Form.Item>
          <Form.Item name="comment" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="创建复核会话"
        open={reviewModal}
        onCancel={() => { setReviewModal(false); reviewForm.resetFields() }}
        onOk={() => reviewForm.submit()}
        width={520}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleCreateReview}
          initialValues={{
            session_name: `${batch?.batch_name || ''} - ${dayjs().format('YYYY-MM-DD')}复核`,
            session_type: 'daily',
            include_wrong_answers: true,
            include_historical_answers: true,
            include_conflicts: true
          }}>
          <Form.Item name="session_name" label="复核会话名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="session_type" label="复核类型">
            <Select options={[
              { value: 'daily', label: '日常复核' },
              { value: 'classroom', label: '课前/课堂复核' },
              { value: 'monthly', label: '月底批量复核' }
            ]} />
          </Form.Item>
          <Form.Item label="包含内容（确保学生能看出是处理眼前这批具体材料）">
            <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <Form.Item name="include_wrong_answers" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Checkbox>学生错题</Checkbox>
              </Form.Item>
              <Form.Item name="include_historical_answers" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Checkbox>历史答案对比</Checkbox>
              </Form.Item>
              <Form.Item name="include_conflicts" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>约束冲突与数据问题</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

import { Checkbox } from 'antd'
