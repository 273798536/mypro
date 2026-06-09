import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, Typography, Modal, Form, Input, Select, Checkbox, message, Progress
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, PlayCircleOutlined, CheckCircleOutlined,
  EyeOutlined, AuditOutlined, FileTextOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { reviewApi, batchApi, reportApi } from '../../services/api'
import type { ReviewSession, ImportBatch } from '../../types'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function ReviewManagement() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [form] = Form.useForm()
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      reviewApi.listSessions({ limit: 100 }),
      batchApi.list(0, 100)
    ]).then(([s, b]) => {
      setSessions(s)
      setBatches(b)
    }).finally(() => setLoading(false))
  }

  const handleCreate = async (values: any) => {
    try {
      const session = await reviewApi.createSession(values)
      message.success('复核会话创建成功')
      setCreateModal(false)
      form.resetFields()
      navigate(`/assistant/review/${session.id}`)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '创建失败')
    }
  }

  const handleStart = async (id: number) => {
    try {
      await reviewApi.startSession(id)
      message.success('已开始复核')
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '操作失败')
    }
  }

  const handleComplete = async (id: number) => {
    try {
      await reviewApi.completeSession(id)
      message.success('复核已完成')
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '操作失败')
    }
  }

  const handleGenerateReport = async (session: ReviewSession) => {
    try {
      const report = await reportApi.generate({
        session_id: session.id,
        batch_id: session.batch_id,
        report_type: 'student'
      })
      message.success('报告生成成功')
      navigate(`/student/reports/${report.id}`)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '生成失败')
    }
  }

  const columns = [
    {
      title: '复核会话',
      dataIndex: 'session_name',
      render: (v: string, r: ReviewSession) => (
        <a onClick={() => navigate(`/assistant/review/${r.id}`)}>{v}</a>
      )
    },
    {
      title: '关联批次',
      dataIndex: 'batch_id',
      width: 200,
      render: (id: number) => {
        const b = batches.find(x => x.id === id)
        return b ? b.batch_name : `#${id}`
      }
    },
    {
      title: '类型',
      dataIndex: 'session_type',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { label: string; color: string }> = {
          daily: { label: '日常', color: 'blue' },
          classroom: { label: '课堂', color: 'purple' },
          monthly: { label: '月底批量', color: 'gold' }
        }
        const cfg = map[v] || { label: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      }
    },
    {
      title: '进度',
      dataIndex: 'reviewed_items',
      width: 200,
      render: (_: any, r: ReviewSession) => {
        const pct = r.total_items > 0 ? Math.round((r.reviewed_items / r.total_items) * 100) : 0
        return (
          <div style={{ minWidth: 150 }}>
            <Progress size="small" percent={pct} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.reviewed_items}/{r.total_items} · 通过 {r.passed_items}
            </Text>
          </div>
        )
      }
    },
    {
      title: '内容',
      width: 200,
      render: (_: any, r: ReviewSession) => (
        <Space size={4} wrap>
          {r.include_wrong_answers && <Tag color="orange">错题</Tag>}
          {r.include_historical_answers && <Tag color="purple">历史答案</Tag>}
          {r.include_conflicts && <Tag color="magenta">冲突</Tag>}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { label: string; color: string }> = {
          pending: { label: '未开始', color: 'default' },
          in_progress: { label: '进行中', color: 'processing' },
          completed: { label: '已完成', color: 'success' }
        }
        const cfg = map[v] || { label: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right' as const,
      render: (_: any, r: ReviewSession) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/assistant/review/${r.id}`)}>
            进入
          </Button>
          {r.status === 'pending' && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />}
              onClick={() => handleStart(r.id)}>
              开始
            </Button>
          )}
          {r.status === 'in_progress' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />}
              onClick={() => handleComplete(r.id)}>
              完成
            </Button>
          )}
          {r.status === 'completed' && (
            <Button type="link" size="small" icon={<FileTextOutlined />}
              onClick={() => handleGenerateReport(r)}>
              生成报告
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">复核管理</div>
        <div className="page-description">
          创建复核会话 - 支持日常复核、课前/课堂复核、月底批量复核。同一轮复核包含学生错题、历史答案、约束冲突
        </div>
      </div>

      <Card className="card-shadow">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>复核会话列表</Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              新建复核
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={sessions}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title="新建复核会话"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields() }}
        onOk={() => form.submit()}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}
          initialValues={{
            session_type: 'daily',
            include_wrong_answers: true,
            include_historical_answers: true,
            include_conflicts: true
          }}>
          <Form.Item name="session_name" label="复核会话名称" rules={[{ required: true }]}>
            <Input placeholder="如：2024年可靠性作业 课堂复核" />
          </Form.Item>
          <Form.Item name="batch_id" label="选择批次" rules={[{ required: true }]}>
            <Select
              options={batches.map(b => ({ value: b.id, label: `${b.batch_name} (${b.total_records}条)` }))}
              placeholder="选择要复核的数据批次"
            />
          </Form.Item>
          <Form.Item name="session_type" label="复核类型">
            <Select options={[
              { value: 'daily', label: '日常复核 - 公式计算后立即复核' },
              { value: 'classroom', label: '课前/课堂复核 - 学生讲解用' },
              { value: 'monthly', label: '月底批量复核 - 集中处理' }
            ]} />
          </Form.Item>
          <Form.Item label="复核内容（学生能看出处理的是眼前这批具体材料）">
            <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <Form.Item name="include_wrong_answers" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Checkbox>学生错题（突出显示常见错误）</Checkbox>
              </Form.Item>
              <Form.Item name="include_historical_answers" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Checkbox>历史答案（与之前版本对比）</Checkbox>
              </Form.Item>
              <Form.Item name="include_conflicts" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>约束冲突与数据问题（单位缺失、空值等）</Checkbox>
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
