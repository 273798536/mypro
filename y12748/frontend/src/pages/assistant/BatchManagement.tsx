import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, Upload, message, Tag, Typography, Popconfirm, Tooltip
} from 'antd'
import {
  PlusOutlined, UploadOutlined, ReloadOutlined, EyeOutlined, DeleteOutlined,
  DatabaseOutlined, WarningOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { batchApi } from '../../services/api'
import type { ImportBatch } from '../../types'
import { useAppStore } from '../../store/app'
import dayjs from 'dayjs'

const { Title } = Typography

export default function BatchManagement() {
  const navigate = useNavigate()
  const [data, setData] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [createModal, setCreateModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null)
  const [form] = Form.useForm()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const { triggerRefresh, refreshTrigger } = useAppStore()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = () => {
    setLoading(true)
    batchApi.list().then(res => {
      setData(res)
    }).finally(() => setLoading(false))
  }

  const handleCreate = async (values: any) => {
    try {
      const res = await batchApi.create(values)
      message.success('批次创建成功')
      setCreateModal(false)
      form.resetFields()
      triggerRefresh()
      setSelectedBatch(res)
      setUploadModal(true)
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '创建失败')
    }
  }

  const handleUpload = async () => {
    if (!selectedBatch || !uploadFile) {
      message.warning('请选择文件')
      return
    }
    try {
      setLoading(true)
      const result = await batchApi.importFile(selectedBatch.id, uploadFile)
      message.success(`导入完成: 共${result.total}条，有效${result.valid}条，问题${result.invalid}条`)
      if (result.issues.length > 0) {
        Modal.info({
          title: '数据质量检测结果',
          content: (
            <div>
              <p>检测到 {result.issues.length} 个数据质量问题，已自动标记。</p>
              <p style={{ color: '#faad14' }}>
                包含: 空值、单位缺失、数值备注混写、重复记录、数据冲突等类型
              </p>
            </div>
          )
        })
      }
      setUploadModal(false)
      setUploadFile(null)
      triggerRefresh()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '导入失败')
    } finally {
      setLoading(false)
    }
  }

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setUploadFile(file)
      return false
    },
    maxCount: 1,
    accept: '.xlsx,.xls,.csv'
  }

  const columns = [
    {
      title: '批次名称',
      dataIndex: 'batch_name',
      render: (v: string, r: ImportBatch) => (
        <a onClick={() => navigate(`/assistant/batches/${r.id}`)}>{v}</a>
      )
    },
    {
      title: '源文件',
      dataIndex: 'file_name',
      render: (v: string) => v || '-'
    },
    {
      title: '记录数',
      dataIndex: 'total_records',
      width: 100,
      render: (v: number) => <Tag icon={<DatabaseOutlined />}>{v}</Tag>
    },
    {
      title: '有效/问题',
      width: 150,
      render: (_: any, r: ImportBatch) => (
        <Space>
          <Tag color="green" icon={<CheckCircleOutlined />}>{r.valid_records}</Tag>
          <Tag color="orange" icon={<WarningOutlined />}>{r.invalid_records}</Tag>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { color: string; label: string }> = {
          pending: { color: 'default', label: '待导入' },
          imported: { color: 'blue', label: '已导入' },
          reviewing: { color: 'processing', label: '复核中' },
          completed: { color: 'success', label: '已完成' }
        }
        const cfg = map[v] || { color: 'default', label: v }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      }
    },
    {
      title: '导入时间',
      dataIndex: 'imported_at',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: ImportBatch) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/assistant/batches/${r.id}`)}
            >
              详情
            </Button>
          </Tooltip>
          {r.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<UploadOutlined />}
              onClick={() => { setSelectedBatch(r); setUploadModal(true) }}
            >
              导入
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">数据导入管理</div>
        <div className="page-description">
          创建导入批次、上传Excel/CSV文件，系统自动检测空值、重复、单位缺失、混写备注和数据冲突
        </div>
      </div>

      <Card className="card-shadow">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>导入批次列表</Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              新建批次
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新建导入批次"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="batch_name"
            label="批次名称"
            rules={[{ required: true, message: '请输入批次名称' }]}
          >
            <Input placeholder="如：2024年春季学期可靠性作业数据" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="可选，描述批次用途或来源" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建并导入文件
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`导入数据文件 - ${selectedBatch?.batch_name}`}
        open={uploadModal}
        onCancel={() => { setUploadModal(false); setUploadFile(null) }}
        onOk={handleUpload}
        confirmLoading={loading}
        okText="开始导入"
      >
        <div>
          <p style={{ marginBottom: 12, color: '#8c8c8c' }}>
            支持 .xlsx, .xls, .csv 格式。系统将自动检测：
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li>空值字段（必填项缺失、数值项为空）</li>
            <li>单位缺失或单位与数值混写</li>
            <li>重复题目编号</li>
            <li>同一题目多值冲突</li>
            <li>数值与备注信息混写</li>
          </ul>
          <Upload {...uploadProps} maxCount={1}>
            <Button icon={<UploadOutlined />}>
              {uploadFile ? uploadFile.name : '选择文件'}
            </Button>
          </Upload>
        </div>
      </Modal>
    </div>
  )
}
