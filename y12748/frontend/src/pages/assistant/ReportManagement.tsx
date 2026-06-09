import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Tag, Typography, Modal, Form, Select, message,
  Row, Col, Descriptions, List, Statistic, Progress
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { reportApi, reviewApi, batchApi } from '../services/api'
import type { Report, ReviewSession, ImportBatch } from '../../types'
import { useAppStore } from '../../store/app'
import ReliabilityCurveChart from '../../components/ReliabilityCurveChart'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function ReportManagement() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<Report[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [viewReport, setViewReport] = useState<Report | null>(null)
  const [form] = Form.useForm()
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      reportApi.list({ limit: 100 }),
      reviewApi.listSessions({ limit: 100 }),
      batchApi.list(0, 100)
    ]).then(([r, s, b]) => {
      setReports(r)
      setSessions(s)
      setBatches(b)
    }).finally(() => setLoading(false))
  }

  const handleCreate = async (values: any) => {
    try {
      await reportApi.generate(values)
      message.success('报告生成成功')
      setCreateModal(false)
      form.resetFields()
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '生成失败')
    }
  }

  const handleDownload = async (id: number) => {
    try {
      const blob = await reportApi.download(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reliability_report_${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      message.error('下载失败')
    }
  }

  const columns = [
    {
      title: '报告ID',
      dataIndex: 'id',
      width: 80
    },
    {
      title: '报告类型',
      dataIndex: 'report_type',
      width: 100,
      render: (v: string) => (
        <Tag color={v === 'student' ? 'blue' : 'purple'}>
          {v === 'student' ? '学生报告' : '内部报告'}
        </Tag>
      )
    },
    {
      title: '批次',
      dataIndex: 'batch_id',
      width: 200,
      render: (id: number) => {
        const b = batches.find(x => x.id === id)
        return b ? b.batch_name : `#${id}`
      }
    },
    {
      title: '复核会话',
      dataIndex: 'session_id',
      width: 200,
      render: (id: number) => {
        const s = sessions.find(x => x.id === id)
        return s ? s.session_name : `#${id}`
      }
    },
    {
      title: '生成时间',
      dataIndex: 'generated_at',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color="green">{v === 'generated' ? '已生成' : v}</Tag>
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, r: Report) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => setViewReport(r)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<FileTextOutlined />}
            onClick={() => navigate(`/student/reports/${r.id}`)}>
            学生视图
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />}
            onClick={() => handleDownload(r.id)}>
            下载
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">报告管理</div>
        <div className="page-description">
          生成、查看和导出学生报告。学生报告包含可靠性寿命曲线、错题分析、冲突处理说明
        </div>
      </div>

      <Card className="card-shadow">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>报告列表</Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              生成报告
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={reports}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="生成新报告"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields() }}
        onOk={() => form.submit()}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="batch_id" label="选择数据批次" rules={[{ required: true }]}>
            <Select
              options={batches.map(b => ({ value: b.id, label: `${b.batch_name} (${b.total_records}条)` }))}
              onChange={(val) => {
                const relatedSessions = sessions.filter(s => s.batch_id === val)
                if (relatedSessions.length > 0) {
                  form.setFieldsValue({ session_id: relatedSessions[0].id })
                }
              }}
            />
          </Form.Item>
          <Form.Item name="session_id" label="关联复核会话（可选）">
            <Select
              options={sessions.map(s => ({
                value: s.id,
                label: `${s.session_name} (${s.reviewed_items}/${s.total_items}已复核)`
              }))}
              allowClear
            />
          </Form.Item>
          <Form.Item name="report_type" label="报告类型" initialValue="student">
            <Select options={[
              { value: 'student', label: '学生报告（含曲线+错题+冲突说明）' },
              { value: 'internal', label: '内部报告（含完整留痕）' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`报告详情 #${viewReport?.id}`}
        open={!!viewReport}
        onCancel={() => setViewReport(null)}
        footer={
          <Space>
            <Button onClick={() => setViewReport(null)}>关闭</Button>
            <Button onClick={() => viewReport && navigate(`/student/reports/${viewReport.id}`)}>
              查看学生视图
            </Button>
            <Button type="primary" onClick={() => viewReport && handleDownload(viewReport.id)}>
              下载报告
            </Button>
          </Space>
        }
        width={900}
      >
        {viewReport && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="批次">
                {batches.find(b => b.id === viewReport.batch_id)?.batch_name || `#${viewReport.batch_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="复核会话">
                {sessions.find(s => s.id === viewReport.session_id)?.session_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {dayjs(viewReport.generated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="生成者">{viewReport.generated_by}</Descriptions.Item>
            </Descriptions>

            {viewReport.summary && (
              <Card type="inner" title="数据汇总" size="small" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 8]}>
                  <Col span={6}><Statistic title="总记录" value={viewReport.summary.total_records} /></Col>
                  <Col span={6}><Statistic title="已通过" value={viewReport.summary.by_status?.passed || 0} valueStyle={{ color: '#52c41a' }} /></Col>
                  <Col span={6}><Statistic title="待处理" value={viewReport.summary.by_status?.pending || 0} valueStyle={{ color: '#faad14' }} /></Col>
                  <Col span={6}><Statistic title="需修正" value={viewReport.summary.by_status?.rejected || 0} valueStyle={{ color: '#ff4d4f' }} /></Col>
                </Row>
                <Divider />
                <Title level={5}>数据质量问题</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}><Text>单位缺失: {viewReport.summary.data_quality?.unit_issues || 0}</Text></Col>
                  <Col span={8}><Text>空值: {viewReport.summary.data_quality?.empty_values || 0}</Text></Col>
                  <Col span={8}><Text>混写备注: {viewReport.summary.data_quality?.mixed_remarks || 0}</Text></Col>
                  <Col span={8}><Text>数据冲突: {viewReport.summary.data_quality?.conflicts || 0}</Text></Col>
                  <Col span={8}><Text>重复记录: {viewReport.summary.data_quality?.duplicates || 0}</Text></Col>
                  <Col span={8}><Text>材料种类: {viewReport.summary.materials_count || 0}</Text></Col>
                </Row>
              </Card>
            )}

            {viewReport.curve_data && (
              <Card type="inner" title="可靠性寿命曲线" size="small">
                <ReliabilityCurveChart data={viewReport.curve_data} height={280} />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

import { Divider } from 'antd'
