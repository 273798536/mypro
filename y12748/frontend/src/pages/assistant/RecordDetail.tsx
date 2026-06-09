import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Descriptions, Tag, Button, Space, Typography, Tabs, Table, Timeline, Empty, message, Modal, Form, Input
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, DiffOutlined, AuditOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { recordApi } from '../../services/api'
import type { QuestionRecord, CorrectionHistory, ReviewResult } from '../../types'
import { RECORD_STATUS_OPTIONS, ISSUE_TYPE_MAP } from '../../types'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QuestionRecord | null>(null)
  const [corrections, setCorrections] = useState<CorrectionHistory[]>([])
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([])
  const [editModal, setEditModal] = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [form] = Form.useForm()
  const [statusForm] = Form.useForm()
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    if (id) loadData()
  }, [id, refreshTrigger])

  const loadData = async () => {
    if (!id) return
    const rid = parseInt(id)
    const [rec, cor, rev] = await Promise.all([
      recordApi.get(rid),
      recordApi.getCorrections(rid),
      recordApi.getReviewResults(rid)
    ])
    setRecord(rec)
    setCorrections(cor)
    setReviewResults(rev)
  }

  const handleEdit = async (values: any) => {
    if (!record) return
    try {
      const fieldName = values.field_name
      const newVal = ['stress_level', 'temperature', 'lifetime_hours'].includes(fieldName)
        ? Number(values.new_value)
        : values.new_value
      await recordApi.updateField(record.id, {
        field_name: fieldName,
        new_value: newVal,
        comment: values.comment
      })
      message.success('修正成功，已留痕')
      setEditModal(false)
      form.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '修正失败')
    }
  }

  const handleStatus = async (values: any) => {
    if (!record) return
    try {
      await recordApi.transitionStatus(record.id, {
        record_id: record.id,
        from_status: record.status,
        to_status: values.to_status,
        comment: values.comment
      })
      message.success('状态更新成功')
      setStatusModal(false)
      statusForm.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '失败')
    }
  }

  const renderIssueTags = (r: QuestionRecord) => {
    const tags = []
    if (r.has_unit_issue) tags.push(<Tag key="u" color="red">单位缺失</Tag>)
    if (r.has_empty_value) tags.push(<Tag key="e" color="orange">空值</Tag>)
    if (r.has_mixed_remark) tags.push(<Tag key="m" color="purple">混写备注</Tag>)
    if (r.has_conflict) tags.push(<Tag key="c" color="magenta">数据冲突</Tag>)
    if (r.is_duplicate) tags.push(<Tag key="d" color="gold">重复记录</Tag>)
    return tags.length > 0 ? tags : <Tag color="green">正常</Tag>
  }

  if (!record) return <div className="page-container"><div className="empty-state">加载中...</div></div>

  const statusOpt = RECORD_STATUS_OPTIONS.find(o => o.value === record.status)

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ marginBottom: 8 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>
            记录详情 - {record.question_id || `#${record.id}`}
          </Title>
          {statusOpt && <Tag color={statusOpt.color}>{statusOpt.label}</Tag>}
        </Space>
        <div className="page-description">
          创建于 {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
          · 最后更新 {dayjs(record.updated_at).format('YYYY-MM-DD HH:mm')}
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            className="card-shadow"
            title="基本信息"
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
                <Button icon={<AuditOutlined />} onClick={() => setStatusModal(true)}>状态转换</Button>
                <Button type="primary" icon={<EditOutlined />} onClick={() => setEditModal(true)}>人工修正</Button>
              </Space>
            }
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="题目编号">{record.question_id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="材料名称">{record.material_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="材料类型">{record.material_type || '-'}</Descriptions.Item>
                  <Descriptions.Item label="应力水平">
                    {record.stress_level != null ? `${record.stress_level} MPa` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="温度">
                    {record.temperature != null ? `${record.temperature} ℃` : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} md={12}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="寿命值">
                    <Space>
                      <span style={{ color: record.has_unit_issue ? '#ff4d4f' : undefined }}>
                        {record.lifetime_hours || '-'}
                      </span>
                      <Tag color={record.has_unit_issue ? 'red' : 'blue'}>
                        {record.unit || '单位缺失'}
                      </Tag>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="数据质量">{renderIssueTags(record)}</Descriptions.Item>
                  <Descriptions.Item label="约束条件">{record.constraint_condition || '-'}</Descriptions.Item>
                  <Descriptions.Item label="数据来源">{record.source || '-'}</Descriptions.Item>
                  <Descriptions.Item label="备注">{record.remark || '-'}</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Card type="inner" title="题目内容" style={{ marginTop: 16 }} size="small">
              <Text>{record.question_content || '无'}</Text>
            </Card>

            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Card type="inner" title="学生答案" size="small">
                  <Text style={{ color: '#d46b08' }}>{record.student_answer || '-'}</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type="inner" title="正确答案" size="small">
                  <Text style={{ color: '#389e0d' }}>{record.correct_answer || '-'}</Text>
                </Card>
              </Col>
            </Row>

            {record.has_conflict && record.conflict_detail && (
              <Card
                type="inner"
                title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} />冲突详情</Space>}
                style={{ marginTop: 16, border: '1px solid #ffa39e', background: '#fff1f0' }}
                size="small"
              >
                <Text type="danger">{record.conflict_detail}</Text>
              </Card>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card className="card-shadow" title={<Space><DiffOutlined />修正历史（留痕）</Space>}>
            {corrections.length === 0 ? (
              <Empty description="暂无修正记录" />
            ) : (
              <Timeline
                items={corrections.map(c => ({
                  color: 'blue',
                  children: (
                    <div>
                      <Space>
                        <Tag color="blue">{c.field_name}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(c.corrected_at).format('MM-DD HH:mm')} · {c.corrected_by}
                        </Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Text delete type="danger">{c.old_value || '(空)'}</Text>
                        <span style={{ margin: '0 8px' }}>→</span>
                        <Text strong style={{ color: '#52c41a' }}>{c.new_value || '(空)'}</Text>
                      </div>
                      {c.comment && <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>说明: {c.comment}</div>}
                    </div>
                  )
                }))}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="card-shadow" title={<Space><AuditOutlined />复核记录</Space>}>
            {reviewResults.length === 0 ? (
              <Empty description="暂无复核记录" />
            ) : (
              <Timeline
                items={reviewResults.map(r => {
                  const before = RECORD_STATUS_OPTIONS.find(o => o.value === r.before_status)
                  const after = RECORD_STATUS_OPTIONS.find(o => o.value === r.after_status)
                  return {
                    color: r.after_status === 'passed' ? 'green' : r.after_status === 'rejected' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Space>
                          {before && <Tag color={before.color}>{before.label}</Tag>}
                          <span>→</span>
                          {after && <Tag color={after.color}>{after.label}</Tag>}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(r.reviewed_at).format('MM-DD HH:mm')} · {r.reviewer}
                          </Text>
                        </Space>
                        {r.review_comment && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">复核意见: </Text>
                            <Text>{r.review_comment}</Text>
                          </div>
                        )}
                        {r.is_conflict_resolved && (
                          <Tag color="green" style={{ marginTop: 4 }}>冲突已解决</Tag>
                        )}
                      </div>
                    )
                  }
                })}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="人工修正（留痕）"
        open={editModal}
        onCancel={() => { setEditModal(false); form.resetFields() }}
        onOk={() => form.submit()}
      >
        <div style={{ marginBottom: 12, background: '#e6f4ff', padding: 12, borderRadius: 4 }}>
          <Text type="primary"><DiffOutlined /> 所有修改将自动记录，前后变化可追溯</Text>
        </div>
        <Form form={form} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="field_name" label="字段" rules={[{ required: true }]}>
            <Select options={[
              { value: 'question_id', label: '题目编号' },
              { value: 'material_name', label: '材料名称' },
              { value: 'stress_level', label: '应力水平' },
              { value: 'temperature', label: '温度' },
              { value: 'lifetime_hours', label: '寿命' },
              { value: 'unit', label: '单位' },
              { value: 'student_answer', label: '学生答案' },
              { value: 'correct_answer', label: '正确答案' },
              { value: 'constraint_condition', label: '约束条件' },
              { value: 'remark', label: '备注' }
            ]} />
          </Form.Item>
          <Form.Item name="new_value" label="新值" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="comment" label="修正说明">
            <Input.TextArea rows={2} placeholder="说明修正原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="状态转换"
        open={statusModal}
        onCancel={() => { setStatusModal(false); statusForm.resetFields() }}
        onOk={() => statusForm.submit()}
      >
        {record && (
          <p>当前状态: <Tag>{record.status}</Tag></p>
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
    </div>
  )
}

import { Select, Checkbox } from 'antd'
