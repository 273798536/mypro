import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, Modal,
  Radio, Form, Input, Checkbox, message, Progress, Drawer, Descriptions
} from 'antd'
import {
  ArrowLeftOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PauseOutlined, WarningOutlined, EyeOutlined, PlayCircleOutlined, FileTextOutlined,
  EditOutlined, CheckSquareOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { reviewApi, recordApi, reportApi, calculateApi } from '../../services/api'
import type { ReviewSession, QuestionRecord, ReviewResult } from '../../types'
import { RECORD_STATUS_OPTIONS } from '../../types'
import { useAppStore } from '../../store/app'
import ReliabilityCurveChart from '../../components/ReliabilityCurveChart'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function ReviewSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [items, setItems] = useState<QuestionRecord[]>([])
  const [results, setResults] = useState<ReviewResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [detailDrawer, setDetailDrawer] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<QuestionRecord | null>(null)
  const [decisionModal, setDecisionModal] = useState(false)
  const [batchDecision, setBatchDecision] = useState(false)
  const [form] = Form.useForm()
  const [curveData, setCurveData] = useState<any>(null)
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    if (id) loadData()
  }, [id, refreshTrigger])

  const loadData = async () => {
    if (!id) return
    const sid = parseInt(id)
    const [sess, itms, res] = await Promise.all([
      reviewApi.getSession(sid),
      reviewApi.getSessionItems(sid),
      reviewApi.getSessionResults(sid)
    ])
    setSession(sess)
    setItems(itms)
    setResults(res)
  }

  const handleStart = async () => {
    if (!session) return
    await reviewApi.startSession(session.id)
    message.success('复核已开始')
    triggerRefresh()
  }

  const handleComplete = async () => {
    if (!session) return
    await reviewApi.completeSession(session.id)
    message.success('复核已完成')
    triggerRefresh()
  }

  const handleGenerateReport = async () => {
    if (!session) return
    try {
      const report = await reportApi.generate({
        session_id: session.id,
        batch_id: session.batch_id,
        report_type: 'student'
      })
      message.success('报告已生成')
      navigate(`/student/reports/${report.id}`)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '生成失败')
    }
  }

  const handleDecision = async (values: any) => {
    if (!session || !currentRecord) return
    try {
      await reviewApi.createResult({
        session_id: session.id,
        record_id: currentRecord.id,
        before_status: currentRecord.status,
        after_status: values.after_status,
        review_comment: values.review_comment,
        is_conflict_resolved: values.is_conflict_resolved,
        conflict_resolution: values.conflict_resolution
      })
      message.success('复核完成')
      setDecisionModal(false)
      form.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '失败')
    }
  }

  const handleBatchDecision = async () => {
    if (!session || selectedRowKeys.length === 0) {
      message.warning('请先选择记录')
      return
    }
    try {
      const decisions = selectedRowKeys.map(key => {
        const record = items.find(i => i.id === key)
        return {
          session_id: session.id,
          record_id: Number(key),
          before_status: record?.status || 'pending',
          after_status: 'passed',
          review_comment: '批量复核通过'
        }
      })
      await reviewApi.batchReview(session.id, decisions)
      message.success(`批量复核 ${selectedRowKeys.length} 条记录完成`)
      setSelectedRowKeys([])
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '失败')
    }
  }

  const handleCalculateCurve = async (records: QuestionRecord[]) => {
    const validIds = records.filter(r => r.lifetime_hours && r.lifetime_hours > 0).map(r => r.id)
    if (validIds.length < 2) {
      message.warning('至少需要2条有效寿命数据')
      return
    }
    try {
      const data = await calculateApi.reliabilityCurve(validIds, session?.id)
      setCurveData(data)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '计算失败')
    }
  }

  const openDecision = (record: QuestionRecord, batch: boolean = false) => {
    setCurrentRecord(record)
    setBatchDecision(batch)
    setDecisionModal(true)
    form.setFieldsValue({
      after_status: 'passed',
      is_conflict_resolved: false
    })
  }

  const columns = [
    {
      title: '题目编号',
      dataIndex: 'question_id',
      width: 100,
      fixed: 'left' as const,
      render: (v: string, r: QuestionRecord) => (
        <a onClick={() => { setCurrentRecord(r); setDetailDrawer(true) }}>{v || `#${r.id}`}</a>
      )
    },
    {
      title: '材料',
      dataIndex: 'material_name',
      width: 140
    },
    {
      title: '寿命/单位',
      width: 160,
      render: (_: any, r: QuestionRecord) => (
        <Space>
          <span style={{ color: r.has_unit_issue ? '#ff4d4f' : undefined }}>
            {r.lifetime_hours || '-'}
          </span>
          <Tag color={r.has_unit_issue ? 'red' : 'default'}>{r.unit || '缺单位'}</Tag>
        </Space>
      )
    },
    {
      title: '问题类型',
      width: 240,
      render: (_: any, r: QuestionRecord) => {
        const tags = []
        if (r.has_unit_issue) tags.push(<Tag key="u" color="red">单位缺失</Tag>)
        if (r.has_empty_value) tags.push(<Tag key="e" color="orange">空值</Tag>)
        if (r.has_mixed_remark) tags.push(<Tag key="m" color="purple">混写</Tag>)
        if (r.has_conflict) tags.push(<Tag key="c" color="magenta">冲突</Tag>)
        if (r.is_duplicate) tags.push(<Tag key="d" color="gold">重复</Tag>)
        if (r.student_answer && r.correct_answer && r.student_answer !== r.correct_answer) {
          tags.push(<Tag key="w" color="volcano">错题</Tag>)
        }
        return tags.length > 0 ? <Space size={4} wrap>{tags}</Space> : <Tag color="green">正常</Tag>
      }
    },
    {
      title: '学生答案',
      dataIndex: 'student_answer',
      width: 150,
      ellipsis: true,
      render: (v: string) => <span style={{ color: '#d46b08' }}>{v || '-'}</span>
    },
    {
      title: '正确答案',
      dataIndex: 'correct_answer',
      width: 150,
      ellipsis: true,
      render: (v: string) => <span style={{ color: '#389e0d' }}>{v || '-'}</span>
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
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, r: QuestionRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => { setCurrentRecord(r); setDetailDrawer(true) }}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/assistant/records/${r.id}`)}>
            修正
          </Button>
          <Button type="link" size="small" icon={<CheckSquareOutlined />}
            onClick={() => openDecision(r)}>
            复核
          </Button>
        </Space>
      )
    }
  ]

  if (!session) return <div className="page-container"><div className="empty-state">加载中...</div></div>

  const pct = session.total_items > 0 ? Math.round((session.reviewed_items / session.total_items) * 100) : 0

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ marginBottom: 8 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assistant/review')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>{session.session_name}</Title>
          <Tag color={
            session.status === 'completed' ? 'green' :
            session.status === 'in_progress' ? 'blue' : 'default'
          }>
            {session.status === 'completed' ? '已完成' :
             session.status === 'in_progress' ? '进行中' : '未开始'}
          </Tag>
        </Space>
        <div className="page-description">
          {session.session_type === 'daily' ? '日常复核' :
           session.session_type === 'classroom' ? '课前/课堂复核' : '月底批量复核'}
          · 创建于 {dayjs(session.created_at).format('YYYY-MM-DD HH:mm')}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="复核项总数" value={session.total_items} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已复核" value={session.reviewed_items} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已通过" value={session.passed_items} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="待处理" value={session.pending_items} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
      </Row>

      <Card className="card-shadow" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Progress percent={pct} style={{ flex: 1, marginRight: 24 }} />
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button icon={<CalculatorOutlined />} onClick={() => handleCalculateCurve(items)}>
              计算寿命曲线
            </Button>
            {session.status === 'pending' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>开始复核</Button>
            )}
            {session.status === 'in_progress' && selectedRowKeys.length > 0 && (
              <Button icon={<CheckSquareOutlined />} onClick={handleBatchDecision}>
                批量通过 ({selectedRowKeys.length})
              </Button>
            )}
            {session.status === 'in_progress' && (
              <Button type="primary" icon={<PauseOutlined />} onClick={handleComplete}>完成复核</Button>
            )}
            {session.status === 'completed' && (
              <Button type="primary" icon={<FileTextOutlined />} onClick={handleGenerateReport}>生成学生报告</Button>
            )}
          </Space>
        </div>
      </Card>

      {curveData && (
        <Card className="card-shadow" style={{ marginBottom: 16 }}
          title={<Space><Title level={5} style={{ margin: 0 }}>可靠性寿命曲线</Title>
            <Button type="link" size="small" onClick={() => setCurveData(null)}>收起</Button></Space>}>
          <ReliabilityCurveChart data={curveData} />
        </Card>
      )}

      <Card className="card-shadow">
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>
            复核项列表
            <Text type="secondary" style={{ fontSize: 13, marginLeft: 12 }}>
              包含：
              {session.include_wrong_answers && ' 学生错题'}
              {session.include_historical_answers && ' · 历史答案'}
              {session.include_conflicts && ' · 约束冲突/数据问题'}
            </Text>
          </Title>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Drawer
        title={`记录详情 - ${currentRecord?.question_id || ''}`}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
        width={640}
        extra={
          <Space>
            <Button onClick={() => setDetailDrawer(false)}>关闭</Button>
            <Button type="primary" onClick={() => {
              if (currentRecord) openDecision(currentRecord)
            }}>复核判定</Button>
          </Space>
        }
      >
        {currentRecord && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="题目编号">{currentRecord.question_id}</Descriptions.Item>
              <Descriptions.Item label="材料">{currentRecord.material_name} ({currentRecord.material_type})</Descriptions.Item>
              <Descriptions.Item label="应力/温度">
                {currentRecord.stress_level} MPa / {currentRecord.temperature} ℃
              </Descriptions.Item>
              <Descriptions.Item label="寿命">
                {currentRecord.lifetime_hours}
                <Tag color={currentRecord.has_unit_issue ? 'red' : 'blue'} style={{ marginLeft: 8 }}>
                  {currentRecord.unit || '单位缺失'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="约束条件">{currentRecord.constraint_condition || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{currentRecord.remark || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {RECORD_STATUS_OPTIONS.find(o => o.value === currentRecord.status)?.label || currentRecord.status}
              </Descriptions.Item>
            </Descriptions>
            <Card type="inner" title="题目内容" style={{ marginTop: 16 }} size="small">
              {currentRecord.question_content || '-'}
            </Card>
            <Row gutter={8} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Card type="inner" title="学生答案" size="small">
                  <span style={{ color: '#d46b08' }}>{currentRecord.student_answer || '-'}</span>
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="正确答案" size="small">
                  <span style={{ color: '#389e0d' }}>{currentRecord.correct_answer || '-'}</span>
                </Card>
              </Col>
            </Row>
            {currentRecord.has_conflict && currentRecord.conflict_detail && (
              <Alert
                message="数据冲突"
                description={currentRecord.conflict_detail}
                type="error"
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </>
        )}
      </Drawer>

      <Modal
        title={batchDecision ? '批量复核判定' : '复核判定'}
        open={decisionModal}
        onCancel={() => { setDecisionModal(false); form.resetFields() }}
        onOk={() => form.submit()}
      >
        {currentRecord && (
          <div style={{ marginBottom: 16 }}>
            <p>题目: <Text strong>{currentRecord.question_id}</Text></p>
            <p>当前状态: <Tag>{currentRecord.status}</Tag></p>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleDecision}>
          <Form.Item name="after_status" label="判定结果" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="passed"><CheckCircleOutlined /> 通过</Radio.Button>
              <Radio.Button value="rejected"><CloseCircleOutlined /> 需修正</Radio.Button>
              <Radio.Button value="pending"><PauseOutlined /> 待定</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="review_comment" label="复核意见">
            <Input.TextArea rows={2} placeholder="输入复核说明" />
          </Form.Item>
          {currentRecord?.has_conflict && (
            <Form.Item name="is_conflict_resolved" valuePropName="checked">
              <Checkbox>标记冲突已解决</Checkbox>
            </Form.Item>
          )}
          <Form.Item noStyle shouldUpdate={(p, n) => p.is_conflict_resolved !== n.is_conflict_resolved}>
            {({ getFieldValue }) =>
              getFieldValue('is_conflict_resolved') ? (
                <Form.Item name="conflict_resolution" label="冲突解决方案">
                  <Input.TextArea rows={2} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

import { CalculatorOutlined, Alert } from 'antd'
